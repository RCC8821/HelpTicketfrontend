// // Temporary Test in app/index.tsx
// import { Redirect } from 'expo-router';

// export default function Index() {
//   return <Redirect href="/login" />;
// }





import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/theme';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userStr = await AsyncStorage.getItem('fms_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          // Agar storage me user ka data milta hai toh direct true karo
          if (user && user.name) {
            setIsLoggedIn(true);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Loading state me center me loader dikhayenge
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme?.colors?.primary || '#0284C7'} />
      </View>
    );
  }

  // Agar login hai toh direct dashboard par, nahi toh login screen par redirect
  return isLoggedIn ? <Redirect href="/dashboard" /> : <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});