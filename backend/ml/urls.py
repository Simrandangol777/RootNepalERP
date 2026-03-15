from django.urls import path
from .views import RestockPredictionView

urlpatterns = [
    path("predict/", RestockPredictionView.as_view(), name="predict-restock"),
]