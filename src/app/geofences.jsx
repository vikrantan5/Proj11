import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import {
  MapPin,
  Shield,
  Home,
  Briefcase,
  Heart,
  Plus,
  ChevronLeft,
} from "lucide-react-native";
import { useTheme } from "@/utils/useTheme";
import LoadingScreen from "@/components/LoadingScreen";
import { router } from "expo-router";
import {
  getCurrentLocation,
  requestLocationPermissions,
} from "@/services/locationService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function GeofencesScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geofences, setGeofences] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    initializeMap();
    loadGeofences();
  }, []);

  const initializeMap = async () => {
    try {
      const hasPermission = await requestLocationPermissions(false);
      if (!hasPermission) {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access to view geofences.",
          [{ text: "OK" }]
        );
        setIsLoadingLocation(false);
        return;
      }

      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setIsLoadingLocation(false);
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoadingLocation(false);
      Alert.alert("Error", "Failed to get your location.");
    }
  };

  const loadGeofences = () => {
    // Mock geofence data - in production, fetch from Firebase
    const mockGeofences = [
      {
        id: "1",
        name: "Home Safe Zone",
        type: "home",
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        radius: 500, // meters
        enabled: true,
        notifications: true,
      },
      {
        id: "2",
        name: "Work Area",
        type: "work",
        coordinates: {
          latitude: 40.7580,
          longitude: -73.9855,
        },
        radius: 300,
        enabled: true,
        notifications: false,
      },
      {
        id: "3",
        name: "Family Location",
        type: "family",
        coordinates: {
          latitude: 40.7300,
          longitude: -74.0000,
        },
        radius: 400,
        enabled: true,
        notifications: true,
      },
    ];
    setGeofences(mockGeofences);
  };

  const getGeofenceIcon = (type) => {
    switch (type) {
      case "home":
        return Home;
      case "work":
        return Briefcase;
      case "family":
        return Heart;
      default:
        return Shield;
    }
  };

  const getGeofenceColor = (type) => {
    switch (type) {
      case "home":
        return theme.colors.success;
      case "work":
        return theme.colors.warning;
      case "family":
        return theme.colors.safe;
      default:
        return theme.colors.textSecondary;
    }
  };

  const handleAddGeofence = () => {
    Alert.alert(
      "Add Geofence",
      "This feature allows you to create custom safety zones. Coming soon!",
      [{ text: "OK" }]
    );
  };

  const handleGeofencePress = (geofence) => {
    Alert.alert(
      geofence.name,
      `Radius: ${geofence.radius}m\nNotifications: ${geofence.enabled ? "On" : "Off"}`,
      [
        { text: "View Details", onPress: () => console.log("View details") },
        { text: "Close", style: "cancel" },
      ]
    );
  };

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: theme.colors.background,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ChevronLeft size={24} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 20,
              color: theme.colors.text,
            }}
          >
            Geofences
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: theme.colors.textSecondary,
            }}
          >
            Your safety zones & boundaries
          </Text>
        </View>
        <TouchableOpacity onPress={handleAddGeofence}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.success,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={{ flex: 1 }}>
        {isLoadingLocation ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.colors.elevated,
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.success} />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                color: theme.colors.textSecondary,
                marginTop: 16,
              }}
            >
              Loading Geofences...
            </Text>
          </View>
        ) : currentLocation ? (
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsMyLocationButton
            data-testid="geofence-map-view"
          >
            {/* Geofence Circles and Markers */}
            {geofences.map((geofence) => {
              const IconComponent = getGeofenceIcon(geofence.type);
              const color = getGeofenceColor(geofence.type);

              return (
                <React.Fragment key={geofence.id}>
                  {/* Geofence Circle */}
                  <Circle
                    center={{
                      latitude: geofence.coordinates.latitude,
                      longitude: geofence.coordinates.longitude,
                    }}
                    radius={geofence.radius}
                    fillColor={`${color}30`}
                    strokeColor={color}
                    strokeWidth={2}
                  />
                  {/* Geofence Marker */}
                  <Marker
                    coordinate={{
                      latitude: geofence.coordinates.latitude,
                      longitude: geofence.coordinates.longitude,
                    }}
                    title={geofence.name}
                    description={`${geofence.radius}m radius`}
                    pinColor={color}
                    onPress={() => handleGeofencePress(geofence)}
                  />
                </React.Fragment>
              );
            })}
          </MapView>
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.colors.elevated,
            }}
          >
            <MapPin
              size={48}
              color={theme.colors.textSecondary}
              strokeWidth={1.5}
            />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                color: theme.colors.textSecondary,
                marginTop: 16,
              }}
            >
              Location not available
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet - Geofence List */}
      <View
        style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          maxHeight: 280,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: theme.colors.text,
              marginBottom: 16,
            }}
          >
            Active Geofences ({geofences.length})
          </Text>

          {geofences.map((geofence, index) => {
            const IconComponent = getGeofenceIcon(geofence.type);
            const color = getGeofenceColor(geofence.type);

            return (
              <TouchableOpacity
                key={geofence.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.colors.elevated,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
                onPress={() => handleGeofencePress(geofence)}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: color,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <IconComponent size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                      color: theme.colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {geofence.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {geofence.radius}m radius • {geofence.enabled ? "Active" : "Inactive"}
                  </Text>
                </View>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: geofence.enabled ? theme.colors.success : theme.colors.textTertiary,
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
