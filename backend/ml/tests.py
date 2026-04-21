from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product, Supplier


class RestockPredictionViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="mluser",
            email="ml@example.com",
            password="MlPass123!",
        )
        self.category = Category.objects.create(
            name="ML Category",
            description="ML test category",
            created_by=self.user,
            updated_by=self.user,
        )
        self.supplier = Supplier.objects.create(
            name="ML Supplier",
            lead_time_days=7,
        )
        self.product = Product.objects.create(
            name="ML Product",
            description="ML test product",
            category=self.category,
            sku_number="ML-SKU-001",
            price=100,
            cost_price=70,
            selling_price=100,
            stock=12,
            reorder_level=6,
            supplier=self.supplier,
            created_by=self.user,
            updated_by=self.user,
        )

    @patch("ml.views._predict_restock", return_value=24)
    def test_predict_returns_suggested_quantity(self, mock_predict):
        self.client.force_authenticate(user=self.user)
        payload = {
            "product_id": self.product.id,
            "current_stock": 5,
            "avg_daily_sales": 3,
            "lead_time_days": 7,
        }

        response = self.client.post("/api/ml/predict/", payload, format="json", secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggested_restock_qty"], 24)
        mock_predict.assert_called_once()
        feature_payload = mock_predict.call_args[0][0]
        self.assertEqual(feature_payload["product_id"], self.product.id)
        self.assertIn("category_name", feature_payload)
        self.assertIn("supplier_name", feature_payload)
        self.assertIn("sales_to_stock_ratio", feature_payload)

    @patch("ml.views._predict_restock", side_effect=RuntimeError("Model unavailable"))
    def test_predict_returns_service_unavailable_when_model_fails(self, mock_predict):
        self.client.force_authenticate(user=self.user)
        payload = {
            "product_id": self.product.id,
            "current_stock": 2,
            "avg_daily_sales": 1,
            "lead_time_days": 7,
        }
        response = self.client.post("/api/ml/predict/", payload, format="json", secure=True)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["message"], "Model unavailable")
        mock_predict.assert_called_once()

    @patch("ml.views._predict_restock", side_effect=ImportError("numpy binary mismatch"))
    def test_predict_returns_service_unavailable_for_dependency_errors(self, mock_predict):
        self.client.force_authenticate(user=self.user)
        payload = {
            "product_id": self.product.id,
            "current_stock": 4,
            "avg_daily_sales": 1,
            "lead_time_days": 7,
        }
        response = self.client.post("/api/ml/predict/", payload, format="json", secure=True)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("numpy", response.data["message"])
        mock_predict.assert_called_once()

    def test_predict_requires_authentication(self):
        response = self.client.post(
            "/api/ml/predict/",
            {
                "product_id": self.product.id,
                "current_stock": 5,
                "avg_daily_sales": 2,
                "lead_time_days": 3,
            },
            format="json",
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_predict_validates_request_payload(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/ml/predict/",
            {"current_stock": 5},
            format="json",
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product_id", response.data)

    def test_predict_returns_bad_request_for_unknown_product_id(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/ml/predict/",
            {"product_id": 999999},
            format="json",
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Product not found", response.data["message"])

    def test_predict_schema_endpoint_returns_request_and_response_shapes(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/ml/predict/schema/", secure=True)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["endpoint"], "/api/ml/predict/")
        self.assertIn("request", response.data)
        self.assertIn("response", response.data)
