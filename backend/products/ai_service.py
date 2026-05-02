"""
AI Service — Gemini Integration
--------------------------------
All Gemini client setup, model calls, and response parsing
live here. Views call these functions and stay thin.
"""

import base64
import json
from decouple import config
from google import genai

from .prompts import (
    LABEL_ANALYSIS_PROMPT,
    LABEL_NAME_HINT_PROVIDED,
    LABEL_NAME_HINT_DETECT,
    BARCODE_EXTRACTION_PROMPT,
    INDIAN_PRODUCT_SEARCH_PROMPT,
)

# ── Configuration ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = config('GOOGLE_API_KEY', default='')
GEMINI_MODEL   = 'gemini-2.5-flash'

_client = None
if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)


def is_configured() -> bool:
    """Check whether the Gemini API key is set."""
    return _client is not None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> str:
    """Strip markdown code fences from Gemini output."""
    text = text.strip()
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
        text = text.split('```')[1].split('```')[0].strip()
    return text


def _decode_image(raw_base64: str) -> bytes:
    """Accept raw or data-URI base64, return bytes."""
    if ';base64,' in raw_base64:
        _, raw_base64 = raw_base64.split(';base64,')
    return base64.b64decode(raw_base64)


# ── Public API ─────────────────────────────────────────────────────────────────

def analyze_label_image(image_b64: str, product_name: str = '') -> dict:
    """
    Send an ingredient-label image to Gemini and return a normalized product dict.
    Raises on failure.
    """
    image_bytes = _decode_image(image_b64)

    name_hint = (
        LABEL_NAME_HINT_PROVIDED.format(product_name=product_name)
        if product_name
        else LABEL_NAME_HINT_DETECT
    )
    prompt = LABEL_ANALYSIS_PROMPT.format(name_hint=name_hint)

    image_part = genai.types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
    response = _client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[prompt, image_part],
    )

    data = json.loads(_extract_json(response.text))

    # Fallback chain: user name → AI name → "Scanned Product"
    final_name = product_name or data.get('name') or 'Scanned Product'

    return {
        'id': f"ai-{hash(response.text.strip()) % 1000000}",
        'name': final_name,
        'brand': data.get('brand', 'Unknown'),
        'image_url': None,
        'ingredients': data.get('ingredients', ''),
        'allergens': data.get('allergens', []),
        'nutriscore_grade': (data.get('nutriscore_grade') or '').lower(),
        'additives_tags': [],
        'serving_quantity': None,
        'nutrients_100g': data.get('nutrients_100g', {}),
    }


def extract_barcode(image_b64: str) -> str | None:
    """
    Send an image to Gemini and return the barcode digits, or None.
    """
    image_bytes = _decode_image(image_b64)

    image_part = genai.types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
    response = _client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[BARCODE_EXTRACTION_PROMPT, image_part],
    )

    barcode = response.text.strip()
    if not barcode or barcode.lower() == 'null' or not barcode.isdigit():
        return None
    return barcode


def search_indian_products(query: str) -> list[dict]:
    """
    Ask Gemini for Indian food products matching *query*.
    Returns a list of product dicts (may be empty).
    """
    try:
        prompt = INDIAN_PRODUCT_SEARCH_PROMPT.format(query=query)
        response = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        results = json.loads(_extract_json(response.text))
        for i, item in enumerate(results):
            if 'id' not in item or item['id'] == 'ai-indian-unique-id':
                item['id'] = f"ai-ind-{hash(item.get('name', '')) % 1000000}-{i}"
        return results
    except Exception:
        return []
