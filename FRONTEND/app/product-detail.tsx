import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, ProductData, NutrientData } from '../constants/ProductContext';
import { HistoryAPI } from '../constants/api';

const { width } = Dimensions.get('window');

// ─── History Helper (sends to backend) ───────────────────────────────────────
function addToHistory(product: ProductData) {
  HistoryAPI.add({
    product_id: product.id,
    name: product.name,
    brand: product.brand || '',
    image_url: product.imageUrl,
  }).catch(() => {});
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[sc.card, style]}>{children}</View>;
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={sc.sectionHeader}>
      <Text style={sc.sectionIcon}>{icon}</Text>
      <Text style={sc.sectionTitle}>{title}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#181818', borderRadius: 20,
    padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#252525',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const router = useRouter();
  const { currentProduct } = useProduct();
  const product = currentProduct;



  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (product) {
      addToHistory(product);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [product?.id]);

  if (!product) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.emptyState}>
          <Text style={{ fontSize: 48 }}>📦</Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>No product loaded</Text>
          <TouchableOpacity style={s.backBtnLg} onPress={() => router.back()}>
            <Text style={{ color: '#f86c1b', fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const n = product.nutrients_100g || {};

  const macros = [
    { label: 'Calories', unit: 'kcal', val100: n.energy_kcal },
    { label: 'Protein', unit: 'g', val100: n.proteins },
    { label: 'Carbs', unit: 'g', val100: n.carbohydrates },
    { label: 'Fat', unit: 'g', val100: n.fat },
    { label: 'Fibre', unit: 'g', val100: n.fiber },
    { label: 'Sugars', unit: 'g', val100: n.sugars },
    { label: 'Sodium', unit: 'mg', val100: n.sodium },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Back button */}
      <TouchableOpacity style={[s.backBtn, { zIndex: 10 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Header */}
        <View style={s.productHeader}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={s.productImage} resizeMode="contain" />
          ) : (
            <View style={s.productImagePlaceholder}>
              <Text style={{ fontSize: 48 }}>🛒</Text>
            </View>
          )}
          <Text style={s.productName}>{product.name}</Text>
          {product.brand ? <Text style={s.productBrand}>{product.brand}</Text> : null}
        </View>

        {/* Nutritional Facts */}
        <SectionCard>
          <SectionTitle icon="🥗" title="Nutritional Facts" />
          <View style={s.tableHeader}>
            <Text style={[s.tableCell, s.tableCellLeft, { color: '#888', fontSize: 11 }]}>NUTRIENT</Text>
            <Text style={[s.tableCell, { color: '#888', fontSize: 11 }]}>PER 100g</Text>
            {product.serving_quantity ? (
              <Text style={[s.tableCell, { color: '#888', fontSize: 11 }]}>PER SERVING</Text>
            ) : null}
          </View>
          {macros.map((m, i) => {
            const val = typeof m.val100 === 'string' ? parseFloat(m.val100) : m.val100;
            const hasVal = val != null && !isNaN(val);
            
            const v100 = hasVal ? val.toFixed(1) : '—';
            const vServ = hasVal && product.serving_quantity
              ? ((val * product.serving_quantity) / 100).toFixed(1)
              : null;
              
            return (
              <View key={m.label} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                <Text style={[s.tableCell, s.tableCellLeft, { color: '#ccc' }]}>{m.label}</Text>
                <Text style={[s.tableCell, { color: '#fff', fontWeight: '600' }]}>
                  {v100} <Text style={{ color: '#666', fontSize: 11 }}>{m.unit}</Text>
                </Text>
                {product.serving_quantity ? (
                  <Text style={[s.tableCell, { color: '#aaa' }]}>
                    {vServ ?? '—'} <Text style={{ color: '#555', fontSize: 11 }}>{m.unit}</Text>
                  </Text>
                ) : null}
              </View>
            );
          })}
          {product.serving_quantity ? (
            <Text style={s.servingNote}>Serving size: {product.serving_quantity}g</Text>
          ) : null}
        </SectionCard>

        {/* Ingredient List */}
        {product.ingredients ? (
          <SectionCard>
            <SectionTitle icon="🏷️" title="Ingredients" />
            <Text style={s.ingredientText}>{product.ingredients}</Text>
          </SectionCard>
        ) : null}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtnLg: { marginTop: 20, padding: 12 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
    margin: 16,
  },

  productHeader: { alignItems: 'center', paddingBottom: 20 },
  productImage: { width: width - 80, height: 200, borderRadius: 16, marginBottom: 16 },
  productImagePlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: '#252525',
  },
  productName: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
  productBrand: { fontSize: 13, color: '#888', textAlign: 'center' },

  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#252525', marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 9, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#111', borderRadius: 8 },
  tableCell: { flex: 1, fontSize: 13, textAlign: 'center' },
  tableCellLeft: { flex: 1.5, textAlign: 'left', paddingLeft: 6 },
  servingNote: { fontSize: 11, color: '#555', marginTop: 10, textAlign: 'center' },

  ingredientText: { fontSize: 13, lineHeight: 21, color: '#ccc' },
});
