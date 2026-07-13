from uuid import UUID
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class GatewayUser:
    """Represents an authenticated user passed from the API gateway via headers."""

    def __init__(self, user_id: UUID, email: str, roles: list[str]):
        self.id = user_id
        self.email = email
        self.roles = roles
        self.is_authenticated = True

    @property
    def is_staff(self) -> bool:
        """Staff flag for Django admin/permission checks."""
        return "admin" in self.roles or "instructor" in self.roles


class GatewayHeaderAuthentication(BaseAuthentication):
    """DRF Authentication class for header-based auth from API gateway."""

    def authenticate(self, request):
        user_id_str = request.META.get("HTTP_X_USER_ID")
        if not user_id_str:
            return None  # Bypass so other auth methods or permissions handle it

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise AuthenticationFailed("Invalid user ID format in gateway headers")

        email = request.META.get("HTTP_X_USER_EMAIL", "")
        roles_str = request.META.get("HTTP_X_USER_ROLES", "")
        roles = [r.strip() for r in roles_str.split(",") if r.strip()]

        user = GatewayUser(user_id, email, roles)
        return (user, None)
