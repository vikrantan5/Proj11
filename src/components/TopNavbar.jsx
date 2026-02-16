import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/utils/useTheme';

export default function TopNavbar({ title = 'MAITRI' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <LinearGradient
      colors={theme.isDark ? ['rgba(10, 14, 26, 0.95)', 'rgba(22, 33, 62, 0.8)'] : ['#FFFFFF', '#F8F9FA']}
      style={{
        paddingTop: Platform.OS === 'web' ? 16 : insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.borderLight,
      }}
    >
      {/* Profile Icon - Left */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/profile')}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: theme.isDark ? 'rgba(0, 229, 255, 0.15)' : theme.colors.elevated,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.isDark ? theme.colors.neonCyan : 'transparent',
        }}
        data-testid="profile-nav-button"
      >
        <User size={20} color={theme.isDark ? theme.colors.neonCyan : theme.colors.text} strokeWidth={2} />
      </TouchableOpacity>

      {/* Title - Center */}
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 20,
          color: theme.isDark ? theme.colors.neonCyan : theme.colors.text,
          flex: 1,
          textAlign: 'center',
          marginHorizontal: 16,
          letterSpacing: 2,
          textShadowColor: theme.isDark ? theme.colors.glowColor : 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        }}
      >
        {title}
      </Text>

      {/* Bell Icon - Right */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/profile')}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: theme.isDark ? 'rgba(255, 45, 149, 0.15)' : theme.colors.elevated,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.isDark ? theme.colors.neonPink : 'transparent',
        }}
        data-testid="alerts-nav-button"
      >
        <Bell size={20} color={theme.isDark ? theme.colors.neonPink : theme.colors.text} strokeWidth={2} />
      </TouchableOpacity>
    </LinearGradient>
  );
}
