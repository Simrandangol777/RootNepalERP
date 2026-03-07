from django.contrib import admin
from .models import Category, Product, StockAdjustment, Sale, SaleItem, Supplier, Purchase, PurchaseItem

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(StockAdjustment)
admin.site.register(Sale)
admin.site.register(SaleItem)
admin.site.register(Supplier)
admin.site.register(Purchase)
admin.site.register(PurchaseItem)