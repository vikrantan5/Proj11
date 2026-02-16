

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Animated,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Phone,
  MapPin,
  Users,
  Activity,
  Eye,
  Bell,
  Shield,
  AlertCircle,
  Volume2,
} from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "@/utils/useTheme";
import LoadingScreen from "@/components/LoadingScreen";
import SOSCameraCapture from "@/components/SOSCameraCapture";
import AlarmOverlay from "@/components/AlarmOverlay";
import { triggerSOS } from "@/services/sosService";
import { getCurrentLocation } from "@/services/locationService";
import { useLoudAlarm } from "@/hooks/useLoudAlarm";
import { trackEvent, trackSOSActivation, trackAlarmActivation, ANALYTICS_EVENTS } from "@/services/analyticsService";

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [sosCountdown, setSOSCountdown] = useState(5);
  const [showCamera, setShowCamera] = useState(false);
  const theme = useTheme();
  
  // Loud Alarm hook
  const { isAlarmActive, startAlarm, stopAlarm } = useLoudAlarm();
  
  // Pulse animation for SOS button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Track app open on mount
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.APP_OPENED);
  }, []);

  useEffect(() => {
    // Start continuous pulse animation for SOS button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let interval;
    if (isSOSActive && sosCountdown > 0) {
      interval = setInterval(() => {
        setSOSCountdown(prev => prev - 1);
      }, 1000);
    } else if (isSOSActive && sosCountdown === 0) {
      setShowCamera(true);
    }
    return () => clearInterval(interval);
  }, [isSOSActive, sosCountdown]);

  const handleCameraCapture = (photoUri) => {
    setShowCamera(false);
    handleSOSActivation(photoUri);
    setIsSOSActive(false);
    setSOSCountdown(5);
  };

  const handleSOSPress = () => {
    if (isSOSActive) {
      setIsSOSActive(false);
      setSOSCountdown(5);
      return;
    }
    setIsSOSActive(true);
    Vibration.vibrate([100, 200, 100]);
  };

  const handleSOSActivation = async (photoUri = null) => {
    try {
      Alert.alert(
        "🚨 SOS Activating",
        "Sending emergency alerts...",
        [],
        { cancelable: false }
      );

      const result = await triggerSOS(photoUri);
      
      // Track SOS activation in analytics
      await trackSOSActivation(result);
      
      let message = "Emergency protocols activated:\n\n";
      
      if (result.photoCapture && !result.photoCapture.skipped) {
        if (result.imageUrl) {
          message += `📸 Evidence photo captured & uploaded\n`;
        } else if (result.imageUploadError) {
          message += `⚠️ Photo: ${result.imageUploadError}\n`;
        }
      }
      
      if (result.sms.success) {
        message += `✅ SMS sent to ${result.sms.sentTo} contact(s)\n`;
      } else if (result.sms.error) {
        message += `⚠️ SMS: ${result.sms.error}\n`;
      }

      if (result.call.success) {
        message += `✅ ${result.call.message}\n`;
      } else if (result.call.error) {
        message += `⚠️ Call: ${result.call.error}\n`;
      }

      if (result.location) {
        message += `\n📍 Location shared:\n${result.location.latitude.toFixed(6)}, ${result.location.longitude.toFixed(6)}`;
      } else {
        message += `\n⚠️ Location unavailable`;
      }

      Alert.alert("🚨 SOS Alert Sent!", message, [{ text: "OK" }]);
    } catch (error) {
      console.error('SOS activation failed:', error);
      Alert.alert(
        "SOS Error",
        error.message || "Failed to send emergency alert.",
        [{ text: "OK" }]
      );
    }
  };

  const handleLoudAlarmPress = async () => {
    if (isAlarmActive) {
      stopAlarm();
    } else {
      await startAlarm();
      // Track alarm activation
      await trackAlarmActivation();
    }
  };

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />

      <SOSCameraCapture
        visible={showCamera}
        onCapture={handleCameraCapture}
        onClose={() => {
          setShowCamera(false);
          setIsSOSActive(false);
          setSOSCountdown(5);
        }}
      />

      <AlarmOverlay
        visible={isAlarmActive}
        onStop={stopAlarm}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 36,
              color: theme.colors.neonCyan,
              letterSpacing: 2,
              textShadowColor: theme.colors.glowColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            MAITRI
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Shield size={16} color={theme.colors.neonCyan} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: theme.colors.textSecondary,
                marginLeft: 6,
                letterSpacing: 1,
              }}
            >
              Your AI-Powered Safety Guardian
            </Text>
          </View>
        </View>

        {/* Main SOS Button with Glow */}
        <View style={{ alignItems: "center", marginBottom: 50 }}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            {/* Outer glow ring */}
            <Animated.View
  style={{
    position: "absolute",

    // center glow ring
    top: -10,
    left: -10,

    width: 240,
    height: 240,
    borderRadius: 120,

    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: theme.colors.neonCyan,
    opacity: glowOpacity,

    shadowColor: theme.colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  }}
