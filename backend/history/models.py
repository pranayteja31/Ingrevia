from django.db import models
from django.conf import settings


class ScanHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scan_history',
    )
    product_id = models.CharField(max_length=100)
    name = models.CharField(max_length=500)
    brand = models.CharField(max_length=300, blank=True, default='')
    image_url = models.URLField(blank=True, null=True, max_length=1000)
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scanned_at']
        # One entry per product per user (enforce uniqueness, refreshing on re-scan)
        unique_together = [('user', 'product_id')]

    def __str__(self):
        return f"{self.user.email} — {self.name}"
