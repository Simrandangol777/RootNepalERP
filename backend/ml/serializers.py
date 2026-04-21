from rest_framework import serializers


class RestockPredictionRequestSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    current_stock = serializers.IntegerField(min_value=0, required=False)
    avg_daily_sales = serializers.FloatField(min_value=0, required=False)
    lead_time_days = serializers.IntegerField(min_value=1, required=False)
    month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    day_of_week = serializers.ChoiceField(
        choices=[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ],
        required=False,
    )
    holiday_flag = serializers.IntegerField(min_value=0, max_value=1, required=False)
    is_peak_tourist_season = serializers.IntegerField(min_value=0, max_value=1, required=False)


class RestockPredictionResponseSerializer(serializers.Serializer):
    suggested_restock_qty = serializers.IntegerField(min_value=0)


class PredictionErrorSerializer(serializers.Serializer):
    message = serializers.CharField()
