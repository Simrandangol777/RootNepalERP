from django.urls import path
from .views import RestockPredictionSchemaView, RestockPredictionView

urlpatterns = [
    path("predict/", RestockPredictionView.as_view(), name="predict-restock"),
    path("predict/schema/", RestockPredictionSchemaView.as_view(), name="predict-restock-schema"),
]
