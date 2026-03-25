import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.sleftgolf.app',
  appName: 'Sleft Golf',
  webDir: 'out',
  server: {
    url: 'https://sleftgolf.vercel.app/feed',
    cleartext: false,
    // Keep all navigation inside the app WebView - never open Safari
    allowNavigation: ['sleftgolf.vercel.app', '*.supabase.co'],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0b0f0e',
    preferredContentMode: 'mobile',
    scheme: 'Sleft Golf',
    handleApplicationNotifications: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0f0e',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0b0f0e',
      showSpinner: false,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
