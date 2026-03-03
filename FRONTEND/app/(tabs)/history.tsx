import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../constants/ThemeContext';
import { useProduct, mapOpenFoodFactsProduct } from '../../constants/ProductContext';
import { useFocusEffect } from 'expo-router';

interface HistoryEntry {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  scannedAt: string;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setCurrentProduct } = useProduct();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem('nutriscan_history');
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); loadHistory(); }, []));

  const clearHistory = async () => {
    await AsyncStorage.removeItem('nutriscan_history');
    setHistory([]);
  };

  const reopen = async (entry: HistoryEntry) => {
    // Try to fetch fresh data from OFF
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${entry.id}.json`);
      const json = await resp.json();
      if (json.status === 1 && json.product) {
        setCurrentProduct(mapOpenFoodFactsProduct({ ...json.product, code: entry.id }));
        router.push('/product-detail' as any);
        return;
      }
    } catch {}
    // Minimal fallback if no network
    setCurrentProduct({
      id: entry.id,
      name: entry.name,
      brand: entry.brand,
      imageUrl: entry.imageUrl,
      nutrients_100g: {},
    });
    router.push('/product-detail' as any);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Scan History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <Text style={{ color: colors.red || '#EF4444', fontSize: 13, fontWeight: '600' }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 52 }}>📋</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No scans yet</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            Scan a product barcode or search for food to populate your history.
          </Text>
          <TouchableOpacity style={[s.scanBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/scan')}>
            <Ionicons name="scan" size={18} color="#fff" />
            <Text style={s.scanBtnText}>Scan Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => reopen(item)}
              activeOpacity={0.8}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.img} />
              ) : (
                <View style={[s.img, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 24 }}>🛒</Text>
                </View>
              )}
              <View style={s.info}>
                <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[s.brand, { color: colors.textSecondary }]} numberOfLines={1}>{item.brand || 'Unknown brand'}</Text>
                <View style={s.dateRow}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={[s.date, { color: colors.textMuted }]}>{formatDate(item.scannedAt)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  scanBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 12, borderWidth: 1 },
  img: { width: 56, height: 56, borderRadius: 10 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  brand: { fontSize: 12, marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 11 },
});
