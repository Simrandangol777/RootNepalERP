from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase


class RestockPredictionViewTests(APITestCase):
    @patch("ml.views.predict_restock", return_value=24)
    def test_predict_returns_suggested_quantity(self, mock_predict):
        payload = {
            "current_stock": 5,
            "avg_daily_sales": 3,
            "lead_time_days": 7,
        }

        response = self.client.post("/api/ml/predict/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggested_restock_qty"], 24)
        mock_predict.assert_called_once_with(payload)

    @patch("ml.views.predict_restock", side_effect=RuntimeError("Model unavailable"))
    def test_predict_returns_service_unavailable_when_model_fails(self, mock_predict):
        response = self.client.post("/api/ml/predict/", {"current_stock": 2}, format="json")

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["message"], "Model unavailable")
        mock_predict.assert_called_once()
