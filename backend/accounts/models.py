from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=120, blank=True)
    company = models.CharField(max_length=120, blank=True)

    def __str__(self):
        return f"{self.user.username} Profile"
