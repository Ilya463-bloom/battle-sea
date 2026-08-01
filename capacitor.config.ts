import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change this before publishing — it is the permanent Play Store identity.
  appId: 'com.battlesea.game',
  appName: 'Sea Battle',
  webDir: 'dist',
  android: {
    backgroundColor: '#fdfbf2',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#fdfbf2',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
