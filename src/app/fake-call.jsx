import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Dimensions,
  Animated,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Phone, PhoneOff, User, ArrowLeft } from "lucide-react-native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { Asset } from "expo-asset";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/utils/useTheme";

const { width, height } = Dimensions.get("window");

const FAKE_CONTACTS = [
  { id: '1', name: 'Mom', phone: '+1 (555) 123-4567', color: '#9C27FF' },
  { id: '2', name: 'Dad', phone: '+1 (555) 234-5678', color: '#FF2D95' },
  { id: '3', name: 'Best Friend', phone: '+1 (555) 345-6789', color: '#00E5FF' },
  { id: '4', name: 'Work', phone: '+1 (555) 456-7890', color: '#00E5A0' },
];

export default function FakeCallScreen() {
  const [sound, setSound] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [selectedContact, setSelectedContact] = useState(null);
  const [inCall, setInCall] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (inCall) {
      playRingtone();
      const vibrationPattern = [1000, 1000];
      Vibration.vibrate(vibrationPattern, true);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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
    }

    return () => {
      Vibration.cancel();
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
      }
    };
  }, [inCall]);

  const playRingtone = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const ringtoneAsset = Asset.fromModule(require('../../assets/audio/ringtone.mp3'));
      await ringtoneAsset.downloadAsync();
      
      const { sound: ringtone } = await Audio.Sound.createAsync(
        { uri: ringtoneAsset.localUri || ringtoneAsset.uri },
        { shouldPlay: true, isLooping: true, volume: 0.8 }
      );
      setSound(ringtone);
    } catch (error) {
      console.log("Error playing ringtone:", error);
    }
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setInCall(true);
  };

  const handleAccept = async () => {
    Vibration.cancel();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    router.replace("/in-call");
  };

  const handleDecline = async () => {
    Vibration.cancel();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    if (inCall) {
      setInCall(false);
      setSelectedContact(null);
    } else {
      router.back();
    }
  };

  if (inCall && selectedContact) {
    return (
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.container}
      >
        {/* Incoming Call Screen */}
        <View style={styles.topSection}>
          <Text style={[styles.callStatus, { color: theme.colors.neonCyan }]}>Incoming Call</Text>
          
          <Animated.View
            style={[
              styles.avatarContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <LinearGradient
              colors={[selectedContact.color, theme.colors.neonPurple]}
              style={styles.avatar}
            >
              <User size={80} color="#FFFFFF" strokeWidth={1.5} />
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.callerName, { color: theme.colors.text }]}>{selectedContact.name}</Text>
          <Text style={[styles.callerNumber, { color: theme.colors.textSecondary }]}>{selectedContact.phone}</Text>
          
          <View style={[styles.callerDetails, { backgroundColor: 'rgba(0, 229, 255, 0.2)' }]}>
            <Text style={styles.callerLabel}>Mobile</Text>
          </View>
        </View>

        {/* Bottom Section - Action Buttons */}
        <View style={styles.bottomSection}>
          <View style={styles.actionButtons}>
            {/* Decline Button */}
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.8}
              data-testid="decline-call-button"
            >
              <LinearGradient
                colors={['#FF4757', '#FF2D95']}
                style={styles.buttonInner}
              >
                <PhoneOff size={32} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.buttonLabel}>Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.8}
              data-testid="accept-call-button"
            >
              <LinearGradient
                colors={['#00E5A0', '#00BFA5']}
                style={styles.buttonInner}
              >
                <Phone size={32} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.buttonLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  // Contact Selection Screen
  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.borderLight,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.neonCyan,
            }}
          >
            <ArrowLeft size={20} color={theme.colors.neonCyan} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 24,
              color: theme.colors.neonPink,
              letterSpacing: 2,
              textShadowColor: 'rgba(255, 45, 149, 0.5)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 15,
            }}>
              FAKE CALL
            </Text>
            <Text style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: theme.colors.textSecondary,
              marginTop: 4,
            }}>
              Exit uncomfortable situations safely
            </Text>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Contact List */}
      <View style={{ flex: 1, padding: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
          <Text style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 14,
            color: theme.colors.text,
            marginHorizontal: 16,
            letterSpacing: 2,
          }}>
            CHOOSE CALLER
          </Text>
          <View style={{ height: 2, flex: 1, backgroundColor: theme.colors.borderLight }} />
        </View>

        <FlatList
          data={FAKE_CONTACTS}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleContactSelect(item)}
              activeOpacity={0.8}
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: 'rgba(75, 200, 230, 0.3)',
              }}
            >
              <LinearGradient
                colors={['rgba(30, 35, 60, 0.8)', 'rgba(20, 25, 50, 0.6)']}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 20,
                }}
              >
                <LinearGradient
                  colors={[item.color, theme.colors.neonPurple]}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                    shadowColor: item.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                    elevation: 8,
                  }}
                >
                  <User size={30} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 18,
                    color: theme.colors.text,
                    marginBottom: 4,
                  }}>
                    {item.name}
                  </Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: theme.colors.textSecondary,
                  }}>
                    {item.phone}
                  </Text>
                </View>
                
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(0, 229, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Phone size={20} color={theme.colors.neonCyan} strokeWidth={2} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  callStatus: {
    fontSize: 16,
    fontWeight: "400",
    marginBottom: 40,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  avatarContainer: {
    marginBottom: 32,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: '#9C27FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
  },
  callerName: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 8,
  },
  callerNumber: {
    fontSize: 18,
    marginBottom: 16,
  },
  callerDetails: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  callerLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  bottomSection: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 32,
  },
  declineButton: {
    alignItems: "center",
  },
  acceptButton: {
    alignItems: "center",
  },
  buttonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: '#FF2D95',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});


