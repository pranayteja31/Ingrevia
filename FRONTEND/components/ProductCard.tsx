import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';
import { NormalizedProduct } from '../constants/api';
import NutriScoreBadge from './NutriScoreBadge';

interface Props {
  product: NormalizedProduct;
  onPress: () => void;
  /**
   * compact=true  → smaller image, no bottom margin, no chevron
   *                  (used inside scan screen's dropdown suggestion list)
   * compact=false → full card with border and chevron (used in home search results)
   */
  compact?: boolean;
}

/**
 * ProductCard — renders a single food product row with image, name,
 * brand, calorie count, and Nutri-Score badge.
 *
 * Two layout variants:
 *  - Default (compact=false): bordered card with margin, used in search results
 *  - Compact (compact=true):  paddingOnly row, used in scan floating suggestions
 */
export default function ProductCard({ product, onPress, compact = false }: Props) {
  const { colors } = useTheme();
  const kcal = product.nutrients_100g?.energy_kcal;
  const imgUri = product.image_small_url || product.image_url;

  const imgStyle = compact ? styles.imgCompact : styles.img;

  return (
    <TouchableOpacity
      style={[
        compact ? styles.rowCompact : styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {imgUri ? (
        <Image source={{ uri: imgUri }} style={imgStyle} />
      ) : (
        <View style={[imgStyle, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: compact ? 20 : 28 }}>🛒</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text
          style={[compact ? styles.nameCompact : styles.name, { color: colors.textPrimary }]}
          numberOfLines={compact ? 1 : 2}
        >
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
            {product.brand || 'Unknown brand'}
          </Text>
          {kcal != null ? (
            <Text style={[styles.brand, { color: colors.primary, fontWeight: '700' }]}>
              • {Math.round(kcal)} kcal
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <NutriScoreBadge grade={product.nutriscore_grade} size={compact ? 'sm' : 'md'} />
        {!compact ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, gap: 12,
  },
  rowCompact: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
  },
  img: { width: 56, height: 56, borderRadius: 10 },
  imgCompact: { width: 40, height: 40, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  nameCompact: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 12 },
  right: { alignItems: 'center', gap: 4 },
});
