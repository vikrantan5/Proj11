require('dotenv').config();

module.exports = {
  expo: {
    owner: "chachahehe",
    name: "Maitri",
    slug: "create-mobile-app",
    scheme: "createmobileapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
            infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationAlwaysAndWhenInUseUsageDescription: "Maitri needs your location to provide real-time safety monitoring and alerts when you enter unsafe areas.",
        NSLocationWhenInUseUsageDescription: "Maitri needs your location to show nearby safety information and provide safe route navigation.",
        NSLocationAlwaysUsageDescription: "Maitri needs background location access to send safety alerts even when the app is closed.",
        NSCameraUsageDescription: "Maitri needs camera access to capture evidence photos during SOS emergencies.",
        NSMicrophoneUsageDescription: "Maitri needs microphone access to record audio evidence during SOS emergencies.",
        UIBackgroundModes: ["location"]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.jpg",
        backgroundColor: "#ffffff"
      },
         permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.SEND_SMS"
      ],
      package: "xyz.create.CreateExpoEnvironment",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    plugins: [
      [
        "expo-router",
        {
          sitemap: false
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      "expo-video",
      "expo-asset"
    ],
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      // यहाँ EAS project ID ऐड की गई है
      eas: {
        projectId: "ddcaa347-9f3d-48dd-b010-c02657844e70"
      },
      // Make environment variables available in the app
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
      backendUrl: process.env.BACKEND_URL,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
    },
    runtimeVersion: "1.0.0"
  }
};