import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
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
  Shield,
  AlertCircle,
  Volume2,
  Mic,
  Camera,
  Upload,
  MessageSquare,
  CheckCircle,
  XCircle,
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

// SOS Progress Steps
const SOS_STEPS = [
  { key: 'audio', label: 'Recording Audio', icon: Mic },
  { key: 'camera', label: 'Capturing Photo', icon: Camera },
  { key: 'location', label: 'Getting Location', icon: MapPin },
  { key: 'upload', label: 'Uploading Evidence', icon: Upload },
  { key: 'sms', label: 'Sending Alerts', icon: MessageSquare },
  { key: 'call', label: 'Emergency Call', icon: Phone },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [sosCountdown, setSOSCountdown] = useState(5);
  const [showCamera, setShowCamera] = useState(false);
  const [showSOSProgress, setShowSOSProgress] = useState(false);
  const [sosProgress, setSOSProgress] = useState({});
  const [sosResult, setSOSResult] = useState(null);
  const [showSOSResult, setShowSOSResult] = useState(false);
  const theme = useTheme();

  const { isAlarmActive, startAlarm, stopAlarm } = useLoudAlarm();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.APP_OPENED);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
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

  const handleProgressUpdate = useCallback(({ step, status }) => {
    setSOSProgress(prev => ({ ...prev, [step]: status }));
  }, []);

  const handleSOSActivation = async (photoUri = null) => {
    try {
      setShowSOSProgress(true);
      setSOSProgress({});
      setSOSResult(null);

      const result = await triggerSOS(photoUri, handleProgressUpdate);

      await trackSOSActivation(result);

      setSOSResult(result);
      setShowSOSProgress(false);
      setShowSOSResult(true);
    } catch (error) {
      console.error('SOS activation failed:', error);
      setShowSOSProgress(false);
      setSOSResult({
        success: false,
        error: error.message || 'Failed to send emergency alert.',
      });
      setShowSOSResult(true);
    }
  };

  const handleLoudAlarmPress = async () => {
    if (isAlarmActive) {
      stopAlarm();
    } else {
      await startAlarm();
      await trackAlarmActivation();
    }
  };

  const dismissResult = () => {
    setShowSOSResult(false);
    setSOSResult(null);
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

      <AlarmOverlay visible={isAlarmActive} onStop={stopAlarm} />

      {/* SOS Progress Modal */}
      <SOSProgressModal
        visible={showSOSProgress}
        progress={sosProgress}
        theme={theme}
      />

      {/* SOS Result Modal */}
      <SOSResultModal
        visible={showSOSResult}
        result={sosResult}
        onDismiss={dismissResult}
        theme={theme}
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

        {/* Main SOS Button */}
        <View style={{ alignItems: "center", marginBottom: 50 }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Animated.View
              style={{
                position: "absolute",
                top: -10, left: -10,
                width: 240, height: 240,
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
                  width: 220, height: 220,
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
                  width: 190, height: 190,
                  borderRadius: 95,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  {isSOSActive ? (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 52,
                        color: "#FFFFFF",
                        marginBottom: 8,
                      }}>
                        {sosCountdown}
                      </Text>
                      <Text style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                        color: "#FFFFFF",
                        letterSpacing: 1,
                      }}>
                        TAP TO CANCEL
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <AlertCircle size={60} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 28,
                        color: "#FFFFFF",
                        marginTop: 12,
                        letterSpacing: 3,
                      }}>
                        SOS
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: theme.colors.textSecondary,
            textAlign: "center",
            marginTop: 20,
            lineHeight: 20,
          }}>
            Press for instant emergency alert{"\n"}
            Audio + Photo + Location sent to contacts
          </Text>
        </View>

        {/* Quick Access Section */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
            <Text style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: theme.colors.text,
              marginHorizontal: 16,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              Quick Access
            </Text>
            <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
          </View>

          {/* Row 1 */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            <QuickAccessCard
              testId="fake-call-button"
              icon={Phone}
              label="Fake Call"
              iconColor={theme.colors.neonPink}
              gradientColors={['rgba(255, 45, 149, 0.2)', 'rgba(156, 39, 255, 0.1)']}
              bgColor="rgba(255, 45, 149, 0.2)"
              theme={theme}
              onPress={() => router.push("/fake-call")}
            />
            <QuickAccessCard
              icon={MapPin}
              label="Live Track"
              iconColor={theme.colors.neonCyan}
              gradientColors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
              bgColor="rgba(0, 229, 255, 0.2)"
              theme={theme}
              onPress={() => router.push("/(tabs)/map")}
            />
          </View>

          {/* Row 2 */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            <QuickAccessCard
              testId="loud-alarm-button"
              icon={Volume2}
              label={isAlarmActive ? 'Stop Alarm' : 'Loud Alarm'}
              iconColor={isAlarmActive ? '#FFFFFF' : theme.colors.warning}
              gradientColors={isAlarmActive ? ['#FFD700', '#FF8C00'] : ['rgba(255, 165, 0, 0.2)', 'rgba(255, 140, 0, 0.1)']}
              bgColor={isAlarmActive ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 165, 0, 0.2)'}
              borderColor={isAlarmActive ? '#FFD700' : theme.colors.borderLight}
              textColor={isAlarmActive ? '#000000' : theme.colors.text}
              theme={theme}
              onPress={handleLoudAlarmPress}
            />
            <QuickAccessCard
              icon={Shield}
              label="Safe Routes"
              iconColor={theme.colors.safe}
              gradientColors={['rgba(0, 229, 160, 0.2)', 'rgba(0, 191, 165, 0.1)']}
              bgColor="rgba(0, 229, 160, 0.2)"
              theme={theme}
              onPress={() => router.push("/(tabs)/map")}
            />
          </View>

          {/* Row 3 */}
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <QuickAccessCard
              icon={Users}
              label="Contacts"
              iconColor={theme.colors.neonPurple}
              gradientColors={['rgba(156, 39, 255, 0.2)', 'rgba(75, 200, 230, 0.1)']}
              bgColor="rgba(156, 39, 255, 0.2)"
              theme={theme}
              onPress={() => router.push("/emergency-contacts")}
            />
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
            <Text style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: theme.colors.text,
              marginLeft: 10,
              letterSpacing: 1,
            }}>
              Safety Insight
            </Text>
          </View>

          <InsightRow
            icon={Eye}
            iconColor={theme.colors.safe}
            bgColor="rgba(0, 229, 160, 0.2)"
            title="AI-powered location monitoring active"
            subtitle="Your safety network is connected and ready 24/7"
            dotColor={theme.colors.safe}
            theme={theme}
          />
          <View style={{ height: 16 }} />
          <InsightRow
            icon={Activity}
            iconColor={theme.colors.neonCyan}
            bgColor="rgba(0, 229, 255, 0.2)"
            title="SOS System Enhanced"
            subtitle="Audio + Photo + Location auto-capture enabled"
            dotColor={theme.colors.neonCyan}
            theme={theme}
          />
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}

