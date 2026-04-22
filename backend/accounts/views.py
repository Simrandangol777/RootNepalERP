from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserMeSerializer,
)


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
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Registration successful. Please log in."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"]
        password = serializer.validated_data["password"]

        password_candidates = [password]
        stripped_password = password.strip()
        if stripped_password and stripped_password != password:
            password_candidates.append(stripped_password)

        candidate_users = list(User.objects.filter(email__iexact=identifier).order_by("id"))
        seen_user_ids = {user.id for user in candidate_users}
        for user in User.objects.filter(username__iexact=identifier).order_by("id"):
            if user.id not in seen_user_ids:
                candidate_users.append(user)
                seen_user_ids.add(user.id)

        if not candidate_users:
            return Response(
                {"message": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        def authenticate_candidate_user(candidate_user):
            for candidate_password in password_candidates:
                auth_user = authenticate(
                    username=candidate_user.username,
                    password=candidate_password,
                )
                if auth_user is not None:
                    return auth_user

                # Fallback for environments where auth backend configuration can block authenticate().
                if candidate_user.check_password(candidate_password):
                    return candidate_user
            return None

        auth_user = None
        inactive_match_found = False
        for candidate_user in candidate_users:
            matched_user = authenticate_candidate_user(candidate_user)
            if matched_user is None:
                continue
            if not matched_user.is_active:
                inactive_match_found = True
                continue
            auth_user = matched_user
            break

        if auth_user is None and inactive_match_found:
            return Response(
                {"message": "Account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_profile_payload(user), status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["newPassword"])
        request.user.save(update_fields=["password"])
        return Response(
            {"message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )
