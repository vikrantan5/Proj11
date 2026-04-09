import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ArrowLeft,
  AlertCircle,
  Volume2,
  Shield,
  Phone,
  Users,
  MapPin,
  CheckCircle,
  Activity,
} from 'lucide-react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useTheme } from '@/utils/useTheme';
import LoadingScreen from '@/components/LoadingScreen';
import { router } from 'expo-router';
import { db, auth } from '@/config/firebaseConfig';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  onSnapshot,
} from 'firebase/firestore';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = subscribeToNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const subscribeToNotifications = () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return null;
      }

      // Query analytics_events for the current user, ordered by timestamp
      const eventsQuery = query(
        collection(db, 'analytics_events'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        eventsQuery,
        (snapshot) => {
          const allNotifications = [];

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const notification = buildNotification(doc.id, data);
            if (notification) {
              allNotifications.push(notification);
            }
          });

          setNotifications(allNotifications);
          setLoading(false);
        },
        (error) => {
          console.error('Error subscribing to notifications:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
      setLoading(false);
      return null;
    }
  };

  const buildNotification = (id, data) => {
    const timestamp = data.timestamp?.toDate?.() || new Date();
    const isCurrentUser = data.userId === auth.currentUser?.uid;

    switch (data.eventType) {
      case 'SOS_TRIGGERED':
        return {
          id,
          type: 'sos',
          title: isCurrentUser ? 'SOS Alert Sent' : 'SOS Alert Nearby',
          message: isCurrentUser
            ? 'Your emergency SOS was activated successfully.'
            : `A user triggered an SOS alert.`,
          timestamp,
          icon: 'alert',
          color: '#FF2D95',
        };
      case 'LOUD_ALARM_TRIGGERED':
        return {
          id,
          type: 'alarm',
          title: isCurrentUser ? 'Loud Alarm Activated' : 'Alarm Alert',
          message: isCurrentUser
            ? 'Your loud alarm was triggered.'
            : 'A loud alarm was activated nearby.',
          timestamp,
          icon: 'volume',
          color: '#FFA500',
        };
      case 'FAKE_CALL_USED':
        return {
          id,
          type: 'fake_call',
          title: 'Fake Call Used',
          message: `Fake call feature was used${data.metadata?.contactName ? ` with contact: ${data.metadata.contactName}` : ''}.`,
          timestamp,
          icon: 'phone',
          color: '#9C27FF',
        };
      case 'USER_REGISTERED':
        return {
          id,
          type: 'user',
          title: 'Welcome to Maitri',
          message: 'Your account was created successfully.',
          timestamp,
          icon: 'users',
          color: '#00E5A0',
        };
      case 'USER_LOGIN':
        return {
          id,
          type: 'login',
          title: 'Login Detected',
          message: `Login from ${data.deviceInfo?.modelName || 'your device'}.`,
          timestamp,
          icon: 'activity',
          color: '#00E5FF',
        };
      case 'EMERGENCY_CONTACT_ADDED':
        return {
          id,
          type: 'contact',
          title: 'Emergency Contact Added',
          message: 'A new emergency contact was added to your profile.',
          timestamp,
          icon: 'shield',
          color: '#00E5A0',
        };
      default:
        return {
          id,
          type: 'general',
          title: data.eventType?.replace(/_/g, ' ') || 'Notification',
          message: `Event recorded at ${formatTime(timestamp)}.`,
          timestamp,
          icon: 'shield',
          color: '#00E5FF',
        };
    }
  };

  const getIcon = (iconType, color) => {
    const size = 20;
    const strokeWidth = 2;
    switch (iconType) {
      case 'alert':
        return <AlertCircle size={size} color={color} strokeWidth={strokeWidth} />;
      case 'volume':
        return <Volume2 size={size} color={color} strokeWidth={strokeWidth} />;
      case 'phone':
        return <Phone size={size} color={color} strokeWidth={strokeWidth} />;
      case 'users':
        return <Users size={size} color={color} strokeWidth={strokeWidth} />;
      case 'map':
        return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
      case 'check':
        return <CheckCircle size={size} color={color} strokeWidth={strokeWidth} />;
      case 'activity':
        return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
      default:
        return <Shield size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // The onSnapshot listener auto-refreshes, but we trigger UI refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.borderLight,
          }}
        >
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
            data-testid="notifications-back-btn"
          >
            <ArrowLeft size={20} color={theme.colors.neonCyan} strokeWidth={2} />
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={22} color={theme.colors.neonPink} strokeWidth={2} />
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 22,
                color: theme.colors.text,
                marginLeft: 10,
                letterSpacing: 1,
              }}
            >
              Notifications
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Notifications List */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.neonCyan}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Bell size={64} color={theme.colors.textSecondary} strokeWidth={1.5} />
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 16,
                  color: theme.colors.textSecondary,
                  marginTop: 20,
                  textAlign: 'center',
                }}
                data-testid="no-notifications-text"
              >
                No notifications yet.
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                  color: theme.colors.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                You'll see alerts, SOS events, and activity updates here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }} data-testid="notifications-list">
              {notifications.map((notification) => (
                <LinearGradient
                  key={notification.id}
                  colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${notification.color}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}
                  >
                    {getIcon(notification.icon, notification.color)}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 14,
                          color: theme.colors.text,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 11,
                          color: theme.colors.textSecondary,
                          marginLeft: 8,
                        }}
                      >
                        {formatTime(notification.timestamp)}
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 13,
                        color: theme.colors.textSecondary,
                        lineHeight: 19,
                      }}
                      numberOfLines={2}
                    >
                      {notification.message}
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
