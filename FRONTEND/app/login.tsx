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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
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
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" backgroundColor="#0f0f0f" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoBlock}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>🥬</Text>
            </View>
            <Text style={s.appName}>NutriScan</Text>
            <Text style={s.tagline}>Scan Smarter. Eat Better.</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to continue</Text>

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#666" />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#444"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
              />
            </View>

            <Text style={s.label}>Password</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#666" />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#444"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={s.footerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  logoBlock: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: '#1a1a1a', borderWidth: 1.5, borderColor: '#f86c1b40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    shadowColor: '#f86c1b', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  logoEmoji: { fontSize: 42 },
  appName: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 12, color: '#666', marginTop: 4, letterSpacing: 0.8 },

  card: {
    backgroundColor: '#181818', borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: '#252525',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#666', marginBottom: 24 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2a1010', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#EF444440', marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },

  label: { fontSize: 12, color: '#888', fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111', borderRadius: 14,
    paddingHorizontal: 14, height: 50,
    borderWidth: 1.5, borderColor: '#252525',
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },

  btn: {
    marginTop: 28, backgroundColor: '#f86c1b', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f86c1b', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: '#555' },
  footerLink: { fontSize: 13, fontWeight: '700', color: '#f86c1b' },
});
