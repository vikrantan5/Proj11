import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Volume2 } from 'lucide-react-native';
import { Inter_700Bold, Inter_600SemiBold } from '@expo-google-fonts/inter';

const { width, height } = Dimensions.get('window');

/**
 * Full-screen overlay shown when loud alarm is active
 */
export default function AlarmOverlay({ visible, onStop }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Pulse animation for the warning icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Flash animation for background
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#8B0000', '#FF0000'], // Dark red to bright red
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor },
        ]}
      >
        {/* Warning Content */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <AlertCircle size={100} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>

          <Text style={styles.title}>LOUD ALARM</Text>
          <Text style={styles.subtitle}>ACTIVE</Text>

          <View style={styles.warningBox}>
            <Volume2 size={24} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.warningText}>
              Emergency siren is playing at maximum volume
            </Text>
          </View>

          <Text style={styles.instruction}>
            Tap STOP button below to silence the alarm
          </Text>
        </View>

        {/* Stop Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            data-testid="stop-alarm-button"
            onPress={onStop}
            activeOpacity={0.8}
            style={styles.stopButtonWrapper}
          >
            <LinearGradient
              colors={['#FFD700', '#FF8C00']}
              style={styles.stopButton}
            >
              <Text style={styles.stopButtonText}>STOP ALARM</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: '#FFFFFF',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    color: '#FFD700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  warningText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
    textAlign: 'center',
  },
  instruction: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  stopButtonWrapper: {
    borderRadius: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  stopButton: {
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#000000',
    letterSpacing: 3,
  },
});
