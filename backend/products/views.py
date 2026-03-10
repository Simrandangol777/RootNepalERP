from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum, F, Count, FloatField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Category, Product, StockAdjustment, Sale, SaleItem, Supplier, Purchase, PurchaseItem
from .serializers import (CategorySerializer, ProductSerializer, InventoryListSerializer, StockAdjustmentSerializer, SaleCreateSerializer, SaleListSerializer, SaleDetailSerializer, 
    SupplierSerializer, PurchaseCreateSerializer, PurchaseListSerializer, PurchaseDetailSerializer,)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("-updated_at")
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category").all().order_by("-created_at")
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "sku_number"]


class InventoryListView(APIView):
    def get(self, request):
        products = Product.objects.select_related("category").all().order_by("-updated_at")
        serializer = InventoryListSerializer(products, many=True)
        return Response(serializer.data)


class StockAdjustmentView(APIView):
    @transaction.atomic
    def post(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        if serializer.is_valid():
            product = serializer.validated_data["product"]
            adjustment_type = serializer.validated_data["adjustmentType"]
            quantity = serializer.validated_data["quantity"]
            reason = serializer.validated_data.get("reason", "")
            notes = serializer.validated_data.get("notes", "")

            if adjustment_type == "increase":
                product.stock += quantity
            else:
                product.stock -= quantity

            product.save()

            StockAdjustment.objects.create(
                product=product,
                adjustment_type=adjustment_type,
                quantity=quantity,
                reason=reason,
                notes=notes,
            )

            return Response(
                {
                    "message": "Stock adjusted successfully.",
                    "product_id": product.id,
                    "new_stock": product.stock,
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class SalesListCreateView(APIView):
    @transaction.atomic
    def get(self, request):
        sales = Sale.objects.prefetch_related("items__product").select_related("sold_by").order_by("-created_at")
        serializer = SaleListSerializer(sales, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        sale_items = serializer.validated_data["saleItems"]
        payment_method = serializer.validated_data["paymentMethod"]
        customer_name = serializer.validated_data.get("customerName", "Customer")

        subtotal = Decimal("0.00")
        total_discount = Decimal("0.00")

        sale = Sale.objects.create(
            sold_by=request.user if request.user.is_authenticated else None,
            payment_method=payment_method,
            customer_name=customer_name or "Customer",
            subtotal=Decimal("0.00"),
            total_discount=Decimal("0.00"),
            total=Decimal("0.00"),
            status="Completed",
        )

        for item in sale_items:
            product = item["product_obj"]
            selling_price = item["sellingPrice"]
            quantity = item["quantity"]
            discount = item["discount"]

            line_subtotal = Decimal(selling_price) * quantity
            line_total = line_subtotal - Decimal(discount)

            if line_total < 0:
                raise ValidationError({"discount": "Discount cannot exceed line subtotal."})

            SaleItem.objects.create(
                sale=sale,
                product=product,
                selling_price=selling_price,
                quantity=quantity,
                discount=discount,
                line_total=line_total,
            )

            product.stock -= quantity
            product.save()

            StockAdjustment.objects.create(
                product=product,
                adjustment_type="decrease",
                quantity=quantity,
                reason="Sale recorded",
                notes=f"Auto stock deduction from sale #{sale.id}",
            )

            subtotal += line_subtotal
            total_discount += Decimal(discount)

        sale.subtotal = subtotal
        sale.total_discount = total_discount
        sale.total = subtotal - total_discount
        sale.save()

        detail_serializer = SaleDetailSerializer(sale)
        return Response(
            {
                "message": "Sale recorded successfully.",
                "sale": detail_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class SaleDetailView(APIView):
    def get(self, request, pk):
        try:
            sale = Sale.objects.prefetch_related("items__product").select_related("sold_by").get(pk=pk)
        except Sale.DoesNotExist:
            return Response({"message": "Sale not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SaleDetailSerializer(sale)
        return Response(serializer.data)


class SaleDeleteView(APIView):
    @transaction.atomic
    def delete(self, request, pk):
        try:
            sale = Sale.objects.prefetch_related("items__product").get(pk=pk)
        except Sale.DoesNotExist:
            return Response({"message": "Sale not found."}, status=status.HTTP_404_NOT_FOUND)

        # restore stock before delete
        for item in sale.items.all():
            product = item.product
            product.stock += item.quantity
            product.save()

            StockAdjustment.objects.create(
                product=product,
                adjustment_type="increase",
                quantity=item.quantity,
                reason="Sale deleted",
                notes=f"Stock restored from deleted sale #{sale.id}",
            )

        sale.delete()
        return Response({"message": "Sale deleted successfully."}, status=status.HTTP_200_OK)   

class SupplierListCreateView(APIView):
    def get(self, request):
        suppliers = Supplier.objects.filter(is_active=True).order_by("name")
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SupplierSerializer(data=request.data)
        if serializer.is_valid():
            supplier = serializer.save()
            return Response(SupplierSerializer(supplier).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PurchaseListCreateView(APIView):
    @transaction.atomic
    def get(self, request):
        purchases = (
            Purchase.objects.select_related("supplier", "purchased_by")
            .prefetch_related("items__product")
            .order_by("-created_at")
        )
        serializer = PurchaseListSerializer(purchases, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = PurchaseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        supplier_id = data.get("supplier")
        new_supplier_name = (data.get("newSupplier") or "").strip()

        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                return Response({"supplier": "Supplier not found."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            supplier, _ = Supplier.objects.get_or_create(name=new_supplier_name)

        purchase = Purchase.objects.create(
            supplier=supplier,
            invoice_number=data["invoiceNumber"],
            purchase_date=data["purchaseDate"],
            payment_method=data["paymentMethod"],
            status=data["purchaseStatus"],
            notes=data.get("notes", ""),
            shipping=data.get("shipping", Decimal("0.00")),
            tax=data.get("tax", Decimal("0.00")),
            other_charges=data.get("otherCharges", Decimal("0.00")),
            purchased_by=request.user if request.user.is_authenticated else None,
            subtotal=Decimal("0.00"),
            grand_total=Decimal("0.00"),
        )

        subtotal = Decimal("0.00")

        for item in data["purchaseItems"]:
            product = item["product_obj"]
            cost_price = Decimal(item["costPrice"])
            quantity = item["quantity"]
            discount = Decimal(item["discount"])

            line_total = (cost_price * quantity) - discount
            if line_total < 0:
                return Response(
                    {"discount": "Discount cannot exceed line total."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            PurchaseItem.objects.create(
                purchase=purchase,
                product=product,
                cost_price=cost_price,
                quantity=quantity,
                discount=discount,
                line_total=line_total,
            )

            # Increase stock only if status is Received
            if purchase.status == "Received":
                product.stock += quantity
                product.save()

                StockAdjustment.objects.create(
                    product=product,
                    adjustment_type="increase",
                    quantity=quantity,
                    reason="Purchase received",
                    notes=f"Auto stock increase from purchase {purchase.invoice_number}",
                )

            subtotal += line_total

        extra = Decimal(purchase.shipping) + Decimal(purchase.tax) + Decimal(purchase.other_charges)
        purchase.subtotal = subtotal
        purchase.grand_total = subtotal + extra
        purchase.save()

        detail_serializer = PurchaseDetailSerializer(purchase)
        return Response(
            {
                "message": "Purchase recorded successfully.",
                "purchase": detail_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class PurchaseDetailView(APIView):
    def get(self, request, pk):
        try:
            purchase = (
                Purchase.objects.select_related("supplier", "purchased_by")
                .prefetch_related("items__product")
                .get(pk=pk)
            )
        except Purchase.DoesNotExist:
            return Response({"message": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PurchaseDetailSerializer(purchase)
        return Response(serializer.data)


class PurchaseDeleteView(APIView):
    @transaction.atomic
    def delete(self, request, pk):
        try:
            purchase = Purchase.objects.prefetch_related("items__product").get(pk=pk)
        except Purchase.DoesNotExist:
            return Response({"message": "Purchase not found."}, status=status.HTTP_404_NOT_FOUND)

        # Reverse stock only if this purchase had already increased stock
        if purchase.status == "Received":
            for item in purchase.items.all():
                product = item.product
                if product.stock < item.quantity:
                    return Response(
                        {
                            "message": f"Cannot delete purchase because stock for {product.name} is already lower than the received quantity."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                product.stock -= item.quantity
                product.save()

                StockAdjustment.objects.create(
                    product=product,
                    adjustment_type="decrease",
                    quantity=item.quantity,
                    reason="Purchase deleted",
                    notes=f"Stock reversed from deleted purchase {purchase.invoice_number}",
                )

        purchase.delete()
        return Response({"message": "Purchase deleted successfully."}, status=status.HTTP_200_OK)    

class ReportsDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_start_datetime(self, date_range):
        now = timezone.now()
        if date_range == "this_week":
            start_of_week = now - timedelta(days=now.weekday())
            return start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        if date_range == "this_month":
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return None

    def _format_last_stock_label(self, dt):
        if not dt:
            return "No stock history"

        delta = timezone.now() - dt
        if delta.days <= 0:
            hours = delta.seconds // 3600
            if hours <= 0:
                return "Today"
            return "1 hour ago" if hours == 1 else f"{hours} hours ago"
        if delta.days == 1:
            return "1 day ago"
        if delta.days < 7:
            return f"{delta.days} days ago"

        weeks = delta.days // 7
        if weeks < 5:
            return "1 week ago" if weeks == 1 else f"{weeks} weeks ago"

        months = max(1, delta.days // 30)
        return "1 month ago" if months == 1 else f"{months} months ago"

    def get(self, request):
        date_range = request.query_params.get("date_range", "all_time")
        allowed_ranges = {"all_time", "this_month", "this_week"}
        if date_range not in allowed_ranges:
            date_range = "all_time"

        start_at = self._get_start_datetime(date_range)

        sales_qs = Sale.objects.filter(status="Completed")
        purchases_qs = Purchase.objects.filter(status="Received")
        if start_at:
            sales_qs = sales_qs.filter(created_at__gte=start_at)
            purchases_qs = purchases_qs.filter(purchase_date__gte=start_at.date())

        # ---------- SUMMARY ----------
        total_revenue = sales_qs.aggregate(total=Sum("total"))["total"] or 0
        purchase_summary = purchases_qs.aggregate(total=Sum("grand_total"), orders=Count("id"))
        total_purchase_cost = purchase_summary["total"] or 0
        total_purchase_orders = purchase_summary["orders"] or 0

        gross_profit = float(total_revenue) - float(total_purchase_cost)
        average_purchase_order_value = (
            float(total_purchase_cost) / total_purchase_orders if total_purchase_orders else 0
        )

        total_products = Product.objects.count()
        low_stock_count = Product.objects.filter(stock__gt=0, stock__lte=F("reorder_level")).count()
        out_of_stock_count = Product.objects.filter(stock=0).count()
        healthy_stock_count = max(total_products - low_stock_count - out_of_stock_count, 0)

        inventory_value_expr = ExpressionWrapper(
            F("stock") * F("price"),
            output_field=FloatField()
        )
        inventory_value = Product.objects.aggregate(
            total=Sum(inventory_value_expr)
        )["total"] or 0

        # ---------- TOP SELLING PRODUCTS ----------
        top_selling_products_qs = (
            SaleItem.objects.filter(sale__in=sales_qs)
            .values("product__name")
            .annotate(
                units_sold=Sum("quantity"),
                revenue=Sum("line_total")
            )
            .order_by("-units_sold")[:5]
        )

        top_selling_products = [
            {
                "name": item["product__name"],
                "unitsSold": item["units_sold"] or 0,
                "revenue": float(item["revenue"] or 0),
            }
            for item in top_selling_products_qs
        ]

        # ---------- TOP CATEGORIES ----------
        top_categories_qs = (
            SaleItem.objects.filter(sale__in=sales_qs)
            .values("product__category__name")
            .annotate(revenue=Sum("line_total"))
            .order_by("-revenue")
        )

        total_category_revenue = sum(float(x["revenue"] or 0) for x in top_categories_qs)

        top_categories = [
            {
                "name": item["product__category__name"] or "Uncategorized",
                "revenue": float(item["revenue"] or 0),
                "percentage": round(
                    (float(item["revenue"] or 0) / total_category_revenue) * 100, 2
                ) if total_category_revenue > 0 else 0,
            }
            for item in top_categories_qs[:5]
        ]

        # ---------- TOP SUPPLIERS ----------
        top_suppliers_qs = (
            purchases_qs
            .values("supplier__name")
            .annotate(
                purchaseAmount=Sum("grand_total"),
                orders=Count("id")
            )
            .order_by("-purchaseAmount")[:5]
        )

        top_suppliers = [
            {
                "name": item["supplier__name"],
                "purchaseAmount": float(item["purchaseAmount"] or 0),
                "orders": item["orders"] or 0,
            }
            for item in top_suppliers_qs
        ]

        # ---------- LOW STOCK ----------
        low_stock_items_qs = Product.objects.filter(
            stock__gt=0,
            stock__lte=F("reorder_level")
        ).select_related("category")[:10]

        low_stock_items = [
            {
                "product": item.name,
                "currentStock": item.stock,
                "reorderLevel": item.reorder_level,
                "category": item.category.name if item.category else "Uncategorized",
            }
            for item in low_stock_items_qs
        ]

        # ---------- OUT OF STOCK ----------
        out_of_stock_items_qs = Product.objects.filter(stock=0).select_related("category")[:10]

        out_of_stock_items = [
            {
                "product": item.name,
                "lastStock": self._format_last_stock_label(
                    item.stock_adjustments.order_by("-created_at").values_list("created_at", flat=True).first()
                ),
                "category": item.category.name if item.category else "Uncategorized",
            }
            for item in out_of_stock_items_qs
        ]

        # ---------- CATEGORY STOCK ----------
        category_stock_qs = (
            Product.objects.values("category__name")
            .annotate(
                products=Count("id"),
                totalStock=Sum("stock"),
                value=Sum(
                    ExpressionWrapper(F("stock") * F("price"), output_field=FloatField())
                )
            )
            .order_by("-value")
        )

        category_stock = [
            {
                "category": item["category__name"] or "Uncategorized",
                "products": item["products"] or 0,
                "totalStock": item["totalStock"] or 0,
                "value": float(item["value"] or 0),
            }
            for item in category_stock_qs
        ]

        # ---------- MONTHLY SALES ----------
        monthly_sales_qs = (
            sales_qs
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(sales=Sum("total"))
            .order_by("month")
        )

        monthly_sales = [
            {
                "month": item["month"].strftime("%b %Y") if item["month"] else "Unknown",
                "sales": float(item["sales"] or 0),
            }
            for item in monthly_sales_qs
        ]

        # ---------- SMART RESTOCK ----------
        # Temporary rule-based logic until ML model is plugged in
        restock_products_qs = Product.objects.filter(
            stock__lte=F("reorder_level")
        ).select_related("category")[:10]

        restock_suggestions = []
        for product in restock_products_qs:
            predicted_demand = max(product.reorder_level * 2, product.reorder_level + 10)
            suggested_qty = max(predicted_demand - product.stock, 0)

            priority = "Medium"
            if product.stock == 0 or product.stock <= max(1, product.reorder_level * 0.3):
                priority = "High"
            elif product.stock > product.reorder_level:
                priority = "Low"

            restock_suggestions.append({
                "product": product.name,
                "currentStock": product.stock,
                "reorderLevel": product.reorder_level,
                "predictedDemand": int(predicted_demand),
                "suggestedQty": int(suggested_qty),
                "leadTime": "7 days",
                "priority": priority,
            })

        summary_data = {
            "totalRevenue": float(total_revenue),
            "totalPurchaseCost": float(total_purchase_cost),
            "grossProfit": float(gross_profit),
            "totalProducts": total_products,
            "healthyStockItems": healthy_stock_count,
            "lowStockItems": low_stock_count,
            "outOfStockItems": out_of_stock_count,
            "inventoryValue": float(inventory_value),
            "restockSuggestions": len(restock_suggestions),
            "totalPurchaseOrders": total_purchase_orders,
            "averagePurchaseOrderValue": round(average_purchase_order_value, 2),
            "dateRange": date_range,
        }

        response_data = {
            "summaryData": summary_data,
            "topSellingProducts": top_selling_products,
            "topCategories": top_categories,
            "topSuppliers": top_suppliers,
            "lowStockItems": low_stock_items,
            "outOfStockItems": out_of_stock_items,
            "restockSuggestions": restock_suggestions,
            "categoryStock": category_stock,
            "monthlySales": monthly_sales,
        }

        return Response(response_data)
