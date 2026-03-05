from django.contrib.auth.models import User
from rest_framework import serializers
import re


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "password")

    def validate_email(self, value):
        allowed_domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com"]

        domain = value.split("@")[-1]
        if domain not in allowed_domains:
            raise serializers.ValidationError(
                "Email must be Gmail, Outlook, Hotmail, or Yahoo"
            )

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")

        return value

    def validate_password(self, value):
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Password must contain one uppercase letter")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Password must contain one lowercase letter")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("Password must contain one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise serializers.ValidationError("Password must contain one special character")

        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")


class UserProfileSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="first_name")
    email = serializers.EmailField()
    
    class Meta:
        model = User
        fields = ["id", "fullName", "email"]

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=True)
    newPassword = serializers.CharField(required=True)

    def validate_currentPassword(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value
