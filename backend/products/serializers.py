from decimal import Decimal
import re
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from .models import Category, Product, StockAdjustment, Sale, SaleItem, Supplier, Purchase, PurchaseItem


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)
    updatedDate = serializers.SerializerMethodField()
    updatedBy = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "image",
            "status",
            "updated_at",
            "updatedDate",
            "updatedBy",
            "product_count",
        ]

    def get_updatedDate(self, obj):
        return obj.updated_at.isoformat() if obj.updated_at else ""

    def get_updatedBy(self, obj):
        user = obj.updated_by or obj.created_by
        return user.username if user else ""


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_email = serializers.CharField(source="supplier.email", read_only=True)
    supplier_phone = serializers.CharField(source="supplier.phone", read_only=True)
    supplier_company = serializers.CharField(source="supplier.company", read_only=True)
    supplier_address = serializers.CharField(source="supplier.address", read_only=True)
    supplier_lead_time_days = serializers.IntegerField(source="supplier.lead_time_days", read_only=True)
    supplier_minimum_order_quantity = serializers.IntegerField(source="supplier.minimum_order_quantity", read_only=True)
    supplierEmail = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    supplierPhone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    supplierCompany = serializers.CharField(write_only=True, required=False, allow_blank=True)
    supplierAddress = serializers.CharField(write_only=True, required=False, allow_blank=True)
    supplierLeadTimeDays = serializers.IntegerField(write_only=True, required=False, min_value=0)
    supplierMinimumOrderQuantity = serializers.IntegerField(write_only=True, required=False, min_value=0)
    updatedDate = serializers.SerializerMethodField()
    updatedBy = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "sku_number",
            "price",
            "cost_price",
            "selling_price",
            "stock",
            "reorder_level",
            "supplier",
            "supplier_name",
            "supplier_email",
            "supplier_phone",
            "supplier_company",
            "supplier_address",
            "supplier_lead_time_days",
            "supplier_minimum_order_quantity",
            "supplierEmail",
            "supplierPhone",
            "supplierCompany",
            "supplierAddress",
            "supplierLeadTimeDays",
            "supplierMinimumOrderQuantity",
            "image",
            "tags",
            "status",
            "created_at",
            "updated_at",
            "updatedDate",
            "updatedBy",
        ]
        extra_kwargs = {
            "sku_number": {
                "error_messages": {
                    "unique": "SKU Number already exists.",
                }
            }
        }

    def validate(self, attrs):
        cost = attrs.get("cost_price")
        selling = attrs.get("selling_price", attrs.get("price"))

        if "price" in attrs and "selling_price" not in attrs:
            attrs["selling_price"] = attrs["price"]
        if "selling_price" in attrs and "price" not in attrs:
            attrs["price"] = attrs["selling_price"]

        if cost is not None and selling is not None:
            if cost < 0 or selling < 0:
                raise serializers.ValidationError("Prices must be non-negative.")
            if selling < cost:
                raise serializers.ValidationError({"selling_price": "Selling price cannot be lower than cost price."})

        return attrs

    def get_updatedDate(self, obj):
        return obj.updated_at.isoformat() if obj.updated_at else ""

    def get_updatedBy(self, obj):
        user = obj.updated_by or obj.created_by
        return user.username if user else ""

    def validate_sku_number(self, value):
        normalized = value.strip().upper()
        if not re.fullmatch(r"SK-[A-Z0-9]{3}", normalized):
            raise serializers.ValidationError('SKU must be in "SK-XXX" format.')
        return normalized

    def _pop_supplier_details(self, validated_data):
        return {
            "email": validated_data.pop("supplierEmail", None),
            "phone": validated_data.pop("supplierPhone", None),
            "company": validated_data.pop("supplierCompany", None),
            "address": validated_data.pop("supplierAddress", None),
            "lead_time_days": validated_data.pop("supplierLeadTimeDays", None),
            "minimum_order_quantity": validated_data.pop("supplierMinimumOrderQuantity", None),
        }

    def _apply_supplier_details(self, supplier, details):
        if not supplier:
            return
        updates = {}
        for field, value in details.items():
            if value is None:
                continue
            if isinstance(value, str) and value.strip() == "":
                continue
            updates[field] = value
        if updates:
            for field, value in updates.items():
                setattr(supplier, field, value)
            supplier.save(update_fields=list(updates.keys()))

    def create(self, validated_data):
        supplier_details = self._pop_supplier_details(validated_data)
        product = super().create(validated_data)
        self._apply_supplier_details(product.supplier, supplier_details)
        return product

    def update(self, instance, validated_data):
        supplier_details = self._pop_supplier_details(validated_data)
        product = super().update(instance, validated_data)
        self._apply_supplier_details(product.supplier, supplier_details)
        return product


