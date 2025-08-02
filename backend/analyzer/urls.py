from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token

from .views import (
    UploadPDFView, DashboardView, current_user, SignUpView, LoginView, VerifyCodeView,
    ForgotPasswordView, ResetPasswordView, GetSubscriptionView, SubscriptionView,
    CancelSubscriptionView, PurchaseCreditsView, PaymentConfirmationView,
    AdminUserListView, AdminCreateUserView, AdminDeleteUserView, AdminUpdateUserView,
    FeatureRequestView
)

urlpatterns = [
    path('upload/', UploadPDFView.as_view(), name='upload'),
    path('feature-request/', FeatureRequestView.as_view(), name='feature-request'),
    path('auth/signup/', SignUpView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/verify/', VerifyCodeView.as_view(), name='verify'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path("subscribe/", SubscriptionView.as_view()),  # ✅ correct endpoint
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/create/', AdminCreateUserView.as_view(), name='admin-create-user'),
    path('admin/users/<int:pk>/delete/', AdminDeleteUserView.as_view(), name='admin-delete-user'),
    path('admin/users/<int:pk>/update/', AdminUpdateUserView.as_view(), name='admin-update-user'),
    path('auth/login/', obtain_auth_token),
    path('subscription/', SubscriptionView.as_view(), name='subscription'),
    path('purchase-credits/', PurchaseCreditsView.as_view(), name='purchase-credits'),
    path('payment-confirm/', PaymentConfirmationView.as_view(), name='payment-confirm'),
    path('cancel-subscription/', CancelSubscriptionView.as_view(), name='cancel-subscription'),  # Add this new path
    path('auth/user/', current_user, name='current-user'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/<uuid:token>/', ResetPasswordView.as_view(), name='reset-password'),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

