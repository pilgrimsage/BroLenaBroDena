import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.brolenabrodena.app',
  appName: 'BroLenaBroDena',
  webDir:  'dist',

  server: {
    // In development — point to your Laravel+Vite server
    // Comment this out for production builds
    url:             'http://192.168.31.1:5173',
    cleartext:       true,   // allow http (not https) in dev
    allowNavigation: ['localhost', '10.0.0.*'],
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:    2000,
      launchAutoHide:        true,
      backgroundColor:       '#7C6EFA',
      androidSplashResourceName: 'splash',
      showSpinner:           false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#FFFFFF',
    },
  },
}

export default config