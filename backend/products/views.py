import requests
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import ai_service

# ── Open Food Facts Configuration ──────────────────────────────────────────────
OFF_BASE = 'https://world.openfoodfacts.org'
OFF_PRODUCT_FIELDS = (
    'code,product_name,brands,nutriscore_grade,image_url,image_front_url,'
    'image_small_url,nutriments,ingredients_text,allergens_tags,'
    'serving_quantity,additives_tags'
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _normalize_product(raw: dict) -> dict:
    """Convert Open Food Facts product dict to our normalized schema."""
    n = raw.get('nutriments', {})
    allergens_tags = raw.get('allergens_tags', [])
    allergens = [t.replace('en:', '').replace('-', ' ') for t in allergens_tags]

    sodium_g = n.get('sodium_100g')
    energy_kcal = n.get('energy-kcal_100g')
    if energy_kcal is None:
        energy_j = n.get('energy_100g')
        energy_kcal = energy_j / 4.184 if energy_j else None

    serving_qty = raw.get('serving_quantity')
    try:
        serving_qty = float(serving_qty) if serving_qty else None
    except (ValueError, TypeError):
        serving_qty = None

    return {
        'id': raw.get('code') or raw.get('_id', ''),
        'name': raw.get('product_name') or raw.get('product_name_en') or 'Unknown Product',
        'brand': raw.get('brands') or '',
        'image_url': raw.get('image_url') or raw.get('image_front_url') or raw.get('image_small_url'),
        'image_small_url': raw.get('image_small_url'),
        'ingredients': raw.get('ingredients_text') or raw.get('ingredients_text_en') or '',
        'allergens': allergens,
        'nutriscore_grade': raw.get('nutriscore_grade') or '',
        'additives_tags': raw.get('additives_tags') or [],
        'serving_quantity': serving_qty,
        'nutrients_100g': {
            'energy_kcal': energy_kcal,
            'proteins': n.get('proteins_100g'),
            'carbohydrates': n.get('carbohydrates_100g'),
            'fat': n.get('fat_100g'),
            'fiber': n.get('fiber_100g'),
            'sugars': n.get('sugars_100g'),
            'sodium': sodium_g * 1000 if sodium_g is not None else None,
            'saturated_fat': n.get('saturated-fat_100g'),
            'fruits_vegetables_nuts': n.get('fruits-vegetables-nuts-estimate-from-ingredients_100g'),
        },
    }


# ── Views ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_products(request):
    """GET /api/products/search/?q=…&page=1&page_size=20"""
    q = request.query_params.get('q', '').strip()
    page = request.query_params.get('page', 1)
    page_size = request.query_params.get('page_size', 20)

    if not q:
        return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resp = requests.get(
            f'{OFF_BASE}/cgi/search.pl',
            params={
                'search_terms': q,
                'json': 1,
                'page': page,
                'page_size': page_size,
                'fields': OFF_PRODUCT_FIELDS,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return Response({'error': f'Failed to reach Open Food Facts: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

    raw_products = data.get('products', [])
    normalized = [_normalize_product(p) for p in raw_products if p.get('product_name')]

    # Fallback: if OFF returned nothing, ask Gemini for Indian products
    if len(normalized) == 0 and ai_service.is_configured():
        normalized = ai_service.search_indian_products(q)

    return Response({
        'count': len(normalized),
        'page': int(page),
        'page_size': int(page_size),
        'products': normalized,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_by_barcode(request, barcode):
    """GET /api/products/barcode/<barcode>/"""
    try:
        resp = requests.get(
            f'{OFF_BASE}/api/v2/product/{barcode}.json',
            params={'fields': OFF_PRODUCT_FIELDS},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return Response({'error': f'Failed to reach Open Food Facts: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

    if data.get('status') != 1 or not data.get('product'):
        return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

    product = _normalize_product({**data['product'], 'code': barcode})
    return Response(product)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_label(request):
    """POST /api/products/analyze-label/"""
    if not ai_service.is_configured():
        return Response(
            {'error': 'Gemini API key not configured. Add GOOGLE_API_KEY to .env'},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

    image_data = request.data.get('image')
    product_name = request.data.get('product_name', '').strip()
    if not image_data:
        return Response({'error': 'No image data provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = ai_service.analyze_label_image(image_data, product_name)
        return Response(result)
    except Exception as e:
        return Response({'error': f'AI analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_barcode(request):
    """POST /api/products/analyze-barcode/"""
    if not ai_service.is_configured():
        return Response({'error': 'Gemini API key not configured.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

    image_data = request.data.get('image')
    if not image_data:
        return Response({'error': 'No image data provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        barcode = ai_service.extract_barcode(image_data)
        if not barcode:
            return Response({'error': 'No barcode detected in the image.'}, status=status.HTTP_404_NOT_FOUND)
        return product_by_barcode(request._request, barcode)
    except Exception as e:
        return Response({'error': f'Barcode analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
