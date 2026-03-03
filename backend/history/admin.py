from django.contrib import admin
from .models import ScanHistory


@admin.register(ScanHistory)
class ScanHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'brand', 'product_id', 'scanned_at']
    list_filter = ['scanned_at']
    search_fields = ['user__email', 'name', 'brand', 'product_id']
