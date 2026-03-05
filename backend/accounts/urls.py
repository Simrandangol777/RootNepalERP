from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, UserMeView, UserProfileView, ChangePasswordView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),  # accepts email + password
    path("token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", UserMeView.as_view(), name="me"),
    path("profile/", UserProfileView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
]
