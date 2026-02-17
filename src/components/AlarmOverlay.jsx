import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Volume2 } from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';

const { width, height } = Dimensions.get('window');

/**
 * Full-screen overlay shown when loud alarm is active
 */
export default function AlarmOverlay({ visible, onStop }) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (visible) {
      // Pulse animation for the warning icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Flash animation for background
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Rotate animation for icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [visible]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#8B0000', '#FF0000'], // Dark red to bright red
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Warning Content */}
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
        }}>
          <Animated.View
            style={{
              marginBottom: 40,
              transform: [{ scale: pulseAnim }, { rotate: rotation }],
            }}
          >
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 4,
              borderColor: 'rgba(255, 255, 255, 0.4)',
            }}>
              <AlertCircle size={80} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Animated.View>

          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 52,
            color: '#FFFFFF',
            letterSpacing: 8,
            textAlign: 'center',
            marginBottom: 12,
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 0, height: 4 },
            textShadowRadius: 15,
          }}>
            ALARM
          </Text>
          
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 36,
            color: '#FFD700',
            letterSpacing: 6,
            textAlign: 'center',
            marginBottom: 60,
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 0, height: 3 },
            textShadowRadius: 12,
          }}>
            ACTIVATED
          </Text>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            paddingHorizontal: 24,
            paddingVertical: 18,
            borderRadius: 16,
            marginBottom: 35,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.4)',
          }}>
            <Volume2 size={26} color="#FFD700" strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: '#FFFFFF',
              marginLeft: 14,
              flex: 1,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              Emergency siren is playing at maximum volume
            </Text>
          </View>

          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            color: 'rgba(255, 255, 255, 0.95)',
            textAlign: 'center',
            lineHeight: 24,
          }}>
            Tap the button below to stop the alarm{'\n'}and silence the emergency siren
          </Text>
        </View>

        {/* Stop Button */}
        <View style={{
          width: '100%',
          paddingHorizontal: 40,
          paddingBottom: 70,
        }}>
          <TouchableOpacity
            data-testid="stop-alarm-button"
            onPress={onStop}
            activeOpacity={0.85}
            style={{
              borderRadius: 24,
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 30,
              elevation: 15,
            }}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF8C00']}
              style={{
                paddingVertical: 22,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <Text style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 22,
                color: '#000000',
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}>
                Stop Alarm
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
