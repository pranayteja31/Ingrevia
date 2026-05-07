/**
 * App Configuration — API Base URL Resolution
 * ============================================
 *
 * LOCAL DEVELOPMENT
 *   BASE_URL is auto-resolved from Expo Metro's bundler host at runtime.
 *   The host IP is extracted and combined with BACKEND_PORT (8000).
 *   This means the app always points to the correct Django server on your
 *   LAN without any manual IP changes — just run both servers.
 *
 *   Works for: physical devices, Android Emulator, iOS Simulator.
 *
 * PRODUCTION (EAS Build / standalone app)
 *   Set EXPO_PUBLIC_API_URL in your EAS build profile or CI environment.
 *   Example: https://api.ingrevia.com
 *
 *   The EXPO_PUBLIC_ prefix makes the variable available at build time
 *   via process.env.EXPO_PUBLIC_API_URL (Expo SDK 49+).
 *
 * QUICK OVERRIDE FOR CUSTOM DEV SETUPS
 *   If Metro's hostUri auto-detection doesn't work (e.g. VPN, custom tunnel),
 *   set EXPO_PUBLIC_DEV_API_URL in a local .env file to force the URL.
 *   Example: EXPO_PUBLIC_DEV_API_URL=http://192.168.1.42:8000
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Django dev server port (change if you run on a different port)
const BACKEND_PORT = 8000;

function getBaseUrl(): string {
  if (!__DEV__) {
    const prodUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!prodUrl) {
      console.warn('[config] EXPO_PUBLIC_API_URL is not set for production build.');
    }
    return prodUrl ?? '';
  }

  // ── Development: Platform-aware auto-detect ──────────────────────────────
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return `http://localhost:${BACKEND_PORT}`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]; // e.g. "192.168.1.42" or "localhost"
    if (isAndroid && (host === 'localhost' || host === '127.0.0.1')) {
      return `http://10.0.2.2:${BACKEND_PORT}`;
    }
    return `http://${host}:${BACKEND_PORT}`;
  }

  return isAndroid ? `http://10.0.2.2:${BACKEND_PORT}` : `http://localhost:${BACKEND_PORT}`;
}

export const BASE_URL = getBaseUrl();
export const APP_VERSION = '1.0.0';
