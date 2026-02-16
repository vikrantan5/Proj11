

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  MapPin,
  Navigation,
  Shield,
  AlertTriangle,
  Eye,
  Plus,
  Zap,
  ThumbsUp,
  CheckCircle,
  Info,
} from "lucide-react-native";
import { useTheme } from "@/utils/useTheme";
import LoadingScreen from "@/components/LoadingScreen";
import ActionButton from "@/components/ActionButton";
import TopNavbar from "@/components/TopNavbar";
import SafetyMarkerModalEnhanced from "@/components/SafetyMarkerModalEnhanced";
// import VerificationModal from "@/components/VerificationModal";
import {
  subscribeToSafetyMarkers,
  upvoteSafetyMarker,
  hasUserUpvotedMarker,
  calculateDistance,
  getPendingVerificationMarkers,
  getSafetyScoreCategory,
} from "@/services/safetyMapService";
import {
  getCurrentLocation,
  requestLocationPermissions,
  startForegroundLocationMonitoring,
} from "@/services/locationService";
import {
  getSafestRoute,
  getFastestRoute,
} from "@/services/routeCalculationService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function SafetyMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [safetyMarkers, setSafetyMarkers] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState("safest");
  const [nearbyMarkers, setNearbyMarkers] = useState([]);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [route, setRoute] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [locationMonitoring, setLocationMonitoring] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  // const [showVerificationModal, setShowVerificationModal] = useState(false);
  // const [selectedMarkerForVerification, setSelectedMarkerForVerification] = useState(null);
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Initialize location and markers
  useEffect(() => {
    initializeMap();
    
    // Cleanup on unmount
    return () => {
      if (locationMonitoring) {
        locationMonitoring.remove();
      }
    };
  }, []);

  // Subscribe to safety markers
  useEffect(() => {
    const unsubscribe = subscribeToSafetyMarkers((markers) => {
      setSafetyMarkers(markers);
      updateNearbyMarkers(markers, currentLocation);
    });

    return () => unsubscribe();
  }, [currentLocation]);

  // Check for pending verifications when location changes
  useEffect(() => {
    if (currentLocation) {
      checkPendingVerifications();
    }
  }, [currentLocation]);

  const initializeMap = async () => {
    try {
      // Request location permissions
      const hasPermission = await requestLocationPermissions(false);
      if (!hasPermission) {
        Alert.alert(
          "Location Permission Required",
          "Please enable location access to use the safety map features.",
          [{ text: "OK" }]
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      setIsLoadingLocation(false);

      // Start foreground location monitoring
      const monitoring = await startForegroundLocationMonitoring((dangerZone) => {
        console.log("Danger zone detected:", dangerZone);
      });
      setLocationMonitoring(monitoring);

      console.log("✅ Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
      setIsLoadingLocation(false);
      Alert.alert(
        "Error",
        "Failed to initialize map. Please check location permissions and try again."
      );
    }
  };

  const checkPendingVerifications = async () => {
    try {
      const pending = await getPendingVerificationMarkers(currentLocation, 0.5);
      setPendingVerifications(pending);
      
      if (pending.length > 0) {
        console.log(`📍 Found ${pending.length} markers pending verification nearby`);
      }
    } catch (error) {
      console.error('Error checking pending verifications:', error);
    }
  };

  const updateNearbyMarkers = (markers, location) => {
    if (!location || !markers) return;

    const nearby = markers
      .map((marker) => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          marker.coordinates.latitude,
          marker.coordinates.longitude
        );
        return { ...marker, distance };
      })
      .filter((marker) => marker.distance <= 2) // Within 2km
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Top 5 nearest

    setNearbyMarkers(nearby);
  };

  const handleMapLongPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCoordinates({ latitude, longitude });
    setShowMarkerModal(true);
  };

  const handleUpvoteMarker = async (markerId) => {
    try {
      await upvoteSafetyMarker(markerId);
    } catch (error) {
      console.error("Failed to upvote marker:", error);
    }
  };

  const handleVerifyMarker = (marker) => {
    // Verification modal removed - show alert instead
    Alert.alert(
      "Verification Feature",
      "Marker verification is currently unavailable.",
      [{ text: "OK" }]
    );
    // setSelectedMarkerForVerification(marker);
    // setShowVerificationModal(true);
  };

  const handleRouteSelect = (routeType) => {
    setSelectedRoute(routeType);
    setRoute(null); // Clear existing route
  };

  const handleStartNavigation = async () => {
    if (!currentLocation) {
      Alert.alert("Error", "Current location not available");
      return;
    }

    // For demo, use a sample destination - in production, user would select on map
    Alert.prompt(
      "Enter Destination",
      "Enter destination coordinates (lat,lng) or select on map:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Calculate Route",
          onPress: async (text) => {
            try {
              // Parse coordinates or use mock destination
              let destination = { latitude: 40.7589, longitude: -73.9851 };
              
              if (text && text.includes(',')) {
                const [lat, lng] = text.split(',').map(s => parseFloat(s.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                  destination = { latitude: lat, longitude: lng };
                }
              }

              setIsCalculatingRoute(true);
              
              let routeData;
              if (selectedRoute === "safest") {
                const result = await getSafestRoute(
                  currentLocation,
                  destination,
                  safetyMarkers
                );
                routeData = result.route;
              } else {
                routeData = await getFastestRoute(currentLocation, destination);
              }

              setRoute(routeData);
              
              // Fit map to route
              if (mapRef.current && routeData.points) {
                mapRef.current.fitToCoordinates(routeData.points, {
                  edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                  animated: true,
                });
              }

              Alert.alert(
                "Route Calculated",
                `Distance: ${(routeData.distance / 1000).toFixed(2)}km\nSafety Score: ${routeData.safetyScore || 'N/A'}/100`,
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Route calculation failed:", error);
              Alert.alert("Error", "Failed to calculate route. Please try again.");
            } finally {
              setIsCalculatingRoute(false);
            }
          },
        },
      ],
      "plain-text"
    );
  };

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  const getMarkerColor = (status) => {
    switch (status) {
      case "safe":
        return theme.colors.safe;
      case "caution":
        return theme.colors.warning;
      case "unsafe":
        return theme.colors.danger;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getMarkerIcon = (status) => {
    switch (status) {
      case "safe":
        return Shield;
      case "caution":
        return Eye;
      case "unsafe":
        return AlertTriangle;
      default:
        return MapPin;
    }
  };

  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style={theme.colors.statusBar} />

      {/* Top Navbar */}
      <TopNavbar title="Safe Map" />

      {/* Map View */}
      <View style={{ flex: 1, position: "relative" }}>
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
              Loading Safety Map...
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
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
            showsMyLocationButton
            onLongPress={handleMapLongPress}
            data-testid="safety-map-view"
          >
            {/* Safety Markers */}
            {safetyMarkers.map((marker) => {
              const scoreCategory = getSafetyScoreCategory(marker.safetyScore || 50);
              return (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.coordinates.latitude,
                    longitude: marker.coordinates.longitude,
                  }}
                  pinColor={getMarkerColor(marker.status)}
                  title={`${marker.status.toUpperCase()} Zone - ${scoreCategory.label}`}
                  description={`${scoreCategory.emoji} Safety: ${marker.safetyScore || 50}/100 | ${marker.verificationStatus === 'verified' ? '✅ Verified' : '⏳ Pending'} | ${marker.upvotes} upvotes`}
                />
              );
            })}

            {/* Route Polyline */}
            {route && route.points && (
              <Polyline
                coordinates={route.points}
                strokeColor={selectedRoute === "safest" ? theme.colors.success : theme.colors.warning}
                strokeWidth={4}
              />
            )}
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
            <MapPin size={48} color={theme.colors.textSecondary} strokeWidth={1.5} />
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

        {/* Add Marker Button (Floating) */}
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 16,
            bottom: 200,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.success,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onPress={() => {
            if (currentLocation) {
              setSelectedCoordinates(currentLocation);
              setShowMarkerModal(true);
            } else {
              Alert.alert("Error", "Current location not available");
            }
          }}
          data-testid="add-marker-button"
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>

        {/* Pending Verifications Badge */}
        {pendingVerifications.length > 0 && (
          <TouchableOpacity
            style={{
              position: "absolute",
              right: 16,
              top: insets.top + 16,
              backgroundColor: theme.colors.warning,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 24,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={() => {
              if (pendingVerifications.length > 0) {
                handleVerifyMarker(pendingVerifications[0]);
              }
            }}
            data-testid="pending-verifications-badge"
          >
            <Info size={16} color="#FFFFFF" strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 12,
                color: "#FFFFFF",
                marginLeft: 6,
              }}
            >
              {pendingVerifications.length} Marker{pendingVerifications.length > 1 ? 's' : ''} Need Verification
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Sheet */}
      <View
        style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 280 }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                color: theme.colors.text,
                marginBottom: 4,
              }}
            >
              Safe Navigation
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: theme.colors.textSecondary,
              }}
            >
              Long press on map to mark locations
            </Text>
          </View>

          {/* Route Options */}
          <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor:
                    selectedRoute === "safest" ? theme.colors.safe : theme.colors.elevated,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => handleRouteSelect("safest")}
                data-testid="route-safest"
              >
                <Shield
                  size={20}
                  color={selectedRoute === "safest" ? "#FFFFFF" : theme.colors.text}
                  strokeWidth={1.5}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    color: selectedRoute === "safest" ? "#FFFFFF" : theme.colors.text,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Safest
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor:
                    selectedRoute === "fastest" ? theme.colors.warning : theme.colors.elevated,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => handleRouteSelect("fastest")}
                data-testid="route-fastest"
              >
                <Zap
                  size={20}
                  color={selectedRoute === "fastest" ? "#FFFFFF" : theme.colors.text}
                  strokeWidth={1.5}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    color: selectedRoute === "fastest" ? "#FFFFFF" : theme.colors.text,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Fastest
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.elevated,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                  opacity: 0.6,
                }}
                disabled
              >
                <Eye size={20} color={theme.colors.text} strokeWidth={1.5} />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    color: theme.colors.text,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Well-lit
                </Text>
              </TouchableOpacity>
            </View>

            <ActionButton
              title={isCalculatingRoute ? "Calculating..." : "Calculate Safe Route"}
              onPress={handleStartNavigation}
              style={{ marginTop: 12 }}
              disabled={isCalculatingRoute}
              data-testid="calculate-route-button"
            />
          </View>

          {/* Nearby Safety Markers */}
          {nearbyMarkers.length > 0 && (
            <View style={{ paddingHorizontal: 24 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Nearby Markers ({nearbyMarkers.length})
              </Text>

              {nearbyMarkers.map((marker) => {
                const MarkerIcon = getMarkerIcon(marker.status);
                const userHasUpvoted = hasUserUpvotedMarker(marker.upvoters);
                const scoreCategory = getSafetyScoreCategory(marker.safetyScore || 50);

                return (
                  <View
                    key={marker.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.elevated,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: getMarkerColor(marker.status),
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <MarkerIcon size={16} color="#FFFFFF" strokeWidth={2} />
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
                        {marker.status.toUpperCase()} Zone
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 11,
                          color: theme.colors.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {scoreCategory.emoji} {scoreCategory.label} ({marker.safetyScore || 50}/100) • {formatDistance(marker.distance)}
                      </Text>
                      {marker.verificationStatus === 'verified' && (
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 10,
                            color: theme.colors.success,
                            marginTop: 2,
                          }}
                        >
                          ✅ Verified by {marker.verificationCount} users
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: userHasUpvoted ? theme.colors.success : theme.colors.buttonBackground,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => handleUpvoteMarker(marker.id)}
                      >
                        <ThumbsUp
                          size={12}
                          color={userHasUpvoted ? "#FFFFFF" : theme.colors.text}
                          strokeWidth={1.5}
                          fill={userHasUpvoted ? "#FFFFFF" : "transparent"}
                        />
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 11,
                            color: userHasUpvoted ? "#FFFFFF" : theme.colors.text,
                            marginLeft: 4,
                          }}
                        >
                          {marker.upvotes}
                        </Text>
                      </TouchableOpacity>
                      {marker.verificationStatus !== 'verified' && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: theme.colors.warning,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                          onPress={() => handleVerifyMarker(marker)}
                        >
                          <CheckCircle size={16} color="#FFFFFF" strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Safety Marker Modal (Enhanced with Attributes) */}
      <SafetyMarkerModalEnhanced
        visible={showMarkerModal}
        onClose={() => {
          setShowMarkerModal(false);
          setSelectedCoordinates(null);
        }}
        coordinates={selectedCoordinates}
      />

      {/* Verification Modal - Temporarily removed */}
      {/* <VerificationModal
        visible={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setSelectedMarkerForVerification(null);
          // Refresh pending verifications
          checkPendingVerifications();
        }}
        marker={selectedMarkerForVerification}
      /> */}
    </View>
  );
}
