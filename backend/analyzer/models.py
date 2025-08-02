# analyzer/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
import uuid

# ✅ Custom User model
class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return self.username


# ✅ Password Reset Token
class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        return not self.is_used and self.created_at > timezone.now() - timedelta(hours=1)

    def __str__(self):
        return f"Password reset token for {self.user.email}"


# ✅ User Device
class UserDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    device_id = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255, blank=True, null=True)
    last_login = models.DateTimeField(default=timezone.now)
    is_verified = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'device_id')


# ✅ Verification Codes
class VerificationCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    device_id = models.CharField(max_length=255)
    is_used = models.BooleanField(default=False)


# ✅ User Uploads
class UserUpload(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pdf_file = models.FileField(upload_to='user_uploads/')
    excel_file = models.FileField(upload_to='analysis_results/')
    drawing_type = models.CharField(max_length=20)
    mode = models.CharField(max_length=20)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.drawing_type}"


# ✅ Subscription Model
class Subscription(models.Model):
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    plan = models.CharField(max_length=20)
    remaining_credits = models.PositiveIntegerField(default=0)
    expiry_date = models.DateTimeField()
    auto_renew = models.BooleanField(default=True)
    billing_cycle = models.CharField(
        max_length=10,
        choices=BILLING_CYCLE_CHOICES,
        default='monthly'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    credits_used = models.PositiveIntegerField(default=0)
    had_free_trial = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.plan} ({self.remaining_credits} credits left)"

    def is_expired(self):
        return timezone.now() > self.expiry_date

    def use_credits(self, amount):
        if self.remaining_credits >= amount:
            self.remaining_credits -= amount
            self.save()
            return True
        return False

    def reset_monthly_credits(self):
        if self.plan == 'free':
            self.remaining_credits = 10
        elif self.plan == 'basic':
            self.remaining_credits = 15
        elif self.plan == 'pro':
            self.remaining_credits = 40
        self.expiry_date = timezone.now() + timedelta(days=30)
        self.save()


# ✅ Payments
class Payment(models.Model):
    PAYMENT_TYPES = [
        ('subscription', 'Subscription'),
        ('credit_purchase', 'Credit Purchase'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='usd')
    payment_method = models.CharField(max_length=20)  # stripe, paypal
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='subscription')
    payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    paypal_order_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, default='pending')
    billing_cycle = models.CharField(max_length=10, choices=Subscription.BILLING_CYCLE_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    credits_purchased = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.amount} {self.currency} ({self.get_payment_type_display()})"
