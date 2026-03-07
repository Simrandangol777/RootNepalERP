from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_profile_phone_address"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="profile_picture",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/"),
        ),
    ]
