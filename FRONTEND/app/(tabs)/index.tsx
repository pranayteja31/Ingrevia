import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { useAuth } from '../../constants/AuthContext';
import { useProduct } from '../../constants/ProductContext';
import { normalizedToProductData } from '../../utils/productMapper';
import { useSearch } from '../../hooks/useSearch';
import { useHistory } from '../../hooks/useHistory';
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { setCurrentProduct } = useProduct();

  const {
    query, setQuery, results, loading, loadingMore,
    hasMore, searched, handleSearch, handleLoadMore, searchCustom,
  } = useSearch();

  const { history, loading: historyLoading, loadHistory, clearHistory, getProductForEntry } = useHistory();

  // Reload history each time the tab gains focus
  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  const openProduct = (raw: any) => {
    setCurrentProduct(normalizedToProductData(raw));
    router.push('/product-detail' as any);
  };

  const reopenHistoryItem = async (entry: any) => {
    const product = await getProductForEntry(entry);
    setCurrentProduct(product);
    router.push('/product-detail' as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
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

        {/* ── Search ── */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search food product by name or brand…"
          onSubmitEditing={handleSearch}
          style={{ marginBottom: 10 }}
        />

        {query.length > 0 ? (
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <Text style={styles.searchBtnText}>Search Products</Text>
          </TouchableOpacity>
        ) : null}

        {/* ── Loading ── */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>Searching products…</Text>
          </View>
        ) : null}

        {/* ── No results ── */}
        {!loading && searched && results.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={{ fontSize: 40 }}>🔍</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>No results for "{query}"</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
              Try searching specifically for Indian version, or use our AI assistant.
            </Text>
            <TouchableOpacity
              style={[styles.indianBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => searchCustom(`${query} indian product`)}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.indianBtnText, { color: colors.primary }]}>Search Indian Products via AI</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Results ── */}
        {results.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Results for "{query}"
            </Text>
            {results.map((item) => (
              <ProductCard
                key={item.id + item.name}
                product={item}
                onPress={() => openProduct(item)}
              />
            ))}
            {hasMore ? (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load More</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ── Pre-search hero ── */}
        {!searched ? (
          <View style={styles.heroBlock}>
            <EmptyState
              emoji="🔎"
              title="Search Any Food Product"
              subtitle="Search by name or brand to get instant nutritional analysis, allergen info, Nutri-Score ratings, and health risk data—powered by Open Food Facts."
              card
            />
            <View style={{ height: 12 }} />
            <EmptyState
              emoji="📷"
              title="Or Scan a Barcode"
              subtitle="Tap the scan button below to use your camera for instant barcode scanning or ingredient label analysis."
              action={{ label: 'Open Scanner', icon: 'scan', onPress: () => router.push('/scan') }}
              card
            />
          </View>
        ) : null}

        {/* ── Scan History ── */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={[styles.historySectionTitle, { color: colors.textPrimary }]}>Scan History</Text>
            </View>
            {history.length > 0 ? (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={{ color: colors.red, fontSize: 13, fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : history.length === 0 ? (
            <EmptyState
              emoji="📋"
              title="No scans yet"
              subtitle="Scan a product barcode or search for food to populate your history."
              card
            />
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
                  <Text style={[styles.historyName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.historyBrand, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.brand || 'Unknown brand'}
                  </Text>
                  <View style={styles.historyDateRow}>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {formatDate(item.scanned_at)}
                    </Text>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 16, paddingBottom: 20,
  },
  greeting: { fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  searchBtn: { borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  centerState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  stateText: { fontSize: 15, fontWeight: '600', marginTop: 8 },

  indianBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
  },
  indianBtnText: { fontWeight: '700', fontSize: 14 },

  section: { paddingTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },

  loadMoreBtn: {
    borderRadius: 14, height: 46, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginTop: 4, marginBottom: 8,
  },
  loadMoreText: { fontWeight: '700', fontSize: 14 },

  heroBlock: { paddingTop: 8 },

  historySection: { marginTop: 28 },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historySectionTitle: { fontSize: 18, fontWeight: '800' },
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
});
