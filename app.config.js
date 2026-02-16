require('dotenv').config();

module.exports = {
  expo: {
    owner: "vik4an5",
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
        UIBackgroundModes: ["location"]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION"
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
      "expo-audio",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      "expo-video"
    ],
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
  eas: {
    projectId: "e728f197-d8f0-4da7-a9c4-03c72e7fa42b"
  },
  router: {
    origin: false
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
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET
},

    runtimeVersion: {
      policy: "appVersion"
    }
  }
};
