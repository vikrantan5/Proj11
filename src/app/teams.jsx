import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Users, ExternalLink } from 'lucide-react-native';
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

const { width } = Dimensions.get('window');

const TEAM_MEMBERS = [
  {
    id: '1',
    name: 'Nida Samrin',
    role: 'Student Developer',
    bio: 'Passionate about building impactful mobile applications and safety-first solutions. Currently pursuing studies in Computer Science.',
    image: 'https://ui-avatars.com/api/?name=Nida+Samrin&background=00E5FF&color=0A0E27&size=256&bold=true&font-size=0.4',
    social: {
      instagram: 'https://www.instagram.com/',
      linkedin: 'https://www.linkedin.com/',
      youtube: 'https://www.youtube.com/',
    },
  },
  {
    id: '2',
    name: 'Prof. Mentor',
    role: 'Teacher & Guide',
    bio: 'Experienced educator guiding students in mobile development, AI safety systems, and real-world project execution.',
    image: 'https://ui-avatars.com/api/?name=Prof+Mentor&background=9C27FF&color=FFFFFF&size=256&bold=true&font-size=0.4',
    social: {
      instagram: 'https://www.instagram.com/',
      linkedin: 'https://www.linkedin.com/',
      youtube: 'https://www.youtube.com/',
    },
  },
];

const SocialButton = ({ type, url, theme }) => {
  const configs = {
    instagram: {
      label: 'Instagram',
      gradient: ['#E1306C', '#F77737'],
      icon: 'IG',
    },
    linkedin: {
      label: 'LinkedIn',
      gradient: ['#0077B5', '#00A0DC'],
      icon: 'in',
    },
    youtube: {
      label: 'YouTube',
      gradient: ['#FF0000', '#FF4444'],
      icon: 'YT',
    },
  };

  const config = configs[type];

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.8}
      style={{ flex: 1 }}
      data-testid={`social-${type}-btn`}
    >
      <LinearGradient
        colors={config.gradient}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 11,
            color: '#FFFFFF',
            letterSpacing: 0.3,
          }}
        >
          {config.icon}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 11,
            color: '#FFFFFF',
          }}
        >
          {config.label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const TeamCard = ({ member, theme, index }) => {
  const isEven = index % 2 === 0;
  const accentColor = isEven ? theme.colors.neonCyan : theme.colors.neonPurple;

  return (
    <View
      style={{
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        backgroundColor: theme.isDark ? 'rgba(30, 35, 60, 0.5)' : theme.colors.cardBackground,
        shadowColor: theme.colors.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: theme.isDark ? 0.4 : 0.1,
        shadowRadius: 16,
        elevation: 6,
      }}
      data-testid={`team-card-${member.id}`}
    >
      {/* Accent Bar */}
      <LinearGradient
        colors={
          isEven
            ? ['rgba(0, 229, 255, 0.4)', 'rgba(156, 39, 255, 0.2)']
            : ['rgba(156, 39, 255, 0.4)', 'rgba(255, 45, 149, 0.2)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 4 }}
      />

      <View style={{ padding: 24, alignItems: 'center' }}>
        {/* Profile Image */}
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 3,
            borderColor: accentColor,
            padding: 3,
            marginBottom: 16,
          }}
        >
          <Image
            source={{ uri: member.image }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 50,
              backgroundColor: theme.colors.cardBackground,
            }}
          />
        </View>

        {/* Name */}
        <Text
          style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 20,
            color: theme.colors.text,
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          {member.name}
        </Text>

        {/* Role Badge */}
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: `${accentColor}20`,
            borderWidth: 1,
            borderColor: `${accentColor}40`,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 12,
              color: accentColor,
              letterSpacing: 0.5,
            }}
          >
            {member.role}
          </Text>
        </View>

        {/* Bio */}
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 20,
            paddingHorizontal: 8,
          }}
        >
          {member.bio}
        </Text>

        {/* Social Links */}
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <SocialButton type="instagram" url={member.social.instagram} theme={theme} />
          <SocialButton type="linkedin" url={member.social.linkedin} theme={theme} />
          <SocialButton type="youtube" url={member.social.youtube} theme={theme} />
        </View>
      </View>
    </View>
  );
};

export default function TeamsPage() {
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient colors={theme.colors.backgroundGradient} style={{ flex: 1 }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
            data-testid="teams-back-btn"
          >
            <ArrowLeft size={24} color={theme.colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Users size={20} color={theme.colors.neonCyan} strokeWidth={2} />
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: theme.colors.text,
                marginLeft: 10,
                letterSpacing: 1,
              }}
            >
              Meet the Team
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 40,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Subtitle */}
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: theme.colors.textSecondary,
              marginBottom: 28,
              lineHeight: 22,
            }}
          >
            The people behind Maitri - building technology for a safer tomorrow.
          </Text>

          {/* Team Cards */}
          {TEAM_MEMBERS.map((member, index) => (
            <TeamCard
              key={member.id}
              member={member}
              theme={theme}
              index={index}
            />
          ))}

          {/* Footer */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 20,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: theme.colors.textSecondary,
                textAlign: 'center',
              }}
            >
              Built with care for women's safety
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
