from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ScanHistory
from .serializers import ScanHistorySerializer


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def history_list(request):
    """
    GET  /api/history/        — Return user's scan history (newest first, max 50)
    POST /api/history/        — Add or refresh a product in history
    DELETE /api/history/      — Clear all history for user
    """
    user = request.user

    if request.method == 'GET':
        items = ScanHistory.objects.filter(user=user)[:50]
        return Response(ScanHistorySerializer(items, many=True).data)

    if request.method == 'POST':
        product_id = request.data.get('product_id', '').strip()
        name = request.data.get('name', '').strip()
        if not product_id or not name:
            return Response({'error': 'product_id and name are required.'}, status=status.HTTP_400_BAD_REQUEST)

        brand = request.data.get('brand', '')
        image_url = request.data.get('image_url') or None

        # Upsert: update scanned_at if already exists
        obj, created = ScanHistory.objects.update_or_create(
            user=user,
            product_id=product_id,
            defaults={
                'name': name,
                'brand': brand,
                'image_url': image_url,
                'scanned_at': timezone.now(),
            },
        )
        return Response(
            ScanHistorySerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    if request.method == 'DELETE':
        ScanHistory.objects.filter(user=user).delete()
        return Response({'message': 'History cleared.'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def history_detail(request, pk):
    """DELETE /api/history/<id>/ — Remove a single history item."""
    try:
        item = ScanHistory.objects.get(pk=pk, user=request.user)
    except ScanHistory.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
