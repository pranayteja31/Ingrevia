from rest_framework import serializers
from .models import ScanHistory


class ScanHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanHistory
        fields = ['id', 'product_id', 'name', 'brand', 'image_url', 'scanned_at']
        read_only_fields = ['id', 'scanned_at']
