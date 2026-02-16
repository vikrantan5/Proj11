import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/utils/useTheme';

export default function LoadingScreen({ message = 'Loading...' }) {
  const theme = useTheme();
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <StatusBar style={theme.colors.statusBar} />
      <Text style={{ 
        fontSize: 16, 
        color: theme.colors.textSecondary,
        fontFamily: 'Inter_400Regular'
      }}>
        {message}
      </Text>
    </View>
  );
}