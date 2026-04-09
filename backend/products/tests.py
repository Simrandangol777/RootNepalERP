from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import (
    Category,
    Product,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    StockAdjustment,
    Supplier,
)


class ProductsAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="OwnerPass1!",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="OtherPass1!",
        )
        self.category = self.create_category()
        self.supplier = Supplier.objects.create(name="Main Supplier", email="supplier@example.com")

    def authenticate(self, user=None):
        self.client.force_authenticate(user or self.user)

    def create_category(self, **overrides):
        defaults = {
            "name": "Incense",
            "description": "Fragrance products",
            "status": "Active",
            "created_by": self.user,
            "updated_by": self.user,
        }
        defaults.update(overrides)
        return Category.objects.create(**defaults)

    def create_product(self, **overrides):
        defaults = {
            "name": "Tibetan Incense",
            "description": "Handmade incense",
            "category": self.category,
            "sku_number": "SK-AAA",
            "price": Decimal("15.00"),
            "cost_price": Decimal("10.00"),
            "selling_price": Decimal("15.00"),
            "stock": 10,
            "reorder_level": 4,
            "supplier": self.supplier,
            "status": "Active",
            "created_by": self.user,
            "updated_by": self.user,
        }
        defaults.update(overrides)
        return Product.objects.create(**defaults)

    def test_category_create_sets_creator_fields(self):
        self.authenticate()

        response = self.client.post(
            "/api/categories/",
            {
                "name": "Singing Bowls",
                "description": "Sound healing",
                "status": "Active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        category = Category.objects.get(name="Singing Bowls")
        self.assertEqual(category.created_by, self.user)
        self.assertEqual(category.updated_by, self.user)

    def test_category_delete_rejects_non_creator(self):
        category = self.create_category(name="Restricted", created_by=self.user, updated_by=self.user)
        self.authenticate(self.other_user)

        response = self.client.delete(f"/api/categories/{category.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["message"], "You can only delete categories you created.")

    def test_category_delete_returns_conflict_when_products_exist(self):
        category = self.create_category(name="Protected Category")
        self.create_product(category=category, sku_number="SK-AAB")
        self.authenticate()

        response = self.client.delete(f"/api/categories/{category.id}/")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["message"],
            "Cannot delete category because products are still assigned to it.",
        )

    def test_product_create_normalizes_sku_and_copies_price_to_selling_price(self):
        self.authenticate()

        response = self.client.post(
            "/api/products/",
            {
                "name": "Juniper Rope Incense",
                "description": "Traditional rope incense",
                "category": self.category.id,
                "sku_number": "sk-bcd",
                "price": "25.00",
                "cost_price": "18.00",
                "stock": 12,
                "reorder_level": 3,
                "supplier": self.supplier.id,
                "status": "Active",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(name="Juniper Rope Incense")
        self.assertEqual(product.sku_number, "SK-BCD")
        self.assertEqual(product.selling_price, Decimal("25.00"))
        self.assertEqual(product.created_by, self.user)

    def test_product_delete_rejects_non_creator(self):
        product = self.create_product()
        self.authenticate(self.other_user)

        response = self.client.delete(f"/api/products/{product.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["message"], "You can only delete products you created.")

    def test_stock_adjustment_updates_stock_and_creates_audit_record(self):
        product = self.create_product(stock=5)

        response = self.client.post(
            "/api/inventory/adjust/",
            {
                "productId": product.id,
                "adjustmentType": "increase",
                "quantity": 3,
                "reason": "Restock",
                "notes": "Manual correction",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.stock, 8)
        self.assertEqual(StockAdjustment.objects.filter(product=product).count(), 1)
        adjustment = StockAdjustment.objects.get(product=product)
        self.assertEqual(adjustment.adjustment_type, "increase")
        self.assertEqual(adjustment.reason, "Restock")

    def test_stock_adjustment_rejects_unknown_product(self):
        response = self.client.post(
            "/api/inventory/adjust/",
            {
                "productId": 9999,
                "adjustmentType": "increase",
                "quantity": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("productId", response.data)

    def test_sale_creation_decreases_stock_and_returns_sale_details(self):
        self.authenticate()
        product = self.create_product(stock=10, sku_number="SK-AAC")

        response = self.client.post(
            "/api/sales/",
            {
                "saleItems": [
                    {
                        "product": product.id,
                        "sellingPrice": "15.00",
                        "quantity": 3,
                        "discount": "5.00",
                    }
                ],
                "paymentMethod": "Cash",
                "customerName": "Walk-in",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product.refresh_from_db()
        self.assertEqual(product.stock, 7)
        sale = Sale.objects.get()
        self.assertEqual(sale.total, Decimal("40.00"))
        self.assertEqual(sale.sold_by, self.user)
        self.assertEqual(SaleItem.objects.filter(sale=sale).count(), 1)
        self.assertTrue(
            StockAdjustment.objects.filter(
                product=product,
                adjustment_type="decrease",
                reason="Sale recorded",
            ).exists()
        )

    def test_sale_creation_rejects_duplicate_items_when_total_exceeds_stock(self):
        self.authenticate()
        product = self.create_product(stock=5, sku_number="SK-AAI")

        response = self.client.post(
            "/api/sales/",
            {
                "saleItems": [
                    {
                        "product": product.id,
                        "sellingPrice": "15.00",
                        "quantity": 3,
                        "discount": "0.00",
                    },
                    {
                        "product": product.id,
                        "sellingPrice": "15.00",
                        "quantity": 3,
                        "discount": "0.00",
                    },
                ],
                "paymentMethod": "Cash",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("saleItems", response.data)
        product.refresh_from_db()
        self.assertEqual(product.stock, 5)
        self.assertFalse(Sale.objects.exists())

    def test_sale_delete_restores_stock(self):
        product = self.create_product(stock=7, sku_number="SK-AAD")
        sale = Sale.objects.create(
            sold_by=self.user,
            payment_method="Cash",
            subtotal=Decimal("30.00"),
            total_discount=Decimal("0.00"),
            total=Decimal("30.00"),
            customer_name="Walk-in",
            status="Completed",
        )
        SaleItem.objects.create(
            sale=sale,
            product=product,
            selling_price=Decimal("15.00"),
            quantity=2,
            discount=Decimal("0.00"),
            line_total=Decimal("30.00"),
        )

        response = self.client.delete(f"/api/sales/{sale.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.stock, 9)
        self.assertFalse(Sale.objects.filter(id=sale.id).exists())
        self.assertTrue(
            StockAdjustment.objects.filter(
                product=product,
                adjustment_type="increase",
                reason="Sale deleted",
            ).exists()
        )

    def test_purchase_create_with_received_status_creates_supplier_and_increases_stock(self):
        self.authenticate()
        product = self.create_product(stock=4, sku_number="SK-AAE")

        response = self.client.post(
            "/api/purchases/",
            {
                "newSupplier": "Fresh Supplier",
                "newSupplierEmail": "fresh@example.com",
                "newSupplierPhone": "9800000000",
                "purchaseDate": str(date.today()),
                "invoiceNumber": "INV-100",
                "paymentMethod": "Cash",
                "purchaseStatus": "Received",
                "shipping": "2.00",
                "tax": "1.00",
                "otherCharges": "0.00",
                "purchaseItems": [
                    {
                        "product": product.id,
                        "costPrice": "8.00",
                        "quantity": 3,
                        "discount": "1.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product.refresh_from_db()
        self.assertEqual(product.stock, 7)
        purchase = Purchase.objects.get(invoice_number="INV-100")
        self.assertEqual(purchase.purchased_by, self.user)
        self.assertEqual(purchase.grand_total, Decimal("26.00"))
        self.assertTrue(Supplier.objects.filter(name="Fresh Supplier").exists())
        self.assertTrue(
            StockAdjustment.objects.filter(
                product=product,
                adjustment_type="increase",
                reason="Purchase received",
            ).exists()
        )

    def test_purchase_create_rejects_discount_greater_than_line_total(self):
        self.authenticate()
        product = self.create_product(stock=4, sku_number="SK-AAJ")

        response = self.client.post(
            "/api/purchases/",
            {
                "supplier": self.supplier.id,
                "purchaseDate": str(date.today()),
                "invoiceNumber": "INV-101A",
                "paymentMethod": "Cash",
                "purchaseStatus": "Pending",
                "purchaseItems": [
                    {
                        "product": product.id,
                        "costPrice": "8.00",
                        "quantity": 1,
                        "discount": "10.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("purchaseItems", response.data)
        self.assertFalse(Purchase.objects.filter(invoice_number="INV-101A").exists())

    def test_purchase_create_rejects_inactive_supplier(self):
        self.authenticate()
        product = self.create_product(stock=4, sku_number="SK-AAK")
        inactive_supplier = Supplier.objects.create(name="Inactive Supplier", is_active=False)

        response = self.client.post(
            "/api/purchases/",
            {
                "supplier": inactive_supplier.id,
                "purchaseDate": str(date.today()),
                "invoiceNumber": "INV-101B",
                "paymentMethod": "Cash",
                "purchaseStatus": "Pending",
                "purchaseItems": [
                    {
                        "product": product.id,
                        "costPrice": "8.00",
                        "quantity": 1,
                        "discount": "0.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("supplier", response.data)

    def test_pending_purchase_patch_to_received_increases_stock(self):
        product = self.create_product(stock=5, sku_number="SK-AAF")
        purchase = Purchase.objects.create(
            supplier=self.supplier,
            invoice_number="INV-101",
            purchase_date=date.today(),
            payment_method="Cash",
            status="Pending",
            subtotal=Decimal("16.00"),
            grand_total=Decimal("16.00"),
            purchased_by=self.user,
        )
        PurchaseItem.objects.create(
            purchase=purchase,
            product=product,
            cost_price=Decimal("8.00"),
            quantity=2,
            discount=Decimal("0.00"),
            line_total=Decimal("16.00"),
        )

        response = self.client.patch(
            f"/api/purchases/{purchase.id}/",
            {"purchaseStatus": "Received"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        purchase.refresh_from_db()
        self.assertEqual(product.stock, 7)
        self.assertEqual(purchase.status, "Received")

    def test_purchase_delete_reverses_stock_for_received_purchase(self):
        product = self.create_product(stock=7, sku_number="SK-AAG")
        purchase = Purchase.objects.create(
            supplier=self.supplier,
            invoice_number="INV-102",
            purchase_date=date.today(),
            payment_method="Cash",
            status="Received",
            subtotal=Decimal("16.00"),
            grand_total=Decimal("16.00"),
            purchased_by=self.user,
        )
        PurchaseItem.objects.create(
            purchase=purchase,
            product=product,
            cost_price=Decimal("8.00"),
            quantity=2,
            discount=Decimal("0.00"),
            line_total=Decimal("16.00"),
        )

        response = self.client.delete(f"/api/purchases/{purchase.id}/delete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.stock, 5)
        self.assertFalse(Purchase.objects.filter(id=purchase.id).exists())

    def test_reports_dashboard_requires_authentication(self):
        response = self.client.get("/api/reports/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reports_dashboard_returns_summary_keys(self):
        self.authenticate()
        self.create_product(stock=3, sku_number="SK-AAH")

        response = self.client.get("/api/reports/dashboard/?date_range=all_time")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summaryData", response.data)
        self.assertIn("topSellingProducts", response.data)
        self.assertIn("restockSuggestions", response.data)
        self.assertIn("monthlySales", response.data)
