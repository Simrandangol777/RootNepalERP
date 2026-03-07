from decimal import Decimal
from rest_framework import viewsets, filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from rest_framework import status
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
