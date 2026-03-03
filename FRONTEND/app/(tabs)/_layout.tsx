import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const tabs = [
    { name: 'index', label: 'Home', icon: 'home' as IconName, iconOutline: 'home-outline' as IconName },
    { name: 'profile', label: 'Profile', icon: 'person' as IconName, iconOutline: 'person-outline' as IconName },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom || 8,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
      ]}
    >
      {/* Left tab: Home */}
      {[0].map((i) => {
        const tab = tabs[i];
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            accessibilityRole="button"
          >
            <Ionicons
              name={isFocused ? tab.icon : tab.iconOutline}
              size={22}
              color={isFocused ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}

      {/* Center FAB Scan Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Scan Item"
        >
          <Ionicons name="scan" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Right tab: Profile */}
      {[1].map((i) => {
        const tab = tabs[i];
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            accessibilityRole="button"
          >
            <Ionicons
              name={isFocused ? tab.icon : tab.iconOutline}
              size={22}
              color={isFocused ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
    alignItems: 'center',
    height: Platform.OS === 'android' ? 68 : 72,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
});

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
