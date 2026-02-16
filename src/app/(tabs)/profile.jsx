
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Bell,
  Eye,
  Lock,
  ChevronRight,
  Heart,
  Users,
  HelpCircle,
  LogOut,
  Settings,
} from "lucide-react-native";
import { useTheme } from "@/utils/useTheme";
import LoadingScreen from "@/components/LoadingScreen";
import ActionButton from "@/components/ActionButton";
import TopNavbar from "@/components/TopNavbar";
import { auth } from "@/config/firebaseConfig";
import { getUserDetails } from "@/services/userService";
import { getUserAlertCount } from "@/services/safetyAlertService";
import { signOut } from "firebase/auth";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [locationSharing, setLocationSharing] = useState(true);
  const [aiMonitoring, setAIMonitoring] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [voiceActivation, setVoiceActivation] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertsCount, setAlertsCount] = useState(0);
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  // Refresh alert count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const user = auth.currentUser;
      if (user) {
        loadAlertCount(user.uid);
      }
    }, [])
  );

  const loadAlertCount = async (userId) => {
    try {
      const count = await getUserAlertCount(userId);
      setAlertsCount(count);
    } catch (error) {
      console.error("Error loading alert count:", error);
    }
  };

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDetails = await getUserDetails(user.uid);
        
        // Handle emergency contacts count properly
        let contactsCount = 0;
        if (userDetails?.emergencyContacts) {
          contactsCount = Array.isArray(userDetails.emergencyContacts) 
            ? userDetails.emergencyContacts.length 
            : 0;
        }
        
        setUserProfile({
          name: userDetails?.name || "User",
          email: user.email,
          phone: userDetails?.emergencyContacts?.[0]?.phone || userDetails?.emergencyContacts?.[0] || "N/A",
          emergencyContacts: contactsCount,
          address: userDetails?.address || "",
          occupation: userDetails?.occupation || "",
        });

        // Load alert count
        await loadAlertCount(user.uid);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyContacts = () => {
    router.push("/emergency-contacts");
  };

  const handleGeoFences = () => {
    router.push("/geofences");
  };

  const handleVoiceCommands = () => {
    Alert.alert(
      "Voice Commands",
      "Configure voice commands for hands-free SOS activation.",
      [{ text: "OK" }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Settings",
      "Control your data sharing, anonymity options, and privacy preferences.",
      [{ text: "OK" }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      "Help & Support",
      "Get help, report issues, or access safety resources.",
      [
        { text: "FAQ", onPress: () => console.log("FAQ") },
        { text: "Contact Support", onPress: () => console.log("Support") },
        { text: "Safety Resources", onPress: () => console.log("Resources") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };



  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? This will disable safety monitoring until you sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/auth/login");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        },
      ]
    );
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  if (!userProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error loading profile</Text>
      </View>
    );
  }

  const SettingItem = ({ icon: IconComponent, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: -16,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.colors.buttonBackground,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <IconComponent size={16} color={theme.colors.text} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 16,
            color: theme.colors.text,
            marginBottom: subtitle ? 2 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: theme.colors.textSecondary,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || <ChevronRight size={16} color={theme.colors.textSecondary} strokeWidth={1.5} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Top Navbar */}
      <TopNavbar title="Profile" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: theme.colors.textSecondary,
            }}
          >
            Manage your safety preferences & account
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: theme.colors.success,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                }}
              >
                <User size={28} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                    color: theme.colors.text,
                    marginBottom: 2,
                  }}
                >
                  {userProfile.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: theme.colors.textSecondary,
                  }}
                >
                  {userProfile.email}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: theme.colors.divider,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 20,
                    color: theme.colors.text,
                  }}
                >
                  {userProfile.emergencyContacts}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Emergency{"\n"}Contacts
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 20,
                    color: theme.colors.text,
                  }}
                  data-testid="alert-count"
                >
                  {alertsCount}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    color: theme.colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Safety{"\n"}Alerts
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Safety Settings */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.colors.text,
              marginBottom: 16,
            }}
          >
            Safety Settings
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <SettingItem
              icon={MapPin}
              title="Location Sharing"
              subtitle="Share location with trusted contacts"
              rightElement={
                <Switch
                  value={locationSharing}
                  onValueChange={setLocationSharing}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.success }}
                />
              }
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Eye}
              title="AI Monitoring"
              subtitle="Smart surveillance and threat detection"
              rightElement={
                <Switch
                  value={aiMonitoring}
                  onValueChange={setAIMonitoring}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.success }}
                />
              }
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Bell}
              title="Push Notifications"
              subtitle="Get alerts and safety updates"
              rightElement={
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.success }}
                />
              }
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Phone}
              title="Voice Activation"
              subtitle="Enable voice commands for SOS"
              rightElement={
                <Switch
                  value={voiceActivation}
                  onValueChange={setVoiceActivation}
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.success }}
                />
              }
            />
          </View>
        </View>

        {/* Account Settings */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.colors.text,
              marginBottom: 16,
            }}
          >
            Account Settings
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <SettingItem
              icon={Heart}
              title="Emergency Contacts"
              subtitle="Manage who gets notified in emergencies"
              onPress={handleEmergencyContacts}
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Shield}
              title="Geo-fences"
              subtitle="Set up safety boundaries and alerts"
              onPress={handleGeoFences}
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Settings}
              title="Voice Commands"
              subtitle="Configure voice activation settings"
              onPress={handleVoiceCommands}
            />

            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.divider,
                marginVertical: 8,
              }}
            />

            <SettingItem
              icon={Lock}
              title="Privacy & Security"
              subtitle="Control data sharing and privacy"
              onPress={handlePrivacy}
            />
          </View>
        </View>

        {/* Support */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.colors.text,
              marginBottom: 16,
            }}
          >
            Support
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <SettingItem
              icon={HelpCircle}
              title="Help & Support"
              subtitle="Get help and access safety resources"
              onPress={handleSupport}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 24 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.elevated,
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={theme.colors.error} strokeWidth={1.5} />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                color: theme.colors.error,
                marginLeft: 8,
              }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}