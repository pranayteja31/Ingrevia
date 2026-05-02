import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';
import { useProduct, ProductData } from '../constants/ProductContext';
import { HistoryAPI } from '../constants/api';

const { width } = Dimensions.get('window');

function addToHistory(product: ProductData) {
  HistoryAPI.add({
    product_id: product.id,
    name: product.name,
    brand: product.brand || '',
    image_url: product.imageUrl,
  }).catch(() => {});
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[sc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function SectionTitle({ icon, title, colors }: { icon: string; title: string; colors: any }) {
  return (
    <View style={sc.sectionHeader}>
      <Text style={sc.sectionIcon}>{icon}</Text>
      <Text style={[sc.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
});

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currentProduct: product } = useProduct();

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
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.emptyState}>
          <Text style={{ fontSize: 48 }}>📦</Text>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No product loaded</Text>
          <TouchableOpacity style={s.backBtnLg} onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const n = product.nutrients_100g || {};
  const macros = [
    { label: 'Calories', unit: 'kcal', val100: n.energy_kcal },
    { label: 'Protein',  unit: 'g',    val100: n.proteins },
    { label: 'Carbs',    unit: 'g',    val100: n.carbohydrates },
    { label: 'Fat',      unit: 'g',    val100: n.fat },
    { label: 'Fibre',    unit: 'g',    val100: n.fiber },
    { label: 'Sugars',   unit: 'g',    val100: n.sugars },
    { label: 'Sodium',   unit: 'mg',   val100: n.sodium },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Back button */}
      <TouchableOpacity
        style={[s.backBtn, { backgroundColor: colors.card }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product header */}
        <View style={s.productHeader}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={s.productImage} resizeMode="contain" />
          ) : (
            <View style={[s.productImagePlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 48 }}>🛒</Text>
            </View>
          )}
          <Text style={[s.productName, { color: colors.textPrimary }]}>{product.name}</Text>
          {product.brand ? (
            <Text style={[s.productBrand, { color: colors.textSecondary }]}>{product.brand}</Text>
          ) : null}
        </View>

        {/* Nutritional Facts */}
        <SectionCard colors={colors}>
          <SectionTitle icon="🥗" title="Nutritional Facts" colors={colors} />
          <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.tableCell, s.tableCellLeft, { color: colors.textMuted, fontSize: 11 }]}>NUTRIENT</Text>
            <Text style={[s.tableCell, { color: colors.textMuted, fontSize: 11 }]}>PER 100g</Text>
            {product.serving_quantity ? (
              <Text style={[s.tableCell, { color: colors.textMuted, fontSize: 11 }]}>PER SERVING</Text>
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
              <View
                key={m.label}
                style={[s.tableRow, i % 2 === 0 && [s.tableRowAlt, { backgroundColor: colors.background }]]}
              >
                <Text style={[s.tableCell, s.tableCellLeft, { color: colors.textSecondary }]}>{m.label}</Text>
                <Text style={[s.tableCell, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {v100} <Text style={{ color: colors.textMuted, fontSize: 11 }}>{m.unit}</Text>
                </Text>
                {product.serving_quantity ? (
                  <Text style={[s.tableCell, { color: colors.textSecondary }]}>
                    {vServ ?? '—'} <Text style={{ color: colors.textMuted, fontSize: 11 }}>{m.unit}</Text>
                  </Text>
                ) : null}
              </View>
            );
          })}

          {product.serving_quantity ? (
            <Text style={[s.servingNote, { color: colors.textMuted }]}>
              Serving size: {product.serving_quantity}g
            </Text>
          ) : null}
        </SectionCard>

        {/* Ingredients */}
        {product.ingredients ? (
          <SectionCard colors={colors}>
            <SectionTitle icon="🏷️" title="Ingredients" colors={colors} />
            <Text style={[s.ingredientText, { color: colors.textSecondary }]}>{product.ingredients}</Text>
          </SectionCard>
        ) : null}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  backBtnLg: { marginTop: 20, padding: 12 },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', margin: 16,
  },

  productHeader: { alignItems: 'center', paddingBottom: 20 },
  productImage: { width: width - 80, height: 200, borderRadius: 16, marginBottom: 16 },
  productImagePlaceholder: {
    width: 120, height: 120, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1,
  },
  productName: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  productBrand: { fontSize: 13, textAlign: 'center' },

  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 9, alignItems: 'center' },
  tableRowAlt: { borderRadius: 8 },
  tableCell: { flex: 1, fontSize: 13, textAlign: 'center' },
  tableCellLeft: { flex: 1.5, textAlign: 'left', paddingLeft: 6 },
  servingNote: { fontSize: 11, marginTop: 10, textAlign: 'center' },

  ingredientText: { fontSize: 13, lineHeight: 21 },
});
