import type { ExpoConfig } from 'expo/config';
import brand from './brand.config.json';

// Everything that changes the app's identity lives in brand.config.json.
// Edit that file, push, and GitHub builds a new APK.
const config: ExpoConfig = {
  name: brand.appName,
  slug: 'sawaari',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  android: {
    package: brand.androidPackage,
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: brand.primaryColor,
    },
    permissions: ['VIBRATE', 'POST_NOTIFICATIONS', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: [
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: brand.notificationColor,
        defaultChannel: 'orders',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Sawaari uses your location to move the map while you ride.',
      },
    ],
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: brand.primaryColor,
      },
    ],
  ],
  extra: {
    brand,
    // The Expo project ID (from expo.dev). Not a secret.
    eas: { projectId: brand.easProjectId || process.env.EAS_PROJECT_ID },
  },
};

export default config;
