
import { Tabs, useFocusEffect } from "expo-router";
import { Home, MapPin, User, Shield } from "lucide-react-native";
import { useTheme } from "@/utils/useTheme";
import { View } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { isAdmin } from "@/utils/adminUtils";
import { auth, db } from "@/config/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export default function TabLayout() {
  const theme = useTheme();
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Set up real-time listener for admin status changes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    console.log('Setting up admin status listener for user:', user.uid);

    // Listen to changes in the user document
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const isAdminUser = userData.isAdmin === true;
        console.log('Admin status updated:', isAdminUser);
        setUserIsAdmin(isAdminUser);
      }
    }, (error) => {
      console.error('Error listening to admin status:', error);
    });

    return () => unsubscribe();
  }, []);

  // Re-check admin status whenever the profile tab gains focus
  useFocusEffect(
    useCallback(() => {
      checkAdminStatus();
    }, [])
  );

  const checkAdminStatus = async () => {
    const adminStatus = await isAdmin();
    console.log('Manual admin check:', adminStatus);
    setUserIsAdmin(adminStatus);
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopWidth: 2,
          borderTopColor: theme.colors.borderLight,
          paddingBottom: 10,
          paddingTop: 10,
          height: 70,
          position: 'absolute',
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: 15,
          shadowColor: theme.colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: theme.colors.neonCyan,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: focused ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
            }}>
              <Home color={color} size={24} strokeWidth={focused ? 2.5 : 1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Track",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: focused ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
            }}>
              <MapPin color={color} size={24} strokeWidth={focused ? 2.5 : 1.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: focused ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
            }}>
              <User color={color} size={24} strokeWidth={focused ? 2.5 : 1.5} />
            </View>
          ),
        }}
      />
      {userIsAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            href: "/admin-dashboard",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: focused ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
              }}>
                <Shield color={color} size={24} strokeWidth={focused ? 2.5 : 1.5} />
              </View>
            ),
          }}
        />
      )}
    </Tabs>
  );
}