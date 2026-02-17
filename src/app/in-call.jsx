import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { PhoneOff, Mic, MicOff, Volume2, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/utils/useTheme";

const { width, height } = Dimensions.get("window");

export default function InCallScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Get contact info from params or use defaults
  const contactName = params.contactName || 'Mom';
  const contactPhone = params.contactPhone || '+1 (555) 123-4567';

  useEffect(() => {
    // Start call timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Pulse animation for active call indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    router.back();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      {/* Call Status Indicator */}
      <View style={styles.statusBar}>
        <Animated.View
          style={[
            styles.activeIndicator,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <Text style={[styles.statusText, { color: theme.colors.safe }]}>Call in Progress</Text>
      </View>

      {/* Caller Info Section */}
      <View style={styles.callerSection}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={[theme.colors.neonPurple, theme.colors.neonCyan]}
            style={styles.avatar}
          >
            <User size={100} color="#FFFFFF" strokeWidth={1.5} />
          </LinearGradient>
        </View>

        <Text style={[styles.callerName, { color: theme.colors.text }]}>{contactName}</Text>
        <Text style={[styles.callerNumber, { color: theme.colors.textSecondary }]}>{contactPhone}</Text>
        
        <View style={[styles.durationContainer, { backgroundColor: 'rgba(0, 229, 255, 0.2)' }]}>
          <Text style={[styles.durationText, { color: theme.colors.neonCyan }]}>{formatDuration(callDuration)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <View style={styles.actionButtons}>
          {/* Mute Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={toggleMute}
            activeOpacity={0.8}
            data-testid="mute-button"
          >
            <LinearGradient
              colors={isMuted ? ['rgba(255, 45, 149, 0.3)', 'rgba(156, 39, 255, 0.2)'] : ['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
              style={[
                styles.actionButtonInner,
                isMuted && { borderWidth: 2, borderColor: theme.colors.neonPink },
              ]}
            >
              {isMuted ? (
                <MicOff size={28} color={theme.colors.neonPink} strokeWidth={2} />
              ) : (
                <Mic size={28} color={theme.colors.neonCyan} strokeWidth={2} />
              )}
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {}}
            activeOpacity={0.8}
            data-testid="speaker-button"
          >
            <LinearGradient
              colors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
              style={styles.actionButtonInner}
            >
              <Volume2 size={28} color={theme.colors.neonCyan} strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Speaker</Text>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
          activeOpacity={0.8}
          data-testid="end-call-button"
        >
          <LinearGradient
            colors={['#FF4757', '#FF2D95']}
            style={styles.endCallInner}
          >
            <PhoneOff size={32} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={styles.endCallText}>End Call</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Info */}
      <View style={styles.infoSection}>
        <View style={[styles.infoBox, { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: theme.colors.borderLight }]}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            📱 This is a simulated call to help you exit safely
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 20,
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00E5A0",
    marginRight: 8,
    shadowColor: '#00E5A0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  callerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  avatarContainer: {
    marginBottom: 32,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(0, 229, 255, 0.4)",
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  callerName: {
    fontSize: 40,
    fontWeight: "700",
    marginBottom: 8,
  },
  callerNumber: {
    fontSize: 18,
    marginBottom: 24,
  },
  durationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  durationText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 3,
  },
  actionsSection: {
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 48,
  },
  actionButton: {
    alignItems: "center",
  },
  actionButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  actionButtonActive: {
    backgroundColor: "rgba(255, 45, 149, 0.3)",
    borderColor: '#FF2D95',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  endCallButton: {
    alignItems: "center",
  },
  endCallInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#FF2D95",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  endCallText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  infoSection: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
  },
  infoBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  infoText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