/>

            
            <TouchableOpacity
              data-testid="sos-button"
              onPress={handleSOSPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSOSActive ? ['#FFD700', '#FF8C00'] : theme.colors.sosGradient}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: isSOSActive ? '#FFD700' : theme.colors.neonPink,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 25,
                  elevation: 15,
                }}
              >
                <View style={{
                  width: 190,
                  height: 190,
                  borderRadius: 95,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {isSOSActive ? (
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 52,
                          color: "#FFFFFF",
                          marginBottom: 8,
                        }}
                      >
                        {sosCountdown}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 13,
                          color: "#FFFFFF",
                          letterSpacing: 1,
                        }}
                      >
                        TAP TO CANCEL
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <AlertCircle size={60} color="#FFFFFF" strokeWidth={2.5} />
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 28,
                          color: "#FFFFFF",
                          marginTop: 12,
                          letterSpacing: 3,
                        }}
                      >
                        SOS
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: theme.colors.textSecondary,
              textAlign: "center",
              marginTop: 20,
              lineHeight: 20,
            }}
          >
            Press for instant emergency alert to all{"\n"}
            trusted contacts
          </Text>
        </View>

        {/* Quick Access Section */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: theme.colors.text,
                marginHorizontal: 16,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              Quick Access
            </Text>
            <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
          </View>

          {/* 2x3 Grid */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            {/* Fake Call */}
            <TouchableOpacity
              data-testid="fake-call-button"
              style={{ flex: 1 }}
              onPress={() => router.push("/fake-call")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 45, 149, 0.2)', 'rgba(156, 39, 255, 0.1)']}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  minHeight: 140,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(255, 45, 149, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Phone size={26} color={theme.colors.neonPink} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  Fake Call
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Live Track */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push("/(tabs)/map")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  minHeight: 140,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0, 229, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <MapPin size={26} color={theme.colors.neonCyan} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  Live Track
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            {/* Loud Alarm */}
            <TouchableOpacity
              data-testid="loud-alarm-button"
              style={{ flex: 1 }}
              onPress={handleLoudAlarmPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isAlarmActive ? ['#FFD700', '#FF8C00'] : ['rgba(255, 165, 0, 0.2)', 'rgba(255, 140, 0, 0.1)']}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isAlarmActive ? '#FFD700' : theme.colors.borderLight,
                  minHeight: 140,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: isAlarmActive ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 165, 0, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Volume2 size={26} color={isAlarmActive ? '#FFFFFF' : theme.colors.warning} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: isAlarmActive ? '#000000' : theme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  {isAlarmActive ? 'Stop Alarm' : 'Loud Alarm'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Safe Routes */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push("/(tabs)/map")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(0, 229, 160, 0.2)', 'rgba(0, 191, 165, 0.1)']}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  minHeight: 140,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0, 229, 160, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Shield size={26} color={theme.colors.safe} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  Safe Routes
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            {/* Emergency Contacts */}
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => router.push("/emergency-contacts")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(156, 39, 255, 0.2)', 'rgba(75, 200, 230, 0.1)']}
                style={{
                  borderRadius: 20,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                  minHeight: 140,
                  justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(156, 39, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                  <Users size={26} color={theme.colors.neonPurple} strokeWidth={2} />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}
                >
                  Contacts
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Empty slot for future feature or leave as is */}
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* Safety Insight Panel */}
        <LinearGradient
          colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
          style={{
            borderRadius: 20,
            padding: 24,
            borderWidth: 1,
            borderColor: theme.colors.borderLight,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Shield size={20} color={theme.colors.neonCyan} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: theme.colors.text,
                marginLeft: 10,
                letterSpacing: 1,
              }}
            >
              Safety Insight
            </Text>
          </View>

          {/* AI Monitoring Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 229, 160, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Eye size={20} color={theme.colors.safe} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: 2,
                }}
              >
                AI-powered location monitoring active
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                }}
              >
                Your safety network is connected and ready 24/7
              </Text>
            </View>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.safe,
              shadowColor: theme.colors.safe,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }} />
          </View>

          {/* Network Connection Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 229, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
              <Activity size={20} color={theme.colors.neonCyan} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: theme.colors.text,
                  marginBottom: 2,
                }}
              >
                Network Connection
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                }}
              >
                All emergency services are operational
              </Text>
            </View>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.neonCyan,
              shadowColor: theme.colors.neonCyan,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }} />
          </View>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}