import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const modes = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    saveThemePreference(nextMode);
  };

  const setTheme = (mode) => {
    if (['system', 'light', 'dark'].includes(mode)) {
      setThemeMode(mode);
      saveThemePreference(mode);
    }
  };

  // Determine actual color scheme based on theme mode
  const getActualColorScheme = () => {
    if (themeMode === 'system') {
      return systemColorScheme || 'light';
    }
    return themeMode;
  };

  const actualColorScheme = getActualColorScheme();

  const theme = {
    mode: themeMode,
    isDark: actualColorScheme === 'dark',
    colors: {
      // Background colors
      background: actualColorScheme === 'dark' ? '#121212' : '#FFFFFF',
      surface: actualColorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
      elevated: actualColorScheme === 'dark' ? '#262626' : '#F5F5F5',
      
      // Text colors
      text: actualColorScheme === 'dark' ? '#FFFFFF' : '#000000',
      textSecondary: actualColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#9A9A9A',
      textTertiary: actualColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : '#666666',
      
      // Border colors
      border: actualColorScheme === 'dark' ? '#2A2A2A' : '#E6E6E6',
      borderLight: actualColorScheme === 'dark' ? '#1A1A1A' : '#F2F2F2',
      divider: actualColorScheme === 'dark' ? '#2A2A2A' : '#EFEFEF',
      
      // Button colors
      buttonBackground: actualColorScheme === 'dark' ? '#2A2A2A' : '#F5F5F5',
      buttonText: actualColorScheme === 'dark' ? '#FFFFFF' : '#000000',
      
      // Card backgrounds
      cardBackground: actualColorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
      
      // Status bar
      statusBar: actualColorScheme === 'dark' ? 'light' : 'dark',
      
      // Tab bar
      tabBarBackground: actualColorScheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
      tabBarBorder: actualColorScheme === 'dark' ? '#2A2A2A' : '#E5E7EB',
      tabBarActive: actualColorScheme === 'dark' ? '#FFFFFF' : '#000000',
      tabBarInactive: actualColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6B6B6B',
      
      // Special colors (these remain mostly the same but slightly adjusted)
      success: actualColorScheme === 'dark' ? '#4a80de' : '#350579',
      error: actualColorScheme === 'dark' ? '#F87171' : '#E04444',
      warning: actualColorScheme === 'dark' ? '#FBBF24' : '#F59E0B',
      
      // Safety app specific colors
      danger: '#FF4444',
      emergency: '#DC2626',
      safe: '#10B981', 
      
      // Notification colors
      notification: actualColorScheme === 'dark' ? '#EF4444' : '#E04444',
      notificationDot: actualColorScheme === 'dark' ? '#FF4444' : '#FF2D55',
      
      // Disabled states
      disabled: actualColorScheme === 'dark' ? '#3A3A3A' : '#E6E6E6',
      disabledText: actualColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#9A9A9A',
      
      // MAITRI Neon Theme Colors
      neonCyan: '#00E5FF',
      neonPink: '#FF2D95',
      neonPurple: '#9C27FF',
      glowColor: '#00E5FF',
      shadowColor: '#000000',
      
      // Gradients (arrays for LinearGradient)
      backgroundGradient: actualColorScheme === 'dark' 
        ? ['#0A0E27', '#1A1F3A', '#0F1629'] 
        : ['#FFFFFF', '#F5F5F5', '#ECECEC'],
      sosGradient: ['#FF2D95', '#FF6B9D', '#9C27FF'],
    },
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, themeMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
