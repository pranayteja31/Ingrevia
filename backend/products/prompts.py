"""
AI Prompt Templates
-------------------
All prompts sent to Gemini live here so they can be tuned
without touching view or service logic.
"""

LABEL_ANALYSIS_PROMPT = """\
Analyze this food product ingredient label and provide the following details in valid JSON format:
{{
    "name": "Product Name",
    "brand": "Brand Name",
    "ingredients": "Full comma-separated ingredient list string",
    "allergens": ["allergen1", "allergen2"],
    "nutriscore_grade": "a|b|c|d|e",
    "nutrients_100g": {{
        "energy_kcal": 0,
        "proteins": 0,
        "carbohydrates": 0,
        "fat": 0,
        "fiber": 0,
        "sugars": 0,
        "sodium": 0,
        "saturated_fat": 0
    }}
}}
{name_hint}
Provide only the JSON object, no other text. If a value is missing or unclear, use null for numbers or empty strings for text.\
"""

LABEL_NAME_HINT_PROVIDED = '\nThe user has identified this product as: "{product_name}". Use this as the product name.'
LABEL_NAME_HINT_DETECT   = '\nTry to identify the product name from the image. If you cannot determine it, use "Scanned Product" as the name.'

BARCODE_EXTRACTION_PROMPT = (
    "Look at this image and extract the numerical barcode (EAN-13 or UPC). "
    "Provide only the digits, no other text. If no barcode is visible, return 'null'."
)

INDIAN_PRODUCT_SEARCH_PROMPT = """\
Search for popular Indian food products matching the query: '{query}'.
Provide a list of up to 5 matching products in valid JSON format:
[
  {{
    "id": "ai-indian-unique-id",
    "name": "Product Name",
    "brand": "Brand Name",
    "ingredients": "ingredient list",
    "allergens": ["allergen1"],
    "nutriscore_grade": "a|b|c|d|e",
    "nutrients_100g": {{
      "energy_kcal": 0,
      "proteins": 0,
      "carbohydrates": 0,
      "fat": 0,
      "fiber": 0,
      "sugars": 0,
      "sodium": 0
    }}
  }}
]
Provide ONLY the JSON array. Use null for missing numbers. Ensure Indian brand names are used where likely (e.g. Amul, Haldiram, Britannia, Maggi India).\
"""
