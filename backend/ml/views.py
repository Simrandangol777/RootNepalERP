from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product, PurchaseItem, SaleItem

from .utils import get_season
from .serializers import (
    RestockPredictionRequestSerializer,
    RestockPredictionResponseSerializer,
)

PEAK_TOURIST_MONTHS = {3, 4, 10, 11}
WEEKEND_DAYS = {"Saturday", "Sunday"}


def _predict_restock(payload):
    from .predict import predict_restock

    return predict_restock(payload)


def _get_recent_quantity_totals(product, window_start):
    quantity_sold = (
        SaleItem.objects.filter(
            product=product,
            sale__status="Completed",
            sale__created_at__gte=window_start,
        ).aggregate(total=Sum("quantity"))["total"]
        or 0
    )
    quantity_purchased = (
        PurchaseItem.objects.filter(
            product=product,
            purchase__status="Received",
            purchase__created_at__gte=window_start,
        ).aggregate(total=Sum("quantity"))["total"]
        or 0
    )
    return float(quantity_sold), float(quantity_purchased)


def _build_model_features(validated_data):
    product = (
        Product.objects.select_related("category", "supplier")
        .filter(id=validated_data["product_id"])
        .first()
    )
    if not product:
        raise ValueError("Invalid product_id. Product not found.")

    now = timezone.localtime()
    month = int(validated_data.get("month") or now.month)
    day_of_week = validated_data.get("day_of_week") or now.strftime("%A")
    season = get_season(month)

    current_stock = int(validated_data.get("current_stock", product.stock))
    reorder_level = int(product.reorder_level or 0)
    lead_time_days = int(
        validated_data.get("lead_time_days")
        or getattr(product.supplier, "lead_time_days", 0)
        or 7
    )
    lead_time_days = max(1, lead_time_days)

    recent_window_start = now - timedelta(days=30)
    sold_last_30_days, purchased_last_30_days = _get_recent_quantity_totals(
        product,
        recent_window_start,
    )

    if validated_data.get("avg_daily_sales") is not None:
        quantity_sold = float(validated_data["avg_daily_sales"]) * 30.0
    else:
        quantity_sold = sold_last_30_days

    quantity_purchased = purchased_last_30_days

    selling_price = float(product.selling_price or product.price or 0)
    cost_price = float(product.cost_price or 0)
    stockout_flag = 1 if current_stock <= 0 else 0
    holiday_flag = int(validated_data.get("holiday_flag", 0))
    is_peak_tourist_season = int(
        validated_data.get(
            "is_peak_tourist_season",
            1 if month in PEAK_TOURIST_MONTHS else 0,
        )
    )
    sales_value = quantity_sold * selling_price
    purchase_value = quantity_purchased * cost_price
    inventory_value = max(current_stock, 0) * selling_price
    profit_margin = (
        (selling_price - cost_price) / selling_price
        if selling_price > 0
        else 0
    )
    stock_gap = reorder_level - current_stock
    sales_to_stock_ratio = quantity_sold / max(current_stock, 1)
    is_weekend = 1 if day_of_week in WEEKEND_DAYS else 0

    return {
        "product_id": int(product.id),
        "category_name": product.category.name if product.category else "Unknown",
        "supplier_name": product.supplier.name if product.supplier else "Unknown",
        "selling_price": selling_price,
        "cost_price": cost_price,
        "current_stock": current_stock,
        "reorder_level": reorder_level,
        "lead_time_days": lead_time_days,
        "quantity_sold": quantity_sold,
        "quantity_purchased": quantity_purchased,
        "stockout_flag": stockout_flag,
        "day_of_week": day_of_week,
        "month": month,
        "season": season,
        "holiday_flag": holiday_flag,
        "is_peak_tourist_season": is_peak_tourist_season,
        "sales_value": sales_value,
        "purchase_value": purchase_value,
        "inventory_value": inventory_value,
        "profit_margin": profit_margin,
        "stock_gap": stock_gap,
        "sales_to_stock_ratio": sales_to_stock_ratio,
        "is_weekend": is_weekend,
    }


def _serializer_field_to_schema(field):
    if hasattr(field, "child") and field.child is not None:
        return {"type": "array", "items": _serializer_field_to_schema(field.child)}

    if field.__class__.__name__ in {"IntegerField"}:
        schema = {"type": "integer"}
    elif field.__class__.__name__ in {"FloatField", "DecimalField"}:
        schema = {"type": "number"}
    elif field.__class__.__name__ in {"BooleanField"}:
        schema = {"type": "boolean"}
    else:
        schema = {"type": "string"}

    min_value = getattr(field, "min_value", None)
    max_value = getattr(field, "max_value", None)
    if min_value is not None:
        schema["minimum"] = min_value
    if max_value is not None:
        schema["maximum"] = max_value

    if getattr(field, "help_text", None):
        schema["description"] = str(field.help_text)

    return schema


def _serializer_to_openapi_schema(serializer_class):
    serializer = serializer_class()
    properties = {
        name: _serializer_field_to_schema(field)
        for name, field in serializer.fields.items()
    }
    required = [
        name for name, field in serializer.fields.items()
        if field.required and not field.read_only
    ]
    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }


class RestockPredictionSchemaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "name": "Restock Prediction Schema",
                "endpoint": "/api/ml/predict/",
                "method": "POST",
                "request": _serializer_to_openapi_schema(RestockPredictionRequestSerializer),
                "response": _serializer_to_openapi_schema(RestockPredictionResponseSerializer),
                "errors": {
                    "400": "Validation error for invalid request payload.",
                    "503": "ML model unavailable.",
                },
            },
            status=status.HTTP_200_OK,
        )


class RestockPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RestockPredictionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            model_features = _build_model_features(serializer.validated_data)
            predicted_qty = max(0, int(round(_predict_restock(model_features))))
        except ValueError as exc:
            return Response(
                {"message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"message": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_data = RestockPredictionResponseSerializer(
            {"suggested_restock_qty": predicted_qty}
        ).data
        return Response(response_data, status=status.HTTP_200_OK)
