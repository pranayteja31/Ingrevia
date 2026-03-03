import { NormalizedProduct } from '../constants/api';
import { ProductData } from '../constants/ProductContext';

/**
 * Maps a backend NormalizedProduct to the in-app ProductData shape.
 * Shared across scan.tsx, (tabs)/index.tsx, and any future screen.
 */
export function normalizedToProductData(p: NormalizedProduct): ProductData {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    imageUrl: p.image_url,
    ingredients: p.ingredients,
    allergens: p.allergens,
    nutrients_100g: p.nutrients_100g,
    serving_quantity: p.serving_quantity,
    nutriscoreGrade: p.nutriscore_grade,
    additives_tags: p.additives_tags,
  };
}
