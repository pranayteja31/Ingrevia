import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../constants/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const logoScale       = useRef(new Animated.Value(0.8)).current;
  const logoOpacity     = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // Wait until AuthContext finishes loading the saved token
      if (!isLoading) {
        router.replace(user ? '/(tabs)' : '/login');
      }
    });
  }, []);

  // If auth finishes loading after the animation, redirect then
  useEffect(() => {
    if (!isLoading) {
      router.replace(user ? '/(tabs)' : '/login');
    }
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor="#141414" />

      <View style={styles.centerBlock}>
        <Animated.View
          style={[styles.logoCircle, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        >
          <Text style={styles.logoEmoji}>🥬</Text>
          <View style={styles.logoRing} />
        </Animated.View>

        <Animated.Text style={[styles.appName, { opacity: subtitleOpacity }]}>
          NutriScan
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: subtitleOpacity }]}>
          Scan Smarter. Eat Better.
        </Animated.Text>
      </View>

      <Text style={styles.version}>v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1, backgroundColor: '#141414',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  centerBlock: { alignItems: 'center', marginBottom: 60 },
  logoCircle: {
    width: 110, height: 110, borderRadius: 32,
    backgroundColor: '#1f1f1f', borderWidth: 1.5, borderColor: '#f86c1b40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: '#f86c1b', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  logoEmoji: { fontSize: 54, lineHeight: 60 },
  logoRing: {
    position: 'absolute', width: 116, height: 116, borderRadius: 36,
    borderWidth: 1, borderColor: '#f86c1b20',
  },
  appName: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5, marginBottom: 6 },
  tagline: { fontSize: 13, color: '#ababab', letterSpacing: 1 },
  version: { position: 'absolute', bottom: 24, fontSize: 11, color: '#2f2f2f', letterSpacing: 1 },
});
