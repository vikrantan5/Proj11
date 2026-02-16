import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Users,
  Activity,
  AlertCircle,
  Volume2,
  TrendingUp,
  Shield,
  Calendar,
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
import { db } from '@/config/firebaseConfig';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSOS: 0,
    totalAlarms: 0,
    activeUsersToday: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentEvents(),
        loadDailyStats(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  /**
   * Load statistics
   */
  const loadStats = async () => {
    try {
      // Total users
      const usersSnapshot = await getCountFromServer(collection(db, 'users'));
      const totalUsers = usersSnapshot.data().count;

      // Total SOS activations
      const sosQuery = query(
        collection(db, 'analytics_events'),
        where('eventType', '==', 'SOS_TRIGGERED')
      );
      const sosSnapshot = await getCountFromServer(sosQuery);
      const totalSOS = sosSnapshot.data().count;

      // Total Alarm activations
      const alarmQuery = query(
        collection(db, 'analytics_events'),
        where('eventType', '==', 'LOUD_ALARM_TRIGGERED')
      );
      const alarmSnapshot = await getCountFromServer(alarmQuery);
      const totalAlarms = alarmSnapshot.data().count;

      // Active users today (users who had activity today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeQuery = query(
        collection(db, 'analytics_events'),
        where('timestamp', '>=', today)
      );
      const activeDocs = await getDocs(activeQuery);
      const uniqueUsers = new Set();
      activeDocs.forEach((doc) => {
        uniqueUsers.add(doc.data().userId);
      });
      const activeUsersToday = uniqueUsers.size;

      setStats({
        totalUsers,
        totalSOS,
        totalAlarms,
        activeUsersToday,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  /**
   * Load recent events
   */
  const loadRecentEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'analytics_events'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentEvents(events);
    } catch (error) {
      console.error('Error loading recent events:', error);
    }
  };

  /**
   * Load daily statistics for the last 7 days
   */
  const loadDailyStats = async () => {
    try {
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
      }

      const statsPromises = last7Days.map(async (dateStr) => {
        const summaryRef = collection(db, 'analytics_summary');
        const q = query(summaryRef, where('date', '==', dateStr));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          return {
            date: dateStr,
            sosCount: data.sosActivations || 0,
            alarmCount: data.alarmActivations || 0,
            newUsers: data.newUsers || 0,
          };
        }
        return {
          date: dateStr,
          sosCount: 0,
          alarmCount: 0,
          newUsers: 0,
        };
      });

      const stats = await Promise.all(statsPromises);
      setDailyStats(stats);
    } catch (error) {
      console.error('Error loading daily stats:', error);
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'SOS_TRIGGERED':
        return <AlertCircle size={20} color={theme.colors.neonPink} />;
      case 'LOUD_ALARM_TRIGGERED':
        return <Volume2 size={20} color={theme.colors.warning} />;
      case 'USER_REGISTERED':
        return <Users size={20} color={theme.colors.safe} />;
      case 'APP_OPENED':
        return <Activity size={20} color={theme.colors.neonCyan} />;
      default:
        return <Shield size={20} color={theme.colors.textSecondary} />;
    }
  };

  const getEventLabel = (eventType) => {
    switch (eventType) {
      case 'SOS_TRIGGERED':
        return 'SOS Triggered';
      case 'LOUD_ALARM_TRIGGERED':
        return 'Loud Alarm Used';
      case 'USER_REGISTERED':
        return 'New User Registered';
      case 'APP_OPENED':
        return 'App Opened';
      case 'USER_LOGIN':
        return 'User Login';
      default:
        return eventType.replace(/_/g, ' ');
    }
  };

  if (!fontsLoaded || loading) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: 24,
            paddingHorizontal: 24,
            paddingBottom: 100,
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
          {/* Header */}
          <View style={{ marginBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Shield size={24} color={theme.colors.neonCyan} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 28,
                  color: theme.colors.text,
                  marginLeft: 12,
                  letterSpacing: 1,
                }}
              >
                Admin Dashboard
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.colors.textSecondary,
              }}
            >
              Real-time analytics and monitoring
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ marginBottom: 30 }}>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: theme.colors.text,
                marginBottom: 16,
                letterSpacing: 1,
              }}
            >
              OVERVIEW
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {/* Total Users */}
              <View style={{ flex: 1 }}>
                <LinearGradient
                  colors={['rgba(0, 229, 255, 0.2)', 'rgba(156, 39, 255, 0.1)']}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                  }}
                >
                  <Users size={28} color={theme.colors.neonCyan} strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 32,
                      color: theme.colors.text,
                      marginTop: 12,
                    }}
                  >
                    {stats.totalUsers}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    Total Users
                  </Text>
                </LinearGradient>
              </View>

              {/* Active Today */}
              <View style={{ flex: 1 }}>
                <LinearGradient
                  colors={['rgba(0, 229, 160, 0.2)', 'rgba(0, 191, 165, 0.1)']}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                  }}
                >
                  <Activity size={28} color={theme.colors.safe} strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 32,
                      color: theme.colors.text,
                      marginTop: 12,
                    }}
                  >
                    {stats.activeUsersToday}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    Active Today
                  </Text>
                </LinearGradient>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Total SOS */}
              <View style={{ flex: 1 }}>
                <LinearGradient
                  colors={['rgba(255, 45, 149, 0.2)', 'rgba(156, 39, 255, 0.1)']}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                  }}
                >
                  <AlertCircle size={28} color={theme.colors.neonPink} strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 32,
                      color: theme.colors.text,
                      marginTop: 12,
                    }}
                  >
                    {stats.totalSOS}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    SOS Triggers
                  </Text>
                </LinearGradient>
              </View>

              {/* Total Alarms */}
              <View style={{ flex: 1 }}>
                <LinearGradient
                  colors={['rgba(255, 165, 0, 0.2)', 'rgba(255, 140, 0, 0.1)']}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: theme.colors.borderLight,
                  }}
                >
                  <Volume2 size={28} color={theme.colors.warning} strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 32,
                      color: theme.colors.text,
                      marginTop: 12,
                    }}
                  >
                    {stats.totalAlarms}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    Loud Alarms
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Weekly Trend */}
          {dailyStats.length > 0 && (
            <View style={{ marginBottom: 30 }}>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: theme.colors.text,
                  marginBottom: 16,
                  letterSpacing: 1,
                }}
              >
                7-DAY ACTIVITY
              </Text>
              <LinearGradient
                colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
                style={{
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                }}
              >
                {dailyStats.map((stat, index) => (
                  <View
                    key={stat.date}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: index < dailyStats.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.borderLight,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 13,
                          color: theme.colors.text,
                        }}
                      >
                        {format(new Date(stat.date), 'MMM dd')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 16,
                            color: theme.colors.neonPink,
                          }}
                        >
                          {stat.sosCount}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 11,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          SOS
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 16,
                            color: theme.colors.warning,
                          }}
                        >
                          {stat.alarmCount}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Inter_400Regular',
                            fontSize: 11,
                            color: theme.colors.textSecondary,
                          }}
                        >
                          Alarm
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>
          )}

          {/* Recent Activity */}
          <View>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: theme.colors.text,
                marginBottom: 16,
                letterSpacing: 1,
              }}
            >
              RECENT ACTIVITY
            </Text>
            <LinearGradient
              colors={['rgba(30, 35, 60, 0.6)', 'rgba(20, 25, 50, 0.4)']}
              style={{
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.colors.borderLight,
              }}
            >
              {recentEvents.length === 0 ? (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: theme.colors.textSecondary,
                    textAlign: 'center',
                    paddingVertical: 20,
                  }}
                >
                  No recent activity
                </Text>
              ) : (
                recentEvents.slice(0, 10).map((event, index) => (
                  <View
                    key={event.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: index < Math.min(recentEvents.length - 1, 9) ? 1 : 0,
                      borderBottomColor: theme.colors.borderLight,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0, 229, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      {getEventIcon(event.eventType)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'Inter_500Medium',
                          fontSize: 14,
                          color: theme.colors.text,
                        }}
                      >
                        {getEventLabel(event.eventType)}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 12,
                          color: theme.colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {event.userEmail || 'User'}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 12,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {event.timestamp
                        ? format(
                            event.timestamp.toDate(),
                            'HH:mm'
                          )
                        : 'N/A'}
                    </Text>
                  </View>
                ))
              )}
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}





