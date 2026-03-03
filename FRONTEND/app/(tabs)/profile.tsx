import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { useAuth } from '../../constants/AuthContext';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const genderLabel = (g?: string) => {
    const map: Record<string, string> = {
      male: 'Male', female: 'Female',
      non_binary: 'Non-binary', prefer_not_to_say: 'Not disclosed',
    };
    return (g && map[g]) || '—';
  };

  const bmi = () => {
    if (!user?.weightKg || !user?.heightCm) return null;
    const h = user.heightCm / 100;
    return (user.weightKg / (h * h)).toFixed(1);
  };

  const infoItems = [
    { label: 'Age', value: user?.age || '—', icon: 'calendar-outline' },
    { label: 'Gender', value: genderLabel(user?.gender), icon: 'person-circle-outline' },
    { label: 'Weight', value: user?.weightKg ? `${user.weightKg} kg` : '—', icon: 'barbell-outline' },
    { label: 'Height', value: user?.heightCm ? `${user.heightCm} cm` : '—', icon: 'resize-outline' },
    ...(bmi() ? [{ label: 'BMI', value: bmi()!, icon: 'analytics-outline' }] : []),
    { label: 'Health Goal', value: user?.healthGoals || 'General Wellness', icon: 'heart-outline' },
    { label: 'Email', value: user?.email || '—', icon: 'mail-outline' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>

        {/* Avatar + Name */}
        <View style={s.profileHead}>
          <View style={[s.avatar, { backgroundColor: colors.primary }]}>
            <Text style={s.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={[s.name, { color: colors.textPrimary }]}>{user?.name ?? 'Guest'}</Text>
          <Text style={[s.email, { color: colors.textSecondary }]}>{user?.email ?? ''}</Text>
          {user?.createdAt && (
            <Text style={[s.joined, { color: colors.textMuted }]}>
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>

        {/* Profile Details */}
        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Profile Details</Text>
        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {infoItems.map((item, i) => (
            <View key={item.label}
              style={[s.infoRow, i < infoItems.length - 1 && [s.infoBorder, { borderBottomColor: colors.border }]]}>
              <View style={s.infoLeft}>
                <Ionicons name={item.icon as any} size={18} color={colors.textSecondary} />
                <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
              <Text style={[s.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Dietary Restrictions */}
        {(user?.dietaryRestrictions?.length ?? 0) > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Dietary Restrictions</Text>
            <View style={[s.chipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.chipRow}>
                {user!.dietaryRestrictions.map((d) => (
                  <View key={d} style={[s.chip, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '15' }]}>
                    <Text style={[s.chipText, { color: colors.primary }]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Known Allergens */}
        {(user?.knownAllergens?.length ?? 0) > 0 && (
          <>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Known Allergens</Text>
            <View style={[s.chipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.chipRow}>
                {user!.knownAllergens.map((a) => (
                  <View key={a} style={[s.chip, { borderColor: '#EF444460', backgroundColor: '#EF444415' }]}>
                    <Text style={[s.chipText, { color: '#EF4444' }]}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Settings */}
        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Dark Mode */}
          <View style={[s.menuItem, s.menuBorder, { borderBottomColor: colors.border }]}>
            <View style={s.menuLeft}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.textSecondary} />
              <Text style={[s.menuLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryMuted }}
              thumbColor={isDark ? colors.primary : colors.textMuted} />
          </View>

          <TouchableOpacity style={[s.menuItem, s.menuBorder, { borderBottomColor: colors.border }]}>
            <View style={s.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={[s.menuLabel, { color: colors.textPrimary }]}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={handleLogout} activeOpacity={0.7}>
            <View style={s.menuLeft}>
              <Ionicons name="log-out-outline" size={20} color={colors.red || '#EF4444'} />
              <Text style={[s.menuLabel, { color: colors.red || '#EF4444' }]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  profileHead: { alignItems: 'center', paddingTop: 24, paddingBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 4 },
  joined: { fontSize: 11, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 6 },

  infoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoBorder: { borderBottomWidth: 1 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  chipCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },

  menuCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuBorder: { borderBottomWidth: 1 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 14, fontWeight: '500' },
});
