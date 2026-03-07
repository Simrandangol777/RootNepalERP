import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import PASSWORD_REGEX
from .serializers import RegisterSerializer, UserMeSerializer


def build_profile_payload(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    profile_picture = profile.profile_picture.url if profile.profile_picture else ""
    return {
        "fullName": profile.full_name or user.username,
        "email": user.email,
        "company": profile.company or "",
        "phone": profile.phone or "",
        "role": profile.role or "",
        "address": profile.address or "",
        "profilePicture": profile_picture,
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response(
            {"message": "Registration successful. Please log in."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User.objects.filter(username__iexact=email).first()

        if user is None:
            return Response(
                {"message": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        auth_user = authenticate(username=user.username, password=password)
        if auth_user is None:
            return Response(
                {"message": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(auth_user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )


class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(build_profile_payload(request.user), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile, _ = Profile.objects.get_or_create(user=user)

        full_name = request.data.get("fullName")
        email = request.data.get("email")
        company = request.data.get("company")
        phone = request.data.get("phone")
        role = request.data.get("role")
        address = request.data.get("address")
        remove_profile_picture = str(request.data.get("removeProfilePicture", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if email is not None:
            normalized_email = email.strip().lower()
            if not normalized_email:
                return Response(
                    {"message": "Email is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email_exists = User.objects.filter(email__iexact=normalized_email).exclude(id=user.id).exists()
            if email_exists:
                return Response(
                    {"message": "Email already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.email = normalized_email

        if full_name is not None:
            profile.full_name = full_name.strip()
        if company is not None:
            profile.company = company.strip()
        if phone is not None:
            profile.phone = phone.strip()
        if role is not None:
            profile.role = role.strip()
        if address is not None:
            profile.address = address.strip()

        if "profilePicture" in request.FILES:
            profile.profile_picture = request.FILES["profilePicture"]
        elif remove_profile_picture:
            if profile.profile_picture:
                profile.profile_picture.delete(save=False)
            profile.profile_picture = None

        user.save(update_fields=["email"])
        profile.save()

        return Response(build_profile_payload(user), status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("currentPassword") or ""
        new_password = request.data.get("newPassword") or ""

        if not current_password or not new_password:
            return Response(
                {"message": "Current password and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(current_password):
            return Response(
                {"message": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not re.match(PASSWORD_REGEX, new_password):
            return Response(
                {
                    "message": "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response(
                {"message": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )
