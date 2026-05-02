import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';

interface Action {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: Action;
  /** Render content inside a bordered card (used on home screen hero blocks) */
  card?: boolean;
}

/**
 * EmptyState — generic placeholder displayed when a list is empty
 * or before the user has performed a search.
 *
 * Supports two layouts:
 *  - `card={true}`  → bordered card with padding (home hero blocks)
 *  - `card={false}` → full-screen centred layout (loading / empty screens)
 */
export default function EmptyState({ emoji, title, subtitle, action, card = false }: Props) {
  const { colors } = useTheme();

  const inner = (
    <>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={action.onPress}
        >
          {action.icon ? <Ionicons name={action.icon} size={16} color="#fff" /> : null}
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  if (card) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {inner}
      </View>
    );
  }

  return <View style={styles.center}>{inner}</View>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 8,
  },
  card: {
    borderRadius: 20, padding: 22, borderWidth: 1,
    alignItems: 'flex-start', gap: 8,
  },
  emoji: { fontSize: 36 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  btn: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
