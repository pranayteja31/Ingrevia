import React, { forwardRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  /** Whether the input is currently focused (controls border colour and cancel button) */
  focused?: boolean;
  /** Called when the "Cancel" text is pressed — shows cancel only when focused=true */
  onCancel?: () => void;
  height?: number;
  style?: ViewStyle;
}

/**
 * SearchBar — controlled search input shared across the Home and Scan screens.
 *
 * - Renders a magnifier icon on the left.
 * - Shows a clear (×) button when there is text and no `onCancel` handler.
 * - Shows a "Cancel" text button when `focused` is true and `onCancel` is provided.
 * - Border colour shifts to primary when focused.
 */
const SearchBar = forwardRef<TextInput, Props>(
  (
    {
      value,
      onChangeText,
      placeholder = 'Search…',
      onSubmitEditing,
      focused,
      onCancel,
      height = 50,
      style,
    },
    ref
  ) => {
    const { colors } = useTheme();

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            height,
          },
          style,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={focused ? colors.primary : colors.textMuted}
        />
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
          clearButtonMode="while-editing"
        />
        {/* Clear button — only when there is no cancel handler */}
        {value.length > 0 && !onCancel ? (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
        {/* Cancel button — only in focused floating search panels */}
        {onCancel && focused ? (
          <TouchableOpacity onPress={onCancel}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

SearchBar.displayName = 'SearchBar';
export default SearchBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, paddingHorizontal: 14, borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 14 },
  cancelText: { fontSize: 13, fontWeight: '600' },
});
