from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product, Purchase, PurchaseItem, Sale, SaleItem, Supplier


class DashboardOverviewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="dashuser",
            email="dash@example.com",
            password="DashPass1!",
        )
        self.category = Category.objects.create(
            name="Dashboard Category",
            description="For analytics",
            created_by=self.user,
            updated_by=self.user,
        )
        self.supplier = Supplier.objects.create(name="Dashboard Supplier")
        self.product = Product.objects.create(
            name="Dashboard Product",
            description="Tracked product",
            category=self.category,
            sku_number="SK-DA1",
            price=Decimal("20.00"),
            cost_price=Decimal("12.00"),
            selling_price=Decimal("20.00"),
            stock=2,
            reorder_level=3,
            supplier=self.supplier,
            created_by=self.user,
            updated_by=self.user,
        )

    def test_overview_returns_expected_sections(self):
        response = self.client.get("/api/dashboard/overview/", secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("kpis", response.data)
        self.assertIn("sales_trend", response.data)
        self.assertIn("inventory_trend", response.data)
        self.assertIn("payment_distribution", response.data)
        self.assertIn("top_products", response.data)
        self.assertIn("restock_alerts", response.data)
        self.assertIn("activities", response.data)

    def test_overview_inventory_trend_is_not_empty(self):
        response = self.client.get("/api/dashboard/overview/", secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("inventory_trend", response.data)
        self.assertEqual(len(response.data["inventory_trend"]), 6)

        for point in response.data["inventory_trend"]:
            self.assertIn("month", point)
            self.assertIn("value", point)

    def test_overview_date_range_filters_sales_and_purchases(self):
        recent_sale = Sale.objects.create(
            sold_by=self.user,
            payment_method="Cash",
            subtotal=Decimal("20.00"),
            total_discount=Decimal("0.00"),
            total=Decimal("20.00"),
            customer_name="Recent Customer",
            status="Completed",
        )
        SaleItem.objects.create(
            sale=recent_sale,
            product=self.product,
            selling_price=Decimal("20.00"),
            quantity=1,
            discount=Decimal("0.00"),
            line_total=Decimal("20.00"),
        )

        old_sale = Sale.objects.create(
            sold_by=self.user,
            payment_method="Cash",
            subtotal=Decimal("50.00"),
            total_discount=Decimal("0.00"),
            total=Decimal("50.00"),
            customer_name="Old Customer",
            status="Completed",
        )
        SaleItem.objects.create(
            sale=old_sale,
            product=self.product,
            selling_price=Decimal("25.00"),
            quantity=2,
            discount=Decimal("0.00"),
            line_total=Decimal("50.00"),
        )
        Sale.objects.filter(id=old_sale.id).update(created_at=timezone.now() - timedelta(days=40))

        recent_purchase = Purchase.objects.create(
            supplier=self.supplier,
            invoice_number="DASH-001",
            purchase_date=timezone.now().date(),
            payment_method="Cash",
            status="Received",
            subtotal=Decimal("8.00"),
            grand_total=Decimal("8.00"),
            purchased_by=self.user,
        )
        PurchaseItem.objects.create(
            purchase=recent_purchase,
            product=self.product,
            cost_price=Decimal("8.00"),
            quantity=1,
            discount=Decimal("0.00"),
            line_total=Decimal("8.00"),
        )

        old_purchase = Purchase.objects.create(
            supplier=self.supplier,
            invoice_number="DASH-002",
            purchase_date=timezone.now().date() - timedelta(days=45),
            payment_method="Cash",
            status="Received",
            subtotal=Decimal("30.00"),
            grand_total=Decimal("30.00"),
            purchased_by=self.user,
        )
        PurchaseItem.objects.create(
            purchase=old_purchase,
            product=self.product,
            cost_price=Decimal("10.00"),
            quantity=3,
            discount=Decimal("0.00"),
            line_total=Decimal("30.00"),
        )

        response = self.client.get("/api/dashboard/overview/?date_range=last_30_days", secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data["kpis"]["revenue"])), Decimal("20"))
        self.assertEqual(Decimal(str(response.data["kpis"]["purchases"])), Decimal("8"))
        self.assertEqual(len(response.data["restock_alerts"]), 1)
        self.assertEqual(response.data["restock_alerts"][0]["product"], "Dashboard Product")