class InventoryListSerializer(serializers.ModelSerializer):
    currentStock = serializers.IntegerField(source="stock", read_only=True)
    minimumStock = serializers.IntegerField(source="reorder_level", read_only=True)
    variance = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    alert = serializers.SerializerMethodField()
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "image",
            "currentStock",
            "minimumStock",
            "variance",
            "status",
            "alert",
        ]

    def get_variance(self, obj):
        return obj.stock - obj.reorder_level

    def get_status(self, obj):
        if obj.stock == 0:
            return "Out of Stock"
        if obj.stock < obj.reorder_level:
            return "Low Stock"
        return "Healthy"

    def get_alert(self, obj):
        if obj.stock < obj.reorder_level:
            return "Below minimum threshold"
        return None


class StockAdjustmentSerializer(serializers.Serializer):
    productId = serializers.IntegerField()
    adjustmentType = serializers.ChoiceField(choices=["increase", "decrease"])
    quantity = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        from .models import Product

        product_id = attrs["productId"]
        adjustment_type = attrs["adjustmentType"]
        quantity = attrs["quantity"]

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"productId": "Product not found."})

        if adjustment_type == "decrease" and product.stock < quantity:
            raise serializers.ValidationError({
                "quantity": "Cannot decrease more than current stock."
            })

        attrs["product"] = product
        return attrs
    
class SaleItemWriteSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    sellingPrice = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0)

    def validate(self, attrs):
        product_id = attrs["product"]
        quantity = attrs["quantity"]

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product": "Selected product does not exist."})

        if product.stock < quantity:
            raise serializers.ValidationError(
                {"quantity": f"Not enough stock for {product.name}. Available stock is {product.stock}."}
            )

        attrs["product_obj"] = product
        return attrs


class SaleCreateSerializer(serializers.Serializer):
    saleItems = SaleItemWriteSerializer(many=True)
    paymentMethod = serializers.ChoiceField(choices=["Cash", "Card", "Fonpay", "Bank Transfer"])
    customerName = serializers.CharField(required=False, allow_blank=True, default="Customer")

    def validate_saleItems(self, value):
        if not value:
            raise serializers.ValidationError("At least one sale item is required.")
        return value


class SaleItemReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="product.name", read_only=True)
    unit = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = ["id", "name", "quantity", "selling_price", "discount", "line_total", "unit"]

    def get_unit(self, obj):
        return f"Unit Rs. {obj.selling_price}"


class SaleListSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    soldBy = serializers.SerializerMethodField()
    paymentMethod = serializers.CharField(source="payment_method")
    products = SaleItemReadSerializer(source="items", many=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = ["id", "date", "time", "products", "soldBy", "paymentMethod", "total", "status"]

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).strftime("%m/%d/%Y")

    def get_time(self, obj):
        return timezone.localtime(obj.created_at).strftime("%I:%M %p")

    def get_soldBy(self, obj):
        return obj.sold_by.username.upper() if obj.sold_by else "USERNAME"

    def get_total(self, obj):
        return f"Rs. {obj.total}"


class SaleDetailItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["id", "product_name", "quantity", "selling_price", "discount", "line_total"]


class SaleDetailSerializer(serializers.ModelSerializer):
    items = SaleDetailItemSerializer(many=True, read_only=True)
    sold_by_name = serializers.SerializerMethodField()
    payment_method = serializers.CharField()
    invoice_no = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_no",
            "date",
            "time",
            "customer_name",
            "payment_method",
            "subtotal",
            "total_discount",
            "total",
            "status",
            "sold_by_name",
            "items",
        ]

    def get_invoice_no(self, obj):
        return f"INV-{obj.id:04d}"

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).strftime("%m/%d/%Y")

    def get_time(self, obj):
        return timezone.localtime(obj.created_at).strftime("%I:%M %p")

    def get_sold_by_name(self, obj):
        return obj.sold_by.username if obj.sold_by else "USERNAME"    
    
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "company",
            "address",
            "lead_time_days",
            "minimum_order_quantity",
            "is_active",
            "created_at",
        ]


class PurchaseItemWriteSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    costPrice = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, default=0)

    def validate(self, attrs):
        product_id = attrs["product"]

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product": "Selected product does not exist."})

        attrs["product_obj"] = product
        return attrs


class PurchaseCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField(required=False)
    newSupplier = serializers.CharField(required=False, allow_blank=True)
    newSupplierEmail = serializers.EmailField(required=False, allow_blank=True)
    newSupplierPhone = serializers.CharField(required=False, allow_blank=True)
    newSupplierCompany = serializers.CharField(required=False, allow_blank=True)
    newSupplierAddress = serializers.CharField(required=False, allow_blank=True)
    newSupplierLeadTimeDays = serializers.IntegerField(required=False, default=0, min_value=0)
    newSupplierMinimumOrderQuantity = serializers.IntegerField(required=False, default=0, min_value=0)
    purchaseDate = serializers.DateField()
    invoiceNumber = serializers.CharField(max_length=100)
    paymentMethod = serializers.ChoiceField(choices=["Cash", "Bank Transfer", "Credit"])
    purchaseStatus = serializers.ChoiceField(choices=["Pending", "Received", "Cancelled"])
    notes = serializers.CharField(required=False, allow_blank=True)

    shipping = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    otherCharges = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    purchaseItems = PurchaseItemWriteSerializer(many=True)

    def validate_invoiceNumber(self, value):
        if Purchase.objects.filter(invoice_number=value).exists():
            raise serializers.ValidationError("Invoice number already exists.")
        return value

    def validate(self, attrs):
        supplier_id = attrs.get("supplier")
        new_supplier = (attrs.get("newSupplier") or "").strip()

        if not supplier_id and not new_supplier:
            raise serializers.ValidationError("Please select an existing supplier or enter a new supplier.")

        if not attrs.get("purchaseItems"):
            raise serializers.ValidationError("At least one purchase item is required.")

        return attrs


class PurchaseItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseItem
        fields = [
            "id",
            "product",
            "product_name",
            "cost_price",
            "quantity",
            "discount",
            "line_total",
        ]


class PurchaseHistoryItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ["id", "name", "quantity"]


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier = serializers.CharField(source="supplier.name")
    purchasedBy = serializers.SerializerMethodField()
    paymentMethod = serializers.CharField(source="payment_method")
    total = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    products = PurchaseHistoryItemSerializer(source="items", many=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "date",
            "time",
            "invoice_number",
            "supplier",
            "products",
            "purchasedBy",
            "paymentMethod",
            "total",
            "status",
        ]

    def get_purchasedBy(self, obj):
        return obj.purchased_by.username.upper() if obj.purchased_by else "USERNAME"

    def get_total(self, obj):
        return f"Rs. {obj.grand_total}"

    def get_date(self, obj):
        return timezone.localtime(obj.created_at).strftime("%m/%d/%Y")

    def get_time(self, obj):
        return timezone.localtime(obj.created_at).strftime("%I:%M %p")


class PurchaseDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    purchased_by_name = serializers.SerializerMethodField()
    items = PurchaseItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "supplier_name",
            "invoice_number",
            "purchase_date",
            "payment_method",
            "status",
            "notes",
            "shipping",
            "tax",
            "other_charges",
            "subtotal",
            "grand_total",
            "purchased_by_name",
            "items",
            "created_at",
        ]

    def get_purchased_by_name(self, obj):
        return obj.purchased_by.username if obj.purchased_by else "USERNAME"


class PurchaseUpdateSerializer(serializers.Serializer):
    paymentMethod = serializers.ChoiceField(
        choices=["Cash", "Bank Transfer", "Credit"],
        required=False,
    )
    purchaseStatus = serializers.ChoiceField(
        choices=["Pending", "Received", "Cancelled"],
        required=False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to update.")
        return attrs

class SummaryReportSerializer(serializers.Serializer):
    totalRevenue = serializers.FloatField()
    totalPurchaseCost = serializers.FloatField()
    grossProfit = serializers.FloatField()
    totalProducts = serializers.IntegerField()
    healthyStockItems = serializers.IntegerField()
    lowStockItems = serializers.IntegerField()
    outOfStockItems = serializers.IntegerField()
    inventoryValue = serializers.FloatField()
    restockSuggestions = serializers.IntegerField()
    totalPurchaseOrders = serializers.IntegerField()
    averagePurchaseOrderValue = serializers.FloatField()
    dateRange = serializers.CharField()


class TopSellingProductSerializer(serializers.Serializer):
    name = serializers.CharField()
    unitsSold = serializers.IntegerField()
    revenue = serializers.FloatField()


class TopCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    revenue = serializers.FloatField()
    percentage = serializers.FloatField()


class TopSupplierSerializer(serializers.Serializer):
    name = serializers.CharField()
    purchaseAmount = serializers.FloatField()
    orders = serializers.IntegerField()


class LowStockItemSerializer(serializers.Serializer):
    product = serializers.CharField()
    currentStock = serializers.IntegerField()
    reorderLevel = serializers.IntegerField()
    category = serializers.CharField()


class OutOfStockItemSerializer(serializers.Serializer):
    product = serializers.CharField()
    lastStock = serializers.CharField()
    category = serializers.CharField()


class RestockSuggestionSerializer(serializers.Serializer):
    product = serializers.CharField()
    currentStock = serializers.IntegerField()
    reorderLevel = serializers.IntegerField()
    predictedDemand = serializers.IntegerField()
    suggestedQty = serializers.IntegerField()
    leadTime = serializers.CharField()
    priority = serializers.CharField()


class CategoryStockSerializer(serializers.Serializer):
    category = serializers.CharField()
    products = serializers.IntegerField()
    totalStock = serializers.IntegerField()
    value = serializers.FloatField()


class MonthlySalesSerializer(serializers.Serializer):
    month = serializers.CharField()
    sales = serializers.FloatField()


class ReportsDashboardSerializer(serializers.Serializer):
    summaryData = SummaryReportSerializer()
    topSellingProducts = TopSellingProductSerializer(many=True)
    topCategories = TopCategorySerializer(many=True)
    topSuppliers = TopSupplierSerializer(many=True)
    lowStockItems = LowStockItemSerializer(many=True)
    outOfStockItems = OutOfStockItemSerializer(many=True)
    restockSuggestions = RestockSuggestionSerializer(many=True)
    categoryStock = CategoryStockSerializer(many=True)
    monthlySales = MonthlySalesSerializer(many=True)
