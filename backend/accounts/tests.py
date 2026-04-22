from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Profile


class AccountsAPITests(APITestCase):
    def setUp(self):
        self.password = "SecurePass1!"
        self.user = User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password=self.password,
        )
        self.user.profile.full_name = "Existing User"
        self.user.profile.company = "Root Nepal"
        self.user.profile.save()

    def test_register_creates_user_and_profile(self):
        payload = {
            "fullName": "New User",
            "email": "newuser@example.com",
            "company": "ERP Co",
            "password": "NewSecure1!",
        }

        response = self.client.post("/api/auth/register/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Registration successful. Please log in.")
        created_user = User.objects.get(email="newuser@example.com")
        self.assertEqual(created_user.profile.full_name, "New User")
        self.assertEqual(created_user.profile.company, "ERP Co")

    def test_register_rejects_duplicate_email(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "fullName": "Duplicate",
                "email": "existing@example.com",
                "password": "Another1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_login_with_email_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "existing@example.com", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_username_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "existinguser", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_duplicate_case_variant_emails_uses_matching_password(self):
        User.objects.create_user(
            username="dupefirst",
            email="dupe@example.com",
            password="WrongPass1!",
        )
        User.objects.create_user(
            username="dupesecond",
            email="Dupe@Example.com",
            password="RightPass1!",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": "dupe@example.com", "password": "RightPass1!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_accepts_password_with_accidental_surrounding_spaces(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": "existing@example.com", "password": f"  {self.password}  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user_details(self):
        self.client.force_authenticate(self.user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["full_name"], "Existing User")
        self.assertEqual(response.data["company"], "Root Nepal")

    def test_profile_patch_updates_profile_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            "/api/auth/profile/",
            {
                "fullName": "Updated User",
                "email": "updated@example.com",
                "company": "Updated Co",
                "phone": "9800000000",
                "role": "Manager",
                "address": "Kathmandu",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "updated@example.com")
        self.assertEqual(self.user.profile.full_name, "Updated User")
        self.assertEqual(self.user.profile.company, "Updated Co")
        self.assertEqual(self.user.profile.phone, "9800000000")
        self.assertEqual(self.user.profile.role, "Manager")
        self.assertEqual(self.user.profile.address, "Kathmandu")

    def test_profile_patch_rejects_duplicate_email(self):
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="OtherPass1!",
        )
        Profile.objects.get_or_create(user=other_user)
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            "/api/auth/profile/",
            {"email": "other@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_profile_patch_rejects_invalid_email_format(self):
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            "/api/auth/profile/",
            {"email": "not-an-email"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_change_password_updates_credentials(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "currentPassword": self.password,
                "newPassword": "ChangedPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Password changed successfully.")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ChangedPass1!"))

        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "existing@example.com", "password": "ChangedPass1!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_change_password_rejects_invalid_current_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "currentPassword": "WrongPassword1!",
                "newPassword": "ChangedPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "Current password is incorrect.")

    def test_change_password_rejects_reusing_current_password(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "currentPassword": self.password,
                "newPassword": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["message"],
            "New password must be different from the current password.",
        )
