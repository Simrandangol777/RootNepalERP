import re
from django.contrib.auth.models import User
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
        if User.objects.filter(email=email).exists():
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


class UserMeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    company = serializers.CharField(source="profile.company", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "company")
