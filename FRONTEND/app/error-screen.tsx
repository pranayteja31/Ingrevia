import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ErrorScreen() {
  const router = useRouter();

  // Shake animation for the icon
  const shake = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(shake, { toValue: 12, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      ]),
    ]).start();
  }, []);

  const handleRetry = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor="#141414" />

      <Animated.View style={[styles.card, { opacity: fadeIn }]}>

        {/* Icon */}
        <Animated.View style={[styles.iconBox, { transform: [{ translateX: shake }] }]}>
          <Ionicons name="cloud-offline-outline" size={52} color="#EF4444" />
        </Animated.View>

        {/* Headline */}
        <Text style={styles.title}>Connection Failed</Text>
        <Text style={styles.subtitle}>
          NutriScan couldn't start up properly. This usually means:
        </Text>

        {/* Reason list */}
        {[
          { icon: 'wifi-outline', text: 'No internet connection detected' },
          { icon: 'server-outline', text: 'The NutriScan servers are unreachable' },
          { icon: 'cloud-download-outline', text: 'Health data could not be fetched' },
        ].map((r) => (
          <View key={r.text} style={styles.reasonRow}>
            <Ionicons name={r.icon as any} size={16} color="#546C70" />
            <Text style={styles.reasonText}>{r.text}</Text>
          </View>
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Tips */}
        <Text style={styles.tipsTitle}>What you can try:</Text>
        {[
          'Enable Wi-Fi or mobile data',
          'Check your connection and try again',
          'Wait a moment if the servers are busy',
        ].map((tip, i) => (
          <Text key={i} style={styles.tip}>
            {i + 1}. {tip}
          </Text>
        ))}

        {/* Retry button */}
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* App name watermark */}
      <Text style={styles.watermark}>NutriScan v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1f1f1f',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },

  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#ababab',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 13,
    color: '#ababab',
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    alignSelf: 'stretch',
    marginVertical: 18,
  },

  tipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#546C70',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  tip: {
    fontSize: 13,
    color: '#ababab',
    alignSelf: 'flex-start',
    marginBottom: 6,
    lineHeight: 19,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f86c1b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
    shadowColor: '#f86c1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  watermark: {
    position: 'absolute',
    bottom: 24,
    fontSize: 11,
    color: '#2f2f2f',
    letterSpacing: 1,
  },
});
