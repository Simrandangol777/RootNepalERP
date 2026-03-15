from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0007_category_product_created_updated_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="cost_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="product",
            name="selling_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
