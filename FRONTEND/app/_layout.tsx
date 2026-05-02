import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';
import { AuthProvider, useAuth } from '../constants/AuthContext';
import { ProductProvider } from '../constants/ProductContext';
import { useEffect } from 'react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const seg0 = segments[0] as string | undefined;

    // Routes that are publicly accessible without authentication
    const publicRoutes = ['login', 'register', 'error-screen'];
    // The splash index screen handles its own redirect in its own useEffect
    const isSplash = !seg0 || seg0 === 'index';
    const isPublic = isSplash || publicRoutes.includes(seg0 ?? '');

    if (!user && !isPublic) {
      // User logged out (or session expired) while on a protected screen.
      // AuthGuard is the single place that redirects to login — no screen
      // should call router.replace('/login') directly after logout().
      router.replace('/login' as any);
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutInner() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="error-screen" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="register" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="product-detail"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProductProvider>
            <AuthGuard>
              <RootLayoutInner />
            </AuthGuard>
          </ProductProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
