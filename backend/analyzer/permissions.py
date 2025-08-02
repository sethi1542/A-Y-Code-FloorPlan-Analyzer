from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    """
    Allows access only to users with is_staff=True
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
