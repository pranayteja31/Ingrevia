import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NS_COLORS: Record<string, string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63E11',
};

interface Props {
  grade?: string;
  /** 'sm' = 24px used in compact lists, 'md' = 28px default */
  size?: 'sm' | 'md';
}

/**
 * NutriScoreBadge — displays an A–E Nutri-Score grade with the official colour.
 * Used in ProductCard, scan suggestions, and search result lists.
 */
export default function NutriScoreBadge({ grade, size = 'md' }: Props) {
  if (!grade) return null;
  const g = grade.toUpperCase();
  const color = NS_COLORS[g] ?? '#555';
  const dim = size === 'sm' ? 24 : 28;
  const radius = size === 'sm' ? 6 : 8;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <View style={[styles.badge, { backgroundColor: color, width: dim, height: dim, borderRadius: radius }]}>
      <Text style={[styles.text, { fontSize }]}>{g}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '900', color: '#fff' },
});
