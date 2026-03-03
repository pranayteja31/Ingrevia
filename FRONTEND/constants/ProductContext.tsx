import React, { createContext, useContext, useState } from 'react';

export interface NutrientData {
  energy_kcal?: number;
  proteins?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugars?: number;
  sodium?: number;
  saturated_fat?: number;
  fruits_vegetables_nuts?: number;
}

export interface ProductData {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  ingredients?: string;
  allergens?: string[];
  nutrients_100g: NutrientData;
  serving_quantity?: number;
  nutriscoreGrade?: string;
  additives_tags?: string[];
}

interface ProductContextType {
  currentProduct: ProductData | null;
  setCurrentProduct: (p: ProductData | null) => void;
}

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [currentProduct, setCurrentProduct] = useState<ProductData | null>(null);
  return (
    <ProductContext.Provider value={{ currentProduct, setCurrentProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProduct must be used inside ProductProvider');
  return ctx;
}

