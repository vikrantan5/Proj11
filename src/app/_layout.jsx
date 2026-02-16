import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { getUserDetails } from '@/services/userService';
import { ThemeProvider } from '@/utils/ThemeContext';
import { AppState, Alert, Vibration } from 'react-native';
import { triggerSOS } from '@/services/sosService';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [hasUserDetails, setHasUserDetails] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  
  // Power button triple-click detection state
  const powerButtonPresses = useRef([]);
  const sosTriggering = useRef(false);
  const TRIPLE_CLICK_WINDOW = 3000; // 3 seconds window for triple-click

  // Function to check user details
  const checkUserDetails = async (currentUser) => {
    if (currentUser) {
      try {
        console.log('Checking user details for uid:', currentUser.uid);
        const userDetails = await getUserDetails(currentUser.uid);
        const hasDetails = !!userDetails;
        console.log('User has details:', hasDetails);
        setHasUserDetails(hasDetails);
        return hasDetails;
      } catch (error) {
        console.error('Error fetching user details:', error);
        setHasUserDetails(false);
        return false;
      }
    } else {
      setHasUserDetails(false);
      return false;
    }
  };

  // Function to handle power button triple-click detection
  const handlePowerButtonPress = async () => {
    const now = Date.now();
    
    // Add current press to the array
    powerButtonPresses.current.push(now);
    
    // Filter out presses outside the time window
    powerButtonPresses.current = powerButtonPresses.current.filter(
      timestamp => now - timestamp < TRIPLE_CLICK_WINDOW
    );
    
    console.log(`🔘 Power button presses: ${powerButtonPresses.current.length}`);
    
    // Check if we have 3 presses within the time window
    if (powerButtonPresses.current.length >= 3 && !sosTriggering.current) {
      console.log('🚨 Triple-click detected! Triggering SOS...');
      
      // Prevent multiple simultaneous triggers
      sosTriggering.current = true;
      
      // Clear the press array
      powerButtonPresses.current = [];
      
      // Provide haptic feedback
      Vibration.vibrate([100, 50, 100, 50, 100]);
      
      try {
        // Check if user is authenticated and has details
        if (!user || !hasUserDetails) {
          Alert.alert(
            '⚠️ SOS Unavailable',
            'Please login and complete your profile with emergency contacts to use SOS feature.',
            [{ text: 'OK' }]
          );
          sosTriggering.current = false;
          return;
        }
        
        // Show triggering alert
        Alert.alert(
          '🚨 Emergency SOS Activated',
          'Power button triple-press detected! Activating emergency protocols...',
          [],
          { cancelable: false }
        );
        
        // Trigger SOS
        const result = await triggerSOS();
        
        // Build success message
        let message = 'Emergency protocols activated:\n\n';
        
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
        
        // Show success alert
        Alert.alert(
          '🚨 SOS Alert Sent!',
          message,
          [{ text: 'OK' }]
        );
        
      } catch (error) {
        console.error('❌ SOS activation failed:', error);
        Alert.alert(
          'SOS Error',
          error.message || 'Failed to send emergency alert. Please ensure you have added emergency contacts in your profile.',
          [{ text: 'OK' }]
        );
      } finally {
        sosTriggering.current = false;
      }
    }
  };

  // Monitor app state changes (power button detection)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When app goes to background/inactive, it means power button was pressed
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        handlePowerButtonPress();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, hasUserDetails]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      await checkUserDetails(user);
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  // Re-check user details when navigating to tabs
  useEffect(() => {
    if (user && segments[0] === '(tabs)' && !hasUserDetails) {
      checkUserDetails(user);
    }
  }, [segments, user]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    console.log('Navigation check - User:', !!user, 'HasDetails:', hasUserDetails, 'Segments:', segments);

    if (!user && !inAuthGroup) {
      console.log('→ Redirecting to login (no user)');
      router.replace('/(auth)/login');
    } else if (user && !hasUserDetails && segments[1] !== 'user-details') {
      console.log('→ Redirecting to user-details (no profile)');
      router.replace('/(auth)/user-details');
    } else if (user && hasUserDetails && inAuthGroup) {
      console.log('→ Redirecting to dashboard (profile complete)');
      router.replace('/(tabs)');
    }
  }, [user, hasUserDetails, segments, isReady]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fake-call" />
      <Stack.Screen name="in-call" />
      <Stack.Screen name="geofences" />
      <Stack.Screen name="emergency-contacts" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ThemeProvider>
  );
}