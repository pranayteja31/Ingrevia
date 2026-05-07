/**
 * App Configuration - API Base URL Resolution
 * ===========================================
 *
 * LOCAL DEVELOPMENT
 *   BASE_URL is auto-resolved from Expo Metro's bundler host at runtime.
 *   The host IP is extracted and combined with BACKEND_PORT (8000 by default).
 *   This means the app points to the Django server on the current LAN without
 *   machine-specific IP changes.
 *
 * PRODUCTION (EAS Build / standalone app)
 *   Set EXPO_PUBLIC_API_URL in your EAS build profile or CI environment.
 *
 * QUICK OVERRIDE FOR CUSTOM DEV SETUPS
 *   If Metro's hostUri auto-detection doesn't work, set
 *   EXPO_PUBLIC_DEV_API_URL in a local .env file to force the URL.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = process.env.EXPO_PUBLIC_BACKEND_PORT ?? '8000';

function getBaseUrl(): string {
  if (!__DEV__) {
    const prodUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!prodUrl) {
      console.warn('[config] EXPO_PUBLIC_API_URL is not set for production build.');
    }
    return prodUrl ?? '';
  }

  const devUrl = process.env.EXPO_PUBLIC_DEV_API_URL;
  if (devUrl) {
    return devUrl;
  }

  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return `http://localhost:${BACKEND_PORT}`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (isAndroid && (host === 'localhost' || host === '127.0.0.1')) {
      return `http://10.0.2.2:${BACKEND_PORT}`;
    }
    return `http://${host}:${BACKEND_PORT}`;
  }

  return isAndroid ? `http://10.0.2.2:${BACKEND_PORT}` : `http://localhost:${BACKEND_PORT}`;
}

export const BASE_URL = getBaseUrl();
export const APP_VERSION = '1.0.0';
