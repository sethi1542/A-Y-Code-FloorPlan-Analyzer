from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.utils import timezone
from django.http import FileResponse
from django.core.files.base import ContentFile
from collections import Counter
from datetime import timedelta
from PIL import Image
from django.conf import settings
import os
import base64
import tempfile
import os
import io
import fitz
import stripe
import base64
import re
from .models import Subscription, UserUpload
from .gpt_vision import analyze_image_with_references, is_valid_window_tag
from .excel_report import create_excel_report
# Add this at the top of views.py
from rest_framework.authtoken.models import Token
import logging  # Add this at the top with your other imports

import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import UserDevice, VerificationCode
from rest_framework.authtoken.models import Token
from django.core.mail import send_mail
from django.conf import settings
import random
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user
    return Response({
        'username': user.username,
        'email': user.email,
        'date_joined': user.date_joined,
        'is_active': user.is_active
    })
logger = logging.getLogger(__name__)

class LoginView(APIView):
    def generate_device_id(self, request):
        """Generate a unique device ID from request headers"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = request.META.get('REMOTE_ADDR', '')
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_agent}{ip_address}"))

    def post(self, request):
        logger.info("Login request received")
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            logger.warning("Missing email or password in request")
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Authenticate the user
            user = authenticate(request, email=email, password=password)
            
            if not user:
                logger.warning(f"Authentication failed for email: {email}")
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Generate device ID
            device_id = self.generate_device_id(request)
            
            # For admin users, skip verification
            if user.is_staff:
                device, created = UserDevice.objects.get_or_create(
                    user=user,
                    device_id=device_id,
                    defaults={
                        'is_verified': True,
                        'last_login': timezone.now()
                    }
                )
                device.is_verified = True
                device.last_login = timezone.now()
                device.save()

                token, _ = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'user_id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'is_staff': user.is_staff,
                    'requiresVerification': False
                })

            # For regular users
            device, created = UserDevice.objects.get_or_create(
                user=user,
                device_id=device_id,
                defaults={'last_login': timezone.now()}
            )

            if created or not device.is_verified:
                code = str(random.randint(100000, 999999))
                VerificationCode.objects.create(
                    user=user,
                    code=code,
                    device_id=device_id
                )

                try:
                    send_mail(
                        'New Device Login - Verification Code',
                        f'Your verification code is: {code}',
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    logger.error(f"Failed to send verification email: {str(e)}")
                    return Response(
                        {'error': 'Failed to send verification code'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                return Response({
                    'message': 'Verification code sent to email',
                    'requiresVerification': True,
                    'device_id': device_id,
                    'user_id': user.id,
                    'email': user.email
                })

            device.last_login = timezone.now()
            device.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.id,
                'email': user.email,
                'username': user.username,
                'is_staff': user.is_staff,
                'requiresVerification': False
            })

        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Internal server error during login'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
Image.MAX_IMAGE_PIXELS = None

CREDITS_PER_MODE = {
    "fast": 1, 
    "accurate": 2,
    "windows_only": 3
}
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
import uuid
from .models import PasswordResetToken

class ForgotPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'No user with this email exists'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Delete any existing tokens for this user
        PasswordResetToken.objects.filter(user=user).delete()

        # Create new token
        token = PasswordResetToken.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=1)  # Token valid for 1 hour
        )

        reset_link = f"{settings.FRONTEND_URL}/reset-password/{token.token}/"
        
        try:
            send_mail(
                'Password Reset Request',
                f'Click this link to reset your password: {reset_link}\n\n'
                f'This link will expire in 1 hour.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({'message': 'Password reset link sent to your email'})
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return Response(
                {'error': 'Failed to send password reset email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetToken  # adjust import as needed


class ResetPasswordView(APIView):
    def get(self, request, token):
        """
        Validate if the password reset token is still valid.
        """
        try:
            reset_token = PasswordResetToken.objects.get(token=token)

            if not reset_token.is_valid():
                return Response({'error': 'Token has expired'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'message': 'Token is valid'})
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, token):
        """
        Reset the user's password using the token.
        """
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not new_password or not confirm_password:
            return Response(
                {'error': 'Both password fields are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {'error': 'Passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not reset_token.is_valid():
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.is_used = True
        reset_token.save()

        return Response({'message': 'Password reset successfully'})

    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.http import FileResponse
from django.utils import timezone
from django.core.files.base import ContentFile


Image.MAX_IMAGE_PIXELS = None
CREDITS_PER_MODE = {"fast": 1, "accurate": 2, "windows_only": 2}

#class UploadPDFView(APIView):
    #parser_classes = [MultiPartParser]
    #authentication_classes = [TokenAuthentication]
    #permission_classes = [IsAuthenticated]

    #def load_reference_images(self):
        #base = os.path.join(settings.BASE_DIR, "reference_images")
        #references = {}
        #for file_name in os.listdir(base):
            #ext = file_name.lower().split(".")[-1]
            #if ext in ["png", "jpg", "jpeg"]:
               #name = os.path.splitext(file_name)[0]
                #with open(os.path.join(base, file_name), "rb") as f:
                    #references[name] = base64.b64encode(f.read()).decode("utf-8")
        #return references
class UploadPDFView(APIView):
    parser_classes = [MultiPartParser]
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def load_reference_images(self, drawing_type):
        """
        Load reference images based on drawing_type (floorplan or elevation).
        Returns a dict of base64 images.
        """
        base = os.path.join(settings.BASE_DIR, "reference_images")

        if drawing_type.lower() == "elevation":
            ref_path = os.path.join(base, "elevation")
        else:
            ref_path = os.path.join(base, "floorplan")

        references = {}

        if os.path.exists(ref_path):
            for file_name in os.listdir(ref_path):
                ext = file_name.lower().split(".")[-1]
                if ext in ["png", "jpg", "jpeg"]:
                    name = os.path.splitext(file_name)[0]
                    with open(os.path.join(ref_path, file_name), "rb") as f:
                        references[name] = base64.b64encode(f.read()).decode("utf-8")

        return references

    def post(self, request):
        user = request.user
        pdf_file = request.FILES.get("file")
        drawing_type = request.POST.get("type", "elevation")  # default to elevation
        mode = request.POST.get("mode", "accurate").lower()

        if not pdf_file:
            return Response({"error": "No file provided"}, status=400)

        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription"}, status=403)

        if subscription.expiry_date.date() < timezone.now().date():
            return Response({"error": "Subscription expired"}, status=403)

        cost = CREDITS_PER_MODE.get(mode, 2)
        if subscription.plan == "free" and mode in ["accurate", "windows_only"]:
            return Response({"error": "Upgrade needed"}, status=403)
        if subscription.remaining_credits < cost:
            return Response({"error": "Not enough credits"}, status=403)

        tiles_per_side = 1 if mode in ["accurate", "windows_only"] else 6
        #if drawing_type.lower() == "floorplan":
            #tiles_per_side = 6   # 1x1 for elevations
        #else:
            #tiles_per_side = 1 if mode in ["accurate", "windows_only"] else 6  # 6x6 for floorplans

        # ✅ Define corrections for both
        corrections = {"remove": ["042100.A1", "085313.A1"], "rename": {}}


        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_file.read())
            tmp_path = tmp.name

        doc = None
        try:
            doc = fitz.open(tmp_path)

            # ✅ Pass drawing_type to load_reference_images
            reference_images = self.load_reference_images(drawing_type)

            analysis_data = []
            all_window_types = Counter()
            all_flags_detailed = []
            total_door_count = 0  # ✅ Track total doors across all pages

            for page in doc:
                page_index = page.number
                printed_label = self.extract_printed_page_number(page) or f"P{page_index+1}"
                pix = page.get_pixmap(dpi=300)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            
                tiles = self.pdf_to_image_tiles_image(img, tiles_per_side)
                page_tag_counter = Counter()
                seen = set()
                page_door_count = 0

                for idx, tile in enumerate(tiles, start=1):
                    if self.is_mostly_white(tile):
                        continue
                    # ✅ Pass drawing_type and reference_images to analyzer
                    result = analyze_image_with_references(tile, drawing_type, reference_images)
                    tw = {t: c for t, c in result["window_types"].items() if is_valid_window_tag(t)}
                    tf = result["flags"]

                     # ✅ Aggregate windows
                    for t, cnt in tw.items():
                        key = (printed_label, idx, t)
                        if key in seen:
                            continue
                        seen.add(key)
                        page_tag_counter[t] += cnt

                    # ✅ Aggregate doors
                    page_door_count += result.get("door_count", 0)  

                    for f in tf:
                         all_flags_detailed.append({
                "Page": printed_label,
                "Tile": idx,
                "Flag": f
            })

                page_tag_counter = self.apply_manual_corrections(page_tag_counter, corrections)

                  # ✅ Aggregate totals across all pages
                all_window_types.update(page_tag_counter)
                total_door_count += page_door_count
                
                page_flags = []
                ...
                for idx, tile in enumerate(tiles, start=1):
                    tf = result["flags"]
                    page_flags.extend(tf)
                    ...
                
                 # ✅ Store per-page data
                analysis_data.append({
                 "printed_page": printed_label,
                 "window_types": dict(page_tag_counter),
                 "doors": page_door_count,
                 "flags": tf
                })

            excel_buffer = create_excel_report(
                data=analysis_data,
                drawing_type=drawing_type,
                window_tag_counts=all_window_types,
                flag_details=all_flags_detailed,
                windows_only=(mode == "windows_only")
            )

            upload = UserUpload.objects.create(user=user, drawing_type=drawing_type, mode=mode)
            upload.pdf_file.save(f"user_upload_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                                 ContentFile(open(tmp_path, 'rb').read()))
            upload.excel_file.save(f"excel_result_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                                   ContentFile(excel_buffer.getvalue()))
            upload.save()

            subscription.remaining_credits -= cost
            subscription.save()
            return FileResponse(excel_buffer, as_attachment=True, filename=f"{drawing_type}_results_{mode}.xlsx")

        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            return Response({"error": "Processing failed"}, status=500)

        finally:
            if doc:
                doc.close()
            try:
                os.remove(tmp_path)
            except:
                pass


    def is_mostly_white(self, tile, threshold=0.95):
        gray = tile.convert("L")
        white = sum(p > 240 for p in gray.getdata())
        return white / (tile.width * tile.height) > threshold

    def pdf_to_image_tiles_image(self, img, tiles_per_side, overlap_ratio=0.05):
        """
        Split image into tiles with small overlap to avoid cutting tags in half.
        """
        w, h = img.size
        tw, th = w // tiles_per_side, h // tiles_per_side
        x_overlap = int(tw * overlap_ratio)
        y_overlap = int(th * overlap_ratio)

        tiles = []
        for row in range(tiles_per_side):
            for col in range(tiles_per_side):
                x0 = max(col * tw - x_overlap, 0)
                y0 = max(row * th - y_overlap, 0)
                x1 = min((col + 1) * tw + x_overlap, w)
                y1 = min((row + 1) * th + y_overlap, h)
                tiles.append(img.crop((x0, y0, x1, y1)))
        return tiles

    def extract_printed_page_number(self, page):
        blocks = page.get_text("blocks")
        best_match = ("", -1, -1)
        pattern = re.compile(r"^A\d{1,3}(\.\d{1,2})?$")
        for x0, y0, x1, y1, text, *_ in blocks:
            text = text.strip().replace("\n", "").upper()
            if pattern.match(text):
                score = x1 + y1
                if score > best_match[1] + best_match[2]:
                    best_match = (text, x1, y1)
        return best_match[0] or None

    def apply_manual_corrections(self, tag_counts, corrections):
        for tag in corrections.get("remove", []):
            tag_counts.pop(tag, None)
        for old, new in corrections.get("rename", {}).items():
            if old in tag_counts:
                tag_counts[new] = tag_counts.get(new, 0) + tag_counts[old]
                del tag_counts[old]
        return tag_counts




from django.core.mail import EmailMessage
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class FeatureRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        message = request.data.get('message')

        if not message or not email:
            return Response({"error": "Message and email required."}, status=400)

        email_message = EmailMessage(
            subject="Feature Request from User",
            body=f"Feature request from: {email}\n\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.DEFAULT_FROM_EMAIL],  # Your email as recipient
            reply_to=[email],  # So you can directly reply to user
        )
        email_message.send(fail_silently=False)

        return Response({"success": "Feature request sent!"})


# analyzer/views.py

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
import random
import uuid
from .models import User, UserDevice, VerificationCode, UserUpload
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.utils import timezone
from datetime import timedelta

class SignUpView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        username = request.data.get('username')
        
        if not email or not password or not username:
            return Response({'error': 'Email, username and password are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Generate device ID from headers
        device_id = self.generate_device_id(request)
        
        # Create verification code
        code = str(random.randint(100000, 999999))
        VerificationCode.objects.create(
            user=user,
            code=code,
            device_id=device_id
        )
        
        # Send verification email
        send_mail(
            'Your Verification Code',
            f'Your verification code is: {code}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        return Response({
            'message': 'User created. Verification code sent to email.',
            'device_id': device_id,
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)
    
    def generate_device_id(self, request):
        # Create a unique device ID from user agent and IP
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip_address = request.META.get('REMOTE_ADDR', '')
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_agent}{ip_address}"))
    
    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import UserDevice, VerificationCode
from rest_framework.authtoken.models import Token
from django.core.mail import send_mail
from django.conf import settings
import random
import uuid
import logging




class VerifyCodeView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        device_id = request.data.get('device_id')
        code = request.data.get('code')
        
        if not all([user_id, device_id, code]):
            return Response({'error': 'Missing parameters'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        # Check if code is valid (within 10 minutes)
        ten_minutes_ago = timezone.now() - timedelta(minutes=10)
        verification = VerificationCode.objects.filter(
            user=user,
            device_id=device_id,
            code=code,
            created_at__gte=ten_minutes_ago,
            is_used=False
        ).first()
        
        if not verification:
            return Response({'error': 'Invalid or expired code'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark code as used
        verification.is_used = True
        verification.save()
        
        # Mark device as verified
        device, _ = UserDevice.objects.get_or_create(
            user=user,
            device_id=device_id
        )
        device.is_verified = True
        device.last_login = timezone.now()
        device.save()
        
        # Create or get token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'email': user.email,
            'username': user.username
        })
from django.conf import settings
import os

import os
import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, Http404
from wsgiref.util import FileWrapper
from .models import UserUpload, Subscription
from django.core.exceptions import PermissionDenied



from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUser
from django.contrib.auth import get_user_model
from .models import Subscription
from rest_framework import status

User = get_user_model()
class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        print("AdminUserListView accessed")
        print(f"Authenticated user: {request.user}")
        print(f"Is staff: {request.user.is_staff}")
        users = User.objects.all()
        data = []
        for user in users:
            sub = getattr(user, 'subscription', None)
            print(f"User: {user.email}, Plan: {sub.plan if sub else 'N/A'}")
            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'plan': sub.plan if sub else "N/A",
                'credits': sub.remaining_credits if sub else 0,
                'expiry': sub.expiry_date.strftime('%Y-%m-%d') if sub else "N/A"
            })
        return Response(data)

from datetime import timedelta
from django.utils import timezone
from .models import UserDevice  # Ensure this is imported

class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        data = request.data
        if not data.get("email") or not data.get("password"):
            return Response({'error': 'Email and password required'}, status=400)

        # Create admin user with elevated privileges
        user = User.objects.create_user(
            username=data.get("username", data['email']),
            email=data['email'],
            password=data['password'],
            is_staff=True,
            is_superuser=True
        )

        # Generate a device ID
        device_id = f"admin_device_{user.id}"
        
        # Create a verified device record
        UserDevice.objects.create(
            user=user,
            device_id=device_id,
            is_verified=True,
            last_login=timezone.now()
        )

        # ✅ Give highest plan ("pro") to admin for free
        Subscription.objects.create(
            user=user,
            plan='pro',
            remaining_credits=40,
            expiry_date=timezone.now() + timedelta(days=365),  # 1 year expiry
            auto_renew=False,  # Admins don't need auto-renew
            billing_cycle='yearly'
        )

        # Generate and return token
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'success': 'Admin user created with Pro subscription',
            'id': user.id,
            'email': user.email,
            'token': token.key,
            'device_id': device_id
        })

class AdminDeleteUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.delete()
            return Response({'success': 'User deleted'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class AdminUpdateUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_staff = request.data.get('is_staff', user.is_staff)
            user.email = request.data.get('email', user.email)
            user.username = request.data.get('username', user.username)
            user.save()
            return Response({'success': 'User updated'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

import os
import logging
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from django.core.handlers.wsgi import WSGIHandler
from wsgiref.util import FileWrapper  # ✅ Correct
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from .models import UserUpload, Subscription

logger = logging.getLogger(__name__)

class DashboardView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Retrieve dashboard data including uploads and subscription information.
        """
        user = request.user
        uploads = UserUpload.objects.filter(user=user).order_by('-uploaded_at')
        subscription = Subscription.objects.filter(user=user).first()

        upload_data = []
        for upload in uploads:
            try:
                # Convert paths to use forward slashes for consistency
                excel_path = upload.excel_file.path.replace('\\', '/')
                pdf_path = upload.pdf_file.path.replace('\\', '/')

                upload_data.append({
                    'id': upload.id,
                    'pdf_name': os.path.basename(upload.pdf_file.name),
                    'excel_name': os.path.basename(upload.excel_file.name),
                    'drawing_type': upload.drawing_type,
                    'mode': upload.mode,
                    'uploaded_at': upload.uploaded_at,
                    'excel_path': excel_path,
                    'pdf_path': pdf_path
                })
            except Exception as e:
                logger.error(f"Error processing upload {upload.id}: {str(e)}")

        # Calculate total credits (used + remaining) if subscription exists
        total_credits = 0
        if subscription:
            total_credits = (subscription.credits_used or 0) + subscription.remaining_credits

        return Response({
            'uploads': upload_data,
            'subscription': {
                'plan': subscription.plan if subscription else "None",
                'remaining_credits': subscription.remaining_credits if subscription else 0,
                'credits_used': subscription.credits_used if subscription else 0,
                'total_credits': total_credits if subscription else 0,
                'expiry_date': subscription.expiry_date.strftime('%Y-%m-%d') if subscription else None,
                'auto_renew': subscription.auto_renew if subscription else False,
                'billing_cycle': subscription.billing_cycle if subscription else None
            }
        })

    def post(self, request):
        """
        Secure file download endpoint with credit usage tracking.
        """
        file_path = request.data.get('file_path')
        if not file_path:
            return Response({'error': 'File path is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize path for comparison
        file_path = file_path.replace('\\', '/')
        
        try:
            # Verify the requesting user owns this file
            upload = UserUpload.objects.filter(
                user=request.user,
                excel_file__in=[
                    file_path.replace(settings.MEDIA_ROOT.replace('\\', '/') + '/', ''),
                    file_path.split('media/')[-1]  # Alternative path format
                ]
            ).first()
            
            if not upload:
                raise PermissionDenied("You don't have permission to access this file")

            # Check subscription and credits
            subscription = Subscription.objects.filter(user=request.user).first()
            if not subscription or subscription.remaining_credits <= 0:
                return Response(
                    {'error': 'No credits available. Please subscribe or purchase more credits.'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # Verify file exists
            if not os.path.exists(file_path):
                raise Http404("File not found")

            # Open file in binary mode
            file = open(file_path, 'rb')
            response = FileResponse(
                FileWrapper(file),  # Now using the correctly imported FileWrapper
                content_type='application/vnd.ms-excel',
                as_attachment=True,
                filename=os.path.basename(file_path))
            
            # Ensure file gets closed when response is done
            response['Content-Length'] = os.path.getsize(file_path)

            # Update credits (only if download is successful)
            if subscription:
                subscription.remaining_credits -= 1
                subscription.credits_used += 1
                subscription.save()

            return response
            
        except PermissionDenied as e:
            logger.warning(f"Unauthorized file access attempt by user {request.user.id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Http404 as e:
            logger.error(f"File not found: {file_path}")
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"File download error: {str(e)}")
            return Response(
                {'error': 'Internal server error'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class GetSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            sub = Subscription.objects.get(user=user)
            return Response({
                "plan": sub.plan,
                "credits": sub.credits,
                "expires": sub.expiry_date,
            })
        except Subscription.DoesNotExist:
            return Response({}, status=200)
        from rest_framework import status
from .payments import StripePayment, PayPalPayment
from .models import Payment
from datetime import timedelta
import logging


logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class SubscriptionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            subscription = Subscription.objects.get(user=user)
            return Response({
                "plan": subscription.plan,
                "remaining_credits": subscription.remaining_credits,
                "expiry_date": subscription.expiry_date,
                "auto_renew": subscription.auto_renew,
                "billing_cycle": subscription.billing_cycle,
                "had_free_trial": subscription.had_free_trial,
                "is_expired": subscription.is_expired()
            })
        except Subscription.DoesNotExist:
            return Response({
                "plan": None,
                "remaining_credits": 0,
                "expiry_date": None,
                "auto_renew": False,
                "billing_cycle": "monthly",
                "had_free_trial": False,
                "is_expired": True
            }, status=200)

    def post(self, request):
        user = request.user
        plan = request.data.get("plan")
        payment_method = request.data.get("payment_method")
        billing_cycle = request.data.get("billing_cycle", "monthly")
        auto_renew = request.data.get("auto_renew", True)

        # Free plan restrictions
        if plan == "free":
            try:
                existing_sub = Subscription.objects.get(user=user)
                if existing_sub.had_free_trial:
                    return Response(
                        {"error": "You can only use the free trial once"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Subscription.DoesNotExist:
                pass  # No existing subscription, can get free trial

            expiry_date = timezone.now() + timedelta(days=7)
            subscription, created = Subscription.objects.update_or_create(
                user=user,
                defaults={
                    "plan": plan,
                    "remaining_credits": 10,
                    "expiry_date": expiry_date,
                    "auto_renew": False,
                    "billing_cycle": "monthly",
                    "had_free_trial": True
                }
            )
            return Response({
                "message": "Free trial activated for 7 days",
                "plan": plan,
                "remaining_credits": 10,
                "expiry_date": expiry_date,
                "auto_renew": False,
                "billing_cycle": "monthly",
                "had_free_trial": True
            })

        # Paid plans
        if not payment_method:
            return Response(
                {"error": "Payment method is required for paid plans"},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_details = {
            "basic": {
                "monthly_price": 10,
                "yearly_price": 100,
                "credits": 15
            },
            "pro": {
                "monthly_price": 25,
                "yearly_price": 250,
                "credits": 40
            }
        }

        if plan not in plan_details:
            return Response(
                {"error": "Invalid plan selected"},
                status=status.HTTP_400_BAD_REQUEST
            )

        details = plan_details[plan]
        price = details["yearly_price"] if billing_cycle == "yearly" else details["monthly_price"]
        duration_days = 365 if billing_cycle == "yearly" else 30

        # Create payment record
        payment = Payment.objects.create(
            user=user,
            amount=price,
            currency="usd",
            payment_method=payment_method,
            payment_type="subscription",
            status="pending",
            billing_cycle=billing_cycle
        )

        if payment_method == "stripe":
            try:
                intent = stripe.PaymentIntent.create(
                    amount=int(price * 100),  # cents
                    currency="usd",
                    payment_method_types=['card'],
                    metadata={
                        "user_id": user.id,
                        "payment_id": payment.id,
                        "plan": plan,
                        "billing_cycle": billing_cycle
                    }
                )
                payment.payment_intent_id = intent.id
                payment.save()
                
                return Response({
                    "client_secret": intent.client_secret,
                    "payment_id": payment.id,
                    "requires_action": True,
                    "payment_method": "stripe"
                })
            except Exception as e:
                logger.error(f"Stripe error: {str(e)}")
                payment.status = "failed"
                payment.save()
                return Response(
                    {"error": "Payment processing failed"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        elif payment_method == "paypal":
            # PayPal implementation would go here
            return Response(
                {"error": "PayPal integration not implemented yet"},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

        return Response(
            {"error": "Invalid payment method"},
            status=status.HTTP_400_BAD_REQUEST
        )

class PaymentConfirmationView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("payment_id")
        payment_method = request.data.get("payment_method")
        billing_cycle = request.data.get("billing_cycle", "monthly")
        auto_renew = request.data.get("auto_renew", True)
        user = request.user

        try:
            payment = Payment.objects.get(id=payment_id, user=user, status="pending")
        except Payment.DoesNotExist:
            return Response({"error": "Invalid payment"}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method == "stripe":
            payment_intent_id = request.data.get("payment_intent_id")
            if not payment_intent_id:
                return Response({"error": "Payment intent ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            is_verified = StripePayment.verify_payment(payment_intent_id)
            if not is_verified:
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)
            
            payment.status = "completed"
            payment.completed_at = timezone.now()
            payment.save()

        elif payment_method == "paypal":
            order_id = request.data.get("order_id")
            if not order_id:
                return Response({"error": "Order ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            capture_result = PayPalPayment.capture_order(order_id)
            if not capture_result or capture_result.get("status") != "COMPLETED":
                return Response({"error": "Payment capture failed"}, status=status.HTTP_400_BAD_REQUEST)
            
            payment.status = "completed"
            payment.completed_at = timezone.now()
            payment.save()

        else:
            return Response({"error": "Invalid payment method"}, status=status.HTTP_400_BAD_REQUEST)

        plan = request.data.get("plan")
        plan_details = {
            "free": {"credits": 10, "duration_days": 7},
            "basic": {"credits": 15, "duration_days": 30},
            "pro": {"credits": 40, "duration_days": 30},
        }

        if plan not in plan_details:
            return Response({"error": "Invalid plan selected."}, status=status.HTTP_400_BAD_REQUEST)

        details = plan_details[plan]
        duration_days = 365 if billing_cycle == "yearly" else details["duration_days"]
        expiry_date = timezone.now() + timedelta(days=duration_days)

        current_sub = Subscription.objects.filter(user=user).first()
        remaining_credits = details["credits"]
        if current_sub and current_sub.auto_renew and current_sub.plan == plan:
            remaining_credits += current_sub.remaining_credits

        subscription, created = Subscription.objects.update_or_create(
            user=user,
            defaults={
                "plan": plan,
                "remaining_credits": remaining_credits,
                "expiry_date": expiry_date,
                "auto_renew": auto_renew,
                "billing_cycle": billing_cycle
            }
        )

        return Response({
            "message": f"{'Created' if created else 'Updated'} {plan} subscription.",
            "plan": plan,
            "remaining_credits": remaining_credits,
            "expiry_date": expiry_date,
            "auto_renew": auto_renew,
            "billing_cycle": billing_cycle
        })

class PurchaseCreditsView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        credits = request.data.get("credits", 0)
        payment_method = request.data.get("payment_method")

        try:
            subscription = Subscription.objects.get(user=user)
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription"}, status=400)

        if subscription.plan not in ["basic", "pro"]:
            return Response({"error": "Credits can only be purchased with Basic or Pro plan"}, status=400)

        try:
            credits = int(credits)
            if credits not in [5, 10, 20, 50]:
                return Response({"error": "Invalid credit amount"}, status=400)

            base_price = 1.0
            discount = 0.05 if subscription.plan == "pro" else 0.025
            total = credits * base_price * (1 - discount)
            
            if not payment_method:
                return Response({"error": "Payment method required"}, status=400)
            
            payment = Payment.objects.create(
                user=user,
                amount=total,
                currency="usd",
                payment_method=payment_method,
                payment_type="credit_purchase",
                status="pending",
                billing_cycle="one_time",
                credits_purchased=credits
            )

            if payment_method == "stripe":
                intent = StripePayment.create_payment_intent(total)
                if not intent:
                    return Response({"error": "Failed to create payment intent"}, status=500)
                
                payment.payment_intent_id = intent.id
                payment.save()
                
                return Response({
                    "client_secret": intent.client_secret,
                    "payment_id": payment.id,
                    "requires_action": True,
                    "payment_method": "stripe"
                })
            
            elif payment_method == "paypal":
                order = PayPalPayment.create_order(total)
                if not order:
                    return Response({"error": "Failed to create PayPal order"}, status=500)
                
                payment.paypal_order_id = order["id"]
                payment.save()
                
                return Response({
                    "order_id": order["id"],
                    "payment_id": payment.id,
                    "approval_url": next(link["href"] for link in order["links"] if link["rel"] == "approve"),
                    "payment_method": "paypal"
                })
            
            return Response({"error": "Invalid payment method"}, status=400)
            
        except ValueError:
            return Response({"error": "Invalid credits value"}, status=400)

class ConfirmCreditPaymentView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("payment_id")
        payment_method = request.data.get("payment_method")
        user = request.user

        try:
            payment = Payment.objects.get(id=payment_id, user=user, status="pending")
        except Payment.DoesNotExist:
            return Response({"error": "Invalid payment"}, status=status.HTTP_400_BAD_REQUEST)

        if payment_method == "stripe":
            payment_intent_id = request.data.get("payment_intent_id")
            if not payment_intent_id:
                return Response({"error": "Payment intent ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            is_verified = StripePayment.verify_payment(payment_intent_id)
            if not is_verified:
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)
            
        elif payment_method == "paypal":
            order_id = request.data.get("order_id")
            if not order_id:
                return Response({"error": "Order ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            capture_result = PayPalPayment.capture_order(order_id)
            if not capture_result or capture_result.get("status") != "COMPLETED":
                return Response({"error": "Payment capture failed"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Invalid payment method"}, status=status.HTTP_400_BAD_REQUEST)

        payment.status = "completed"
        payment.completed_at = timezone.now()
        payment.save()

        try:
            subscription = Subscription.objects.get(user=user)
            subscription.remaining_credits += payment.credits_purchased
            subscription.save()
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": f"Successfully added {payment.credits_purchased} credits to your account",
            "remaining_credits": subscription.remaining_credits
        })
        
class CancelSubscriptionView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            subscription = Subscription.objects.get(user=user)
            if subscription.plan == "free":
                return Response({"error": "Free plan cannot be cancelled"}, status=400)
            
            subscription.auto_renew = False
            subscription.save()
            
            return Response({
                "message": "Your subscription will not auto-renew",
                "auto_renew": False,
                "expiry_date": subscription.expiry_date
            })
        except Subscription.DoesNotExist:
            return Response({"error": "No active subscription to cancel"}, status=400)