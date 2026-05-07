import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

interface Props {
  /** 'sm' reduces circle + font sizes slightly (used on register screen) */
  size?: 'sm' | 'md';
}

/**
 * LogoBranding — the app logo block shared across auth screens.
 * Renders the emoji circle, app name, and tagline using the current theme.
 */
export default function LogoBranding({ size = 'md' }: Props) {
  const { colors } = useTheme();
  const circleSize = size === 'sm' ? 72 : 84;
  const emojiSize = size === 'sm' ? 36 : 42;
  const nameSize = size === 'sm' ? 26 : 30;

  return (
    <View style={styles.block}>
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            backgroundColor: colors.card,
            borderColor: colors.primary + '40',
            shadowColor: colors.primary,
          },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>🥬</Text>
      </View>
      <Text style={[styles.name, { fontSize: nameSize, color: colors.textPrimary }]}>
        Ingrevia
      </Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>
        Scan Smarter. Eat Better.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center' },
  circle: {
    borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  name: { fontWeight: '900', letterSpacing: 1 },
  tagline: { fontSize: 12, marginTop: 4, letterSpacing: 0.8 },
});
