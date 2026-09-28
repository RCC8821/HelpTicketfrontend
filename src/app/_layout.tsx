


// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import * as SplashScreen from 'expo-splash-screen';
// import { useEffect } from 'react';
// import { View } from 'react-native';

// // Splash Screen ko stuck hone se rokein
// SplashScreen.preventAutoHideAsync().catch(() => {});

// export default function RootLayout() {
//   useEffect(() => {
//     // App screen par aate hi Splash Screen hata do
//     SplashScreen.hideAsync().catch(() => {});
//   }, []);
// // 
//   return (
//     <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
//       <StatusBar style="dark" />
//       <Stack screenOptions={{ headerShown: false }} />
//     </View>
//   );
// }




// frontend/src/app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { TicketProvider } from '../context/TicketContext';

// Splash Screen ko stuck hone se rokein
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // App screen par aate hi Splash Screen hata do
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <TicketProvider>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </TicketProvider>
  );
}