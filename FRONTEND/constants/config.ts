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

// Django dev server port (change if you run on a different port)
const BACKEND_PORT = 8000;

function getBaseUrl(): string {
  // ── Production build ──────────────────────────────────────────────────────
  // EXPO_PUBLIC_API_URL must be set in the EAS build profile or CI for production.
  if (!__DEV__) {
    const prodUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!prodUrl) {
      console.warn(
        '[config] EXPO_PUBLIC_API_URL is not set for production build. ' +
        'API calls will fail. Set it in your EAS build profile or CI environment.'
      );
    }
    return prodUrl ?? '';
  }

  // ── Development: manual override ─────────────────────────────────────────
  // Useful when Metro's auto-detection doesn't work (VPN, WSL, custom tunnel).
  const devOverride = process.env.EXPO_PUBLIC_DEV_API_URL;
  if (devOverride) return devOverride;

  // ── Development: auto-detect from Metro bundler host ─────────────────────
  // Constants.expoConfig.hostUri looks like "192.168.1.42:8081".
  // We strip the port and point to the Django backend port.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]; // e.g. "192.168.1.42"
    return `http://${host}:${BACKEND_PORT}`;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  // iOS Simulator (bare workflow) — Metro may not expose hostUri.
  // Android Emulator uses 10.0.2.2 to reach the host machine's localhost.
  return `http://localhost:${BACKEND_PORT}`;
}

export const BASE_URL = getBaseUrl();
export const APP_VERSION = '1.0.0';
