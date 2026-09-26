import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartvillage.app',
  appName: 'SmartVillage',
  webDir: 'dist',
  plugins: {
    Camera: {
      androidPermission: true,
    },
  },
};

export default config;
