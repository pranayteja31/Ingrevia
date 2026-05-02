import { useState, useCallback } from 'react';
import { HistoryAPI, HistoryEntry, ProductsAPI } from '../constants/api';
import { normalizedToProductData } from '../utils/productMapper';
import { ProductData } from '../constants/ProductContext';

interface UseHistoryReturn {
  history: HistoryEntry[];
  loading: boolean;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  /** Fetches the full product for a history entry; falls back to minimal data if offline. */
  getProductForEntry: (entry: HistoryEntry) => Promise<ProductData>;
}

/**
 * useHistory — encapsulates all backend scan-history operations.
 *
 * Used by the Home screen to:
 *  - Load history on tab focus
 *  - Clear all history entries
 *  - Re-open a previously scanned product (with live data refresh)
 */
export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await HistoryAPI.list();
    setHistory(data ?? []);
    setLoading(false);
  }, []);

  const clearHistory = async () => {
    await HistoryAPI.clearAll();
    setHistory([]);
  };

  const getProductForEntry = async (entry: HistoryEntry): Promise<ProductData> => {
    const { data } = await ProductsAPI.byBarcode(entry.product_id);
    if (data) return normalizedToProductData(data);
    // Offline fallback — minimal product shape from history record
    return {
      id: entry.product_id,
      name: entry.name,
      brand: entry.brand,
      imageUrl: entry.image_url,
      nutrients_100g: {},
    };
  };

  return { history, loading, loadHistory, clearHistory, getProductForEntry };
}
