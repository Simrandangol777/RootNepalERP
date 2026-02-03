from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView

urlpatterns = [
    # Register
    path("register/", RegisterView.as_view(), name="register"),

    # Login (JWT)
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),

    # Refresh token
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Current user
    path("me/", MeView.as_view(), name="me"),
]
