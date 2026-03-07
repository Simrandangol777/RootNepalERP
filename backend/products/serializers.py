from decimal import Decimal
from django.contrib.auth.models import User
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
        return obj.updated_at.strftime("%m/%d/%Y") if obj.updated_at else ""

    def get_updatedBy(self, obj):
        return "username"


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

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
            "stock",
            "reorder_level",
            "supplier",
            "image",
            "tags",
            "status",
            "created_at",
            "updated_at",
        ]


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
        return obj.created_at.strftime("%m/%d/%Y")

    def get_time(self, obj):
        return obj.created_at.strftime("%I:%M %p")

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
        return obj.created_at.strftime("%m/%d/%Y")

    def get_time(self, obj):
        return obj.created_at.strftime("%I:%M %p")

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


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier = serializers.CharField(source="supplier.name")
    purchasedBy = serializers.SerializerMethodField()
    paymentMethod = serializers.CharField(source="payment_method")
    total = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            "id",
            "date",
            "time",
            "invoice_number",
            "supplier",
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
        return obj.created_at.strftime("%m/%d/%Y")

    def get_time(self, obj):
        return obj.created_at.strftime("%I:%M %p")


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