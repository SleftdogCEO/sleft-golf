import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.sleftgolf.app',
  appName: 'Sleft Golf',
  webDir: 'out',
  server: {
    // Load from live Vercel deployment (server-side routes need a real server)
    url: 'https://sleftgolf.vercel.app/feed',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0b0f0e',
    preferredContentMode: 'mobile',
    scheme: 'Sleft Golf',
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
