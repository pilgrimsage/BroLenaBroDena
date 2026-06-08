import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'in.echocrew.brolenabrodena',
  appName: 'BrolenaBrodena',
  webDir:  'dist',

  // NO server.url here — uses bundled files for production
  // Only add server.url during local development

  plugins: {
    SplashScreen: {
      launchShowDuration:    2000,
      launchAutoHide:        true,
      backgroundColor:       '#7C6EFA',
      showSpinner:           false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config