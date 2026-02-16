import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { PhoneOff, Mic, MicOff, Volume2, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function InCallScreen() {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

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
      colors={["#1a1a2e", "#16213e", "#0f3460"]}
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
        <Text style={styles.statusText}>Call in Progress</Text>
      </View>

      {/* Caller Info Section */}
      <View style={styles.callerSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={100} color="#FFFFFF" strokeWidth={1.5} />
          </View>
        </View>

        <Text style={styles.callerName}>Mom</Text>
        <Text style={styles.callerNumber}>+1 (555) 123-4567</Text>
        
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
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
            <View
              style={[
                styles.actionButtonInner,
                isMuted && styles.actionButtonActive,
              ]}
            >
              {isMuted ? (
                <MicOff size={28} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Mic size={28} color="#FFFFFF" strokeWidth={2} />
              )}
            </View>
            <Text style={styles.actionLabel}>
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
            <View style={styles.actionButtonInner}>
              <Volume2 size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.actionLabel}>Speaker</Text>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
          activeOpacity={0.8}
          data-testid="end-call-button"
        >
          <View style={styles.endCallInner}>
            <PhoneOff size={32} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.endCallText}>End Call</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
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
    backgroundColor: "#22C55E",
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  callerName: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  callerNumber: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
  },
  durationContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 2,
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  actionLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  endCallButton: {
    alignItems: "center",
  },
  endCallInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DC143C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#DC143C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  infoText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 18,
  },
});
