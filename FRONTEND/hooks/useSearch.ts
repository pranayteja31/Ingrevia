import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { ProductsAPI, NormalizedProduct } from '../constants/api';

const PAGE_SIZE = 20;

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: NormalizedProduct[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  searched: boolean;
  handleSearch: () => void;
  handleLoadMore: () => void;
  /** Triggers a search with an arbitrary query string (e.g. AI fallback search) */
  searchCustom: (q: string) => void;
  clearSearch: () => void;
}

/**
 * useSearch — encapsulates debounced product search logic.
 *
 * Features:
 *  - 400ms debounce on query changes (fires when query.length >= 2)
 *  - Pagination via handleLoadMore
 *  - Custom query search via searchCustom (used for AI / Indian product fallback)
 *  - clearSearch resets all state
 */
export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedProduct[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchProducts = useCallback(async (q: string, pg: number, append = false) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);

    const { data, error } = await ProductsAPI.search(q, pg, PAGE_SIZE);
    if (error) Alert.alert('Search Error', error);

    const products = data?.products ?? [];
    setResults(append ? (prev) => [...prev, ...products] : products);
    setHasMore(products.length === PAGE_SIZE);
    setSearched(true);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Debounced live search — fires 400ms after query changes
  useEffect(() => {
    if (query.length < 2) {
      if (!query) {
        setResults([]);
        setSearched(false);
      }
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts(query, 1, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, fetchProducts]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts(query, 1, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProducts(query, next, true);
  };

  const searchCustom = (q: string) => {
    setPage(1);
    fetchProducts(q, 1, false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return {
    query, setQuery, results,
    loading, loadingMore, hasMore, searched,
    handleSearch, handleLoadMore, searchCustom, clearSearch,
  };
}
