from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .predict import predict_restock

class RestockPredictionView(APIView):
    def post(self, request):
        data = request.data
        try:
            predicted_qty = predict_restock(data)
        except RuntimeError as exc:
            return Response(
                {"message": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"suggested_restock_qty": predicted_qty})
