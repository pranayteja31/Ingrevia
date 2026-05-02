import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../constants/AuthContext';
import { useTheme } from '../constants/ThemeContext';
import LogoBranding from '../components/LogoBranding';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Shared logo block */}
          <View style={styles.logoBlock}>
            <LogoBranding />
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Sign in to continue</Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.redMuted, borderColor: colors.red + '40' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
              />
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 32 },
  logoBlock: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },

  card: { borderRadius: 24, padding: 24, borderWidth: 1 },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },

  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 14, height: 50, borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 14 },

  btn: {
    marginTop: 28, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '700' },
});
