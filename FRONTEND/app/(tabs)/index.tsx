import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { useAuth } from '../../constants/AuthContext';
import { useProduct } from '../../constants/ProductContext';
import { ProductsAPI, HistoryAPI, NormalizedProduct, HistoryEntry } from '../../constants/api';
import { normalizedToProductData } from '../../utils/productMapper';

const PAGE_SIZE = 20;
const NS_COLORS: Record<string, string> = { A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63E11' };


export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { setCurrentProduct } = useProduct();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedProduct[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Reload history each time the tab is focused
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await HistoryAPI.list();
    setHistory(data ?? []);
    setHistoryLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const clearHistory = async () => {
    await HistoryAPI.clearAll();
    setHistory([]);
  };

  const reopenHistoryItem = async (entry: HistoryEntry) => {
    const { data } = await ProductsAPI.byBarcode(entry.product_id);
    if (data) {
      setCurrentProduct(normalizedToProductData(data));
    } else {
      setCurrentProduct({
        id: entry.product_id,
        name: entry.name,
        brand: entry.brand,
        imageUrl: entry.image_url,
        nutrients_100g: {},
      });
    }
    router.push('/product-detail' as any);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Search logic
  const fetchProducts = useCallback(async (q: string, pg: number, append = false) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (append) setLoadingMore(true); else setLoading(true);
    console.log(`Frontend: Fetching products for '${q}', page ${pg}`);
    const { data, error } = await ProductsAPI.search(q, pg, PAGE_SIZE);
    
    if (error) {
      Alert.alert('Search Error', error);
    }

    const products = data?.products ?? [];
    setResults(append ? (prev) => [...prev, ...products] : products);
    setHasMore((products.length ?? 0) === PAGE_SIZE);
    setSearched(true);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // Live search effect
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
  }, [query]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts(query, 1, false);
  };

  const handleIndianSearch = () => {
    setPage(1);
    fetchProducts(`${query} indian product`, 1, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProducts(query, next, true);
  };

  const openProduct = (raw: NormalizedProduct) => {
    setCurrentProduct(normalizedToProductData(raw));
    router.push('/product-detail' as any);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search Box */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search food product by name or brand…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {query.length > 0 && (
          <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search Products</Text>
          </TouchableOpacity>
        )}

        {/* Search Results */}
        {loading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>Searching products…</Text>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={styles.centerState}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>No results for "{query}"</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
              Try searching specifically for Indian version, or use our AI assistant.
            </Text>
            <TouchableOpacity 
              style={[styles.indianSearchBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={handleIndianSearch}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.indianSearchText, { color: colors.primary }]}>Search Indian Products via AI</Text>
            </TouchableOpacity>
          </View>
        )}

        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Results for "{query}"
            </Text>
            {results.map((item) => {
              const ns = item.nutriscore_grade?.toUpperCase();
              const nsColor = NS_COLORS[ns ?? ''] ?? '#555';
              return (
                <TouchableOpacity
                  key={item.id + item.name}
                  style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openProduct(item)}
                  activeOpacity={0.8}
                >
                  {item.image_small_url || item.image_url ? (
                    <Image source={{ uri: item.image_small_url || item.image_url }} style={styles.resultImg} />
                  ) : (
                    <View style={[styles.resultImg, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 28 }}>🛒</Text>
                    </View>
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.resultBrand, { color: colors.textSecondary }]} numberOfLines={1}>{item.brand || 'Unknown brand'}</Text>
                      {item.nutrients_100g?.energy_kcal != null && (
                        <Text style={[styles.resultBrand, { color: colors.primary, fontWeight: '700' }]}>
                          • {Math.round(item.nutrients_100g.energy_kcal)} kcal
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.resultRight}>
                    {ns ? (
                      <View style={[styles.nsBadge, { backgroundColor: nsColor }]}>
                        <Text style={styles.nsBadgeText}>{ns}</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasMore && (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty search hero */}
        {!searched && (
          <View style={styles.emptyHero}>
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.heroEmoji}>🔎</Text>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Search Any Food Product</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Search by name or brand to get instant nutritional analysis, allergen info, Nutri-Score ratings, and health risk data—powered by Open Food Facts.
              </Text>
            </View>

            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={styles.heroEmoji}>📷</Text>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Or Scan a Barcode</Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Tap the scan button below to use your camera for instant barcode scanning or ingredient label analysis.
              </Text>
              <TouchableOpacity
                style={[styles.scanCta, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/scan')}
              >
                <Ionicons name="scan" size={16} color="#fff" />
                <Text style={styles.scanCtaText}>Open Scanner</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Scan History Section ─── */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.historySectionTitle, { color: colors.textPrimary }]}>Scan History</Text>
            </View>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={{ color: colors.red || '#EF4444', fontSize: 13, fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : history.length === 0 ? (
            <View style={[styles.historyEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
              <Text style={[styles.historyEmptyTitle, { color: colors.textPrimary }]}>No scans yet</Text>
              <Text style={[styles.historyEmptySub, { color: colors.textSecondary }]}>
                Scan a product barcode or search for food to populate your history.
              </Text>
            </View>
          ) : (
            history.map((item, index) => (
              <TouchableOpacity
                key={`${item.product_id}-${index}`}
                style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => reopenHistoryItem(item)}
                activeOpacity={0.8}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.historyImg} />
                ) : (
                  <View style={[styles.historyImg, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 24 }}>🛒</Text>
                  </View>
                )}
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.historyBrand, { color: colors.textSecondary }]} numberOfLines={1}>{item.brand || 'Unknown brand'}</Text>
                  <View style={styles.historyDateRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>{formatDate(item.scanned_at)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 20 },
  greeting: { fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, paddingHorizontal: 14, height: 50,
    borderWidth: 1.5, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchBtn: { borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  centerState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  stateText: { fontSize: 15, fontWeight: '600', marginTop: 8 },

  section: { paddingTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    padding: 12, marginBottom: 10, borderWidth: 1, gap: 12,
  },
  resultImg: { width: 56, height: 56, borderRadius: 10 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  resultBrand: { fontSize: 12 },
  resultRight: { alignItems: 'center', gap: 4 },
  nsBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nsBadgeText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  loadMoreBtn: {
    borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 4, marginBottom: 8,
  },
  loadMoreText: { fontWeight: '700', fontSize: 14 },

  emptyHero: { paddingTop: 8 },
  heroCard: { borderRadius: 20, padding: 22, borderWidth: 1 },
  heroEmoji: { fontSize: 36, marginBottom: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  heroSub: { fontSize: 13, lineHeight: 20 },
  scanCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start',
  },
  scanCtaText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  historySection: { marginTop: 28 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historySectionTitle: { fontSize: 18, fontWeight: '800' },
  historyEmpty: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center' },
  historyEmptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  historyEmptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 10,
  },
  historyImg: { width: 56, height: 56, borderRadius: 10 },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  historyBrand: { fontSize: 12, marginBottom: 4 },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyDate: { fontSize: 11 },
  indianSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14,
    borderWidth: 1, borderStyle: 'dashed',
  },
  indianSearchText: { fontWeight: '700', fontSize: 14 },
});
