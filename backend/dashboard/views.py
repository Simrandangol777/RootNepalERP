from datetime import date, timedelta
import calendar
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, F, FloatField, ExpressionWrapper
from django.db.models.functions import TruncMonth
from django.utils import timezone
from products.models import Product, Sale, SaleItem, Purchase, PurchaseItem


class DashboardOverviewView(APIView):

    def _subtract_months(self, base_date, months):
        year = base_date.year
        month = base_date.month - months
        while month <= 0:
            month += 12
            year -= 1
        day = min(base_date.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)

    def _get_start_date(self, date_range):
        today = timezone.now().date()
        if date_range == "today":
            return today
        if date_range == "this_week":
            return today - timedelta(days=today.weekday())
        if date_range == "last_7_days":
            return today - timedelta(days=6)
        if date_range == "this_month":
            return today.replace(day=1)
        if date_range == "last_30_days":
            return today - timedelta(days=29)
        if date_range == "last_6_months":
            return self._subtract_months(today, 6)
        return None

    def get(self, request):
        now = timezone.now()
        date_range = request.query_params.get("date_range", "this_month")
        start_date = self._get_start_date(date_range)

        # KPI CALCULATIONS

        sales_qs = Sale.objects.filter(status="Completed")
        purchases_qs = Purchase.objects.filter(status="Received")
        if start_date:
            sales_qs = sales_qs.filter(created_at__date__gte=start_date)
            purchases_qs = purchases_qs.filter(purchase_date__gte=start_date)

        revenue = (
            SaleItem.objects.filter(sale__in=sales_qs)
            .aggregate(total=Sum("line_total"))["total"]
            or 0
        )

        purchases = (
            PurchaseItem.objects.filter(purchase__in=purchases_qs)
            .aggregate(total=Sum("line_total"))["total"]
            or 0
        )

        profit = revenue - purchases

        inventory_value = Product.objects.aggregate(
            total=Sum(
                ExpressionWrapper(F("stock") * F("price"), output_field=FloatField())
            )
        )["total"] or 0

        low_stock = Product.objects.filter(
            stock__lte=F("reorder_level"),
            stock__gt=0
        ).count()

        out_of_stock = Product.objects.filter(stock=0).count()

        # SALES VS PURCHASE TREND (last 6 months)
        months = []
        for offset in range(5, -1, -1):
            month = now.month - offset
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            months.append(date(year, month, 1))

        trend_map = {
            month_start: {"sales": 0, "purchases": 0}
            for month_start in months
        }

        sales_by_month = (
            sales_qs
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("total"))
        )
        for item in sales_by_month:
            month_start = item["month"].date() if item["month"] else None
            if month_start in trend_map:
                trend_map[month_start]["sales"] = float(item["total"] or 0)

        purchases_by_month = (
            purchases_qs
            .annotate(month=TruncMonth("purchase_date"))
            .values("month")
            .annotate(total=Sum("grand_total"))
        )
        for item in purchases_by_month:
            if not item["month"]:
                continue
            month_start = item["month"] if isinstance(item["month"], date) else item["month"].date()
            if month_start in trend_map:
                trend_map[month_start]["purchases"] = float(item["total"] or 0)

        sales_trend = [
            {
                "month": month_start.strftime("%b"),
                "sales": trend_map[month_start]["sales"],
                "purchases": trend_map[month_start]["purchases"],
            }
            for month_start in months
        ]

        # STOCK STATUS
        healthy = Product.objects.filter(stock__gt=F("reorder_level")).count()

        stock_status = [
            {"name": "Healthy", "value": healthy},
            {"name": "Low Stock", "value": low_stock},
            {"name": "Out of Stock", "value": out_of_stock},
        ]

        # TOP PRODUCTS
        top_products = (
            SaleItem.objects.filter(sale__in=sales_qs)
            .values("product__name")
            .annotate(sales=Sum("quantity"))
            .order_by("-sales")[:5]
        )

        top_products_data = [
            {"name": item["product__name"], "sales": item["sales"]}
            for item in top_products
        ]

        # PAYMENT DISTRIBUTION
        payment_distribution = []
        payment_qs = (
            sales_qs
            .values("payment_method")
            .annotate(total=Sum("total"))
            .order_by("-total")
        )
        for item in payment_qs:
            payment_distribution.append({
                "name": item["payment_method"],
                "value": float(item["total"] or 0),
            })

        # RESTOCK ALERTS
        restock_items = Product.objects.filter(
            stock__lte=F("reorder_level")
        )

        restock_alerts = []

        for item in restock_items:
            reorder = item.reorder_level
            suggested = reorder * 2

            restock_alerts.append({
                "product": item.name,
                "stock": item.stock,
                "reorder": reorder,
                "suggested": suggested
            })

        # ACTIVITY FEED
        activities = []
        recent_sales = sales_qs.order_by("-created_at")[:5]
        recent_purchases = purchases_qs.order_by("-created_at")[:5]

        activity_events = []
        for sale in recent_sales:
            activity_events.append((sale.created_at, f"Sale INV-{sale.id:04d} completed"))
        for purchase in recent_purchases:
            activity_events.append((purchase.created_at, f"Purchase {purchase.invoice_number} recorded"))

        activity_events.sort(key=lambda x: x[0], reverse=True)
        activities = [text for _, text in activity_events[:5]]

        data = {
            "kpis": {
                "revenue": revenue,
                "purchases": purchases,
                "profit": profit,
                "inventory_value": inventory_value,
                "low_stock": low_stock,
                "out_of_stock": out_of_stock
            },
            "sales_trend": sales_trend,
            "inventory_trend": [],
            "payment_distribution": payment_distribution,
            "top_products": top_products_data,
            "stock_status": stock_status,
            "restock_alerts": restock_alerts,
            "activities": activities,
        }

        return Response(data)
