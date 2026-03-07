from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (CategoryViewSet, ProductViewSet, InventoryListView, StockAdjustmentView, SalesListCreateView, SaleDetailView, SaleDeleteView,
    SupplierListCreateView, PurchaseListCreateView, PurchaseDetailView, PurchaseDeleteView,)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"products", ProductViewSet, basename="products")

urlpatterns = [
    path("", include(router.urls)),
    path("inventory/", InventoryListView.as_view(), name="inventory-list"),
    path("inventory/adjust/", StockAdjustmentView.as_view(), name="inventory-adjust"),

    path("sales/", SalesListCreateView.as_view(), name="sales-list-create"),
    path("sales/<int:pk>/", SaleDetailView.as_view(), name="sale-detail"),
    path("sales/<int:pk>/delete/", SaleDeleteView.as_view(), name="sale-delete"),

    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list-create"),

    path("purchases/", PurchaseListCreateView.as_view(), name="purchase-list-create"),
    path("purchases/<int:pk>/", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("purchases/<int:pk>/delete/", PurchaseDeleteView.as_view(), name="purchase-delete"),
]