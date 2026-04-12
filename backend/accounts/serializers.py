import re
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Profile

PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$"


class RegisterSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    company = serializers.CharField(max_length=120, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already exists.")
        return email

    def validate_password(self, value):
        if not re.match(PASSWORD_REGEX, value):
            raise serializers.ValidationError(
                "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, 1 number, and 1 special character."
            )
        return value

    def create(self, validated_data):
        full_name = validated_data["fullName"].strip()
        email = validated_data["email"]
        company = validated_data.get("company", "").strip()
        password = validated_data["password"]

        base_username = email.split("@")[0]
        username = base_username
        i = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{i}"
            i += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=True,
        )

        profile, _ = Profile.objects.get_or_create(user=user)
        profile.full_name = full_name
        profile.company = company
        profile.save()

        return user
    
class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password") or ""

        if not email or not password:
            raise serializers.ValidationError({"message": "Email and password are required."})

        attrs["email"] = email
        attrs["password"] = password
        return attrs


class ProfileUpdateSerializer(serializers.Serializer):
    fullName = serializers.CharField(required=False, allow_blank=True, max_length=120)
    email = serializers.EmailField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True, max_length=120)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=40)
    role = serializers.CharField(required=False, allow_blank=True, max_length=80)
    address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    profilePicture = serializers.ImageField(required=False, allow_null=True)
    removeProfilePicture = serializers.BooleanField(required=False, default=False)

    def validate_fullName(self, value):
        full_name = value.strip()
        if not full_name:
            raise serializers.ValidationError("Full name is required.")
        return full_name

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if not normalized_email:
            raise serializers.ValidationError("Email is required.")

        user = self.instance
        email_exists = (
            User.objects.filter(email__iexact=normalized_email)
            .exclude(id=getattr(user, "id", None))
            .exists()
        )
        if email_exists:
            raise serializers.ValidationError("Email already exists.")
        return normalized_email

    def validate_company(self, value):
        return value.strip()

    def validate_phone(self, value):
        return value.strip()

    def validate_role(self, value):
        return value.strip()

    def validate_address(self, value):
        return value.strip()

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError({"message": "Provide at least one field to update."})
        return attrs

    def update(self, instance, validated_data):
        profile, _ = Profile.objects.get_or_create(user=instance)

        user_update_fields = []
        if "email" in validated_data:
            instance.email = validated_data["email"]
            user_update_fields.append("email")

        if user_update_fields:
            instance.save(update_fields=user_update_fields)

        profile_update_fields = []
        field_map = {
            "fullName": "full_name",
            "company": "company",
            "phone": "phone",
            "role": "role",
            "address": "address",
        }
        for serializer_field, model_field in field_map.items():
            if serializer_field in validated_data:
                setattr(profile, model_field, validated_data[serializer_field])
                profile_update_fields.append(model_field)

        if "profilePicture" in validated_data:
            profile.profile_picture = validated_data["profilePicture"]
            profile_update_fields.append("profile_picture")
        elif validated_data.get("removeProfilePicture"):
            if profile.profile_picture:
                profile.profile_picture.delete(save=False)
            profile.profile_picture = None
            profile_update_fields.append("profile_picture")

        if profile_update_fields:
            profile.save(update_fields=list(dict.fromkeys(profile_update_fields)))

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False, write_only=True)
    newPassword = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        current_password = attrs.get("currentPassword") or ""
        new_password = attrs.get("newPassword") or ""
        user = self.context["request"].user

        if not current_password or not new_password:
            raise serializers.ValidationError(
                {"message": "Current password and new password are required."}
            )

        if not user.check_password(current_password):
            raise serializers.ValidationError({"message": "Current password is incorrect."})

        if current_password == new_password:
            raise serializers.ValidationError(
                {"message": "New password must be different from the current password."}
            )

        if not re.match(PASSWORD_REGEX, new_password):
            raise serializers.ValidationError(
                {
                    "message": (
                        "Password must be at least 8 characters and include 1 uppercase, "
                        "1 lowercase, 1 number, and 1 special character."
                    )
                }
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"message": " ".join(exc.messages)}) from exc

        attrs["newPassword"] = new_password
        return attrs    


class UserMeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    company = serializers.CharField(source="profile.company", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "company")