// --- Sub-components ---

function QuickAccessCard({ testId, icon: Icon, label, iconColor, gradientColors, bgColor, borderColor, textColor, theme, onPress }) {
  return (
    <TouchableOpacity
      data-testid={testId}
      style={{ flex: 1 }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        style={{
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: borderColor || theme.colors.borderLight,
          minHeight: 140,
          justifyContent: 'center',
        }}
      >
        <View style={{
          width: 50, height: 50,
          borderRadius: 25,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <Icon size={26} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={{
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: textColor || theme.colors.text,
          textAlign: 'center',
        }}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function InsightRow({ icon: Icon, iconColor, bgColor, title, subtitle, dotColor, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: "Inter_500Medium",
          fontSize: 14,
          color: theme.colors.text,
          marginBottom: 2,
        }}>
          {title}
        </Text>
        <Text style={{
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          color: theme.colors.textSecondary,
        }}>
          {subtitle}
        </Text>
      </View>
      <View style={{
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: dotColor,
        shadowColor: dotColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      }} />
    </View>
  );
}

// --- SOS Progress Modal ---

function SOSProgressModal({ visible, progress, theme }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
      }}>
        <View style={{
          width: 80, height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255, 45, 149, 0.2)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24,
          borderWidth: 2,
          borderColor: 'rgba(255, 45, 149, 0.5)',
        }}>
          <ActivityIndicator size="large" color="#FF2D95" />
        </View>

        <Text style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 24,
          color: '#FFFFFF',
          marginBottom: 8,
          letterSpacing: 2,
        }}>
          SOS IN PROGRESS
        </Text>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.6)',
          marginBottom: 32,
          textAlign: 'center',
        }}>
          Recording audio, capturing evidence...
        </Text>

        {/* Steps */}
        <View style={{ width: '100%', gap: 12 }}>
          {SOS_STEPS.map((step) => {
            const status = progress[step.key];
            const Icon = step.icon;
            const isActive = !!status;
            const isDone = status === 'success' || status === 'sent' || status === 'captured' || status === 'done';

            return (
              <View key={step.key} style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderRadius: 12,
                padding: 12,
              }}>
                <View style={{
                  width: 36, height: 36,
                  borderRadius: 18,
                  backgroundColor: isDone ? 'rgba(0, 229, 160, 0.2)' : isActive ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  {isDone ? (
                    <CheckCircle size={18} color="#00E5A0" strokeWidth={2} />
                  ) : isActive ? (
                    <ActivityIndicator size="small" color="#FFA500" />
                  ) : (
                    <Icon size={18} color="rgba(255, 255, 255, 0.3)" strokeWidth={1.5} />
                  )}
                </View>
                <Text style={{
                  fontFamily: isActive ? 'Inter_500Medium' : 'Inter_400Regular',
                  fontSize: 14,
                  color: isDone ? '#00E5A0' : isActive ? '#FFA500' : 'rgba(255, 255, 255, 0.3)',
                  flex: 1,
                }}>
                  {step.label}
                </Text>
                {isDone && (
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 11,
                    color: '#00E5A0',
                  }}>Done</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// --- SOS Result Modal ---

function SOSResultModal({ visible, result, onDismiss, theme }) {
  if (!visible || !result) return null;

  const isSuccess = result.success;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        padding: 24,
      }}>
        <View style={{
          backgroundColor: '#1A1D2E',
          borderRadius: 24,
          padding: 28,
          borderWidth: 1,
          borderColor: isSuccess ? 'rgba(0, 229, 160, 0.3)' : 'rgba(255, 60, 60, 0.3)',
        }}>
          {/* Status Icon */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 64, height: 64,
              borderRadius: 32,
              backgroundColor: isSuccess ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 60, 60, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {isSuccess ? (
                <CheckCircle size={36} color="#00E5A0" strokeWidth={2} />
              ) : (
                <XCircle size={36} color="#FF3C3C" strokeWidth={2} />
              )}
            </View>
          </View>

          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 22,
            color: '#FFFFFF',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            {isSuccess ? 'SOS Alert Sent!' : 'SOS Error'}
          </Text>

          {/* Details */}
          {isSuccess ? (
            <View style={{ gap: 10 }}>
              {result.audioRecording?.uploaded && (
                <ResultRow icon={Mic} label="Audio evidence uploaded" success />
              )}
              {result.audioRecording?.captured && !result.audioRecording?.uploaded && (
                <ResultRow icon={Mic} label="Audio recorded (upload failed)" warning />
              )}
              {!result.audioRecording?.started && (
                <ResultRow icon={Mic} label="Audio recording unavailable" fail />
              )}

              {result.imageUrl && (
                <ResultRow icon={Camera} label="Photo evidence uploaded" success />
              )}
              {result.photoCapture?.skipped && (
                <ResultRow icon={Camera} label="Photo capture skipped" neutral />
              )}
              {result.imageUploadError && (
                <ResultRow icon={Camera} label={`Photo: ${result.imageUploadError}`} warning />
              )}

              {result.location && (
                <ResultRow icon={MapPin} label={`Location shared`} success />
              )}
              {!result.location && (
                <ResultRow icon={MapPin} label="Location unavailable" fail />
              )}

              {result.sms?.success && (
                <ResultRow icon={MessageSquare} label={`SMS sent to ${result.sms.sentTo} contact(s)`} success />
              )}
              {result.sms?.error && (
                <ResultRow icon={MessageSquare} label={`SMS: ${result.sms.error}`} warning />
              )}

              {result.call?.success && (
                <ResultRow icon={Phone} label={result.call.message} success />
              )}
              {result.call?.error && (
                <ResultRow icon={Phone} label={`Call: ${result.call.error}`} warning />
              )}
            </View>
          ) : (
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {result.error || 'Failed to send emergency alert.'}
            </Text>
          )}

          {/* Dismiss Button */}
          <TouchableOpacity
            data-testid="sos-result-dismiss"
            onPress={onDismiss}
            style={{
              backgroundColor: isSuccess ? '#00E5A0' : '#FF3C3C',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              marginTop: 24,
            }}
          >
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: isSuccess ? '#000000' : '#FFFFFF',
            }}>
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ResultRow({ icon: Icon, label, success, warning, fail, neutral }) {
  let color = 'rgba(255, 255, 255, 0.5)';
  if (success) color = '#00E5A0';
  if (warning) color = '#FFA500';
  if (fail) color = '#FF3C3C';

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    }}>
      <Icon size={16} color={color} strokeWidth={2} style={{ marginRight: 10 }} />
      <Text style={{
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color,
        flex: 1,
      }}>
        {label}
      </Text>
    </View>
  );
}
