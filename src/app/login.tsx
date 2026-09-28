// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   KeyboardAvoidingView,
//   Platform,
//   ActivityIndicator,
//   Alert,
// } from 'react-native';
// import { router } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Theme } from '../constants/theme';
// import { api } from '../services/api';

// export default function LoginScreen() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     if (!email.trim() || !password.trim()) {
//       Alert.alert('Error', 'Please enter email and password');
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await api.login(email.trim(), password);
//       if (res.success) {
//         await AsyncStorage.setItem('fms_user', JSON.stringify(res.user));
//         router.replace('/dashboard');
//       } else {
//         Alert.alert('Login Failed', res.message || 'Invalid credentials');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Something went wrong. Try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//       style={styles.container}
//     >
//       <View style={styles.card}>
//         {/* Header (Exact like image) */}
//         <View style={styles.header}>
//           <Ionicons name="construct" size={26} color={Theme.colors.primary} style={{ marginRight: 8 }} />
//           <Text style={styles.title}>FMS Login</Text>
//         </View>

//         {/* Email Input */}
//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           placeholderTextColor={Theme.colors.textMuted}
//           keyboardType="email-address"
//           autoCapitalize="none"
//           autoCorrect={false}
//           value={email}
//           onChangeText={setEmail}
//         />

//         {/* Password Input */}
//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           placeholderTextColor={Theme.colors.textMuted}
//           secureTextEntry
//           value={password}
//           onChangeText={setPassword}
//         />

//         {/* Login Button */}
//         <TouchableOpacity
//           style={[styles.loginButton, loading && styles.loginButtonDisabled]}
//           onPress={handleLogin}
//           disabled={loading}
//           activeOpacity={0.8}
//         >
//           {loading ? (
//             <ActivityIndicator color="#FFFFFF" />
//           ) : (
//             <Text style={styles.loginButtonText}>Sign In</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </KeyboardAvoidingView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Theme.colors.background,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   card: {
//     width: '100%',
//     maxWidth: 400,
//     backgroundColor: Theme.colors.surface,
//     borderRadius: 16,
//     padding: 30,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 30,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: Theme.colors.primary,
//   },
//   input: {
//     width: '100%',
//     height: 50,
//     borderWidth: 1,
//     borderColor: Theme.colors.border,
//     borderRadius: 8,
//     paddingHorizontal: 16,
//     marginBottom: 16,
//     fontSize: 15,
//     color: Theme.colors.text,
//     backgroundColor: Theme.colors.surface,
//   },
//   loginButton: {
//     width: '100%',
//     height: 50,
//     backgroundColor: Theme.colors.primary,
//     borderRadius: 25, // Rounded pill shape like image
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   loginButtonDisabled: {
//     opacity: 0.7,
//   },
//   loginButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });





import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/theme';
import { api } from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ========== CUSTOM ALERT STATE ==========
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
  const [alertOnOk, setAlertOnOk] = useState<(() => void) | null>(null);

  const showCustomAlert = (
    title: string,
    msg: string,
    type: 'success' | 'error' | 'info' = 'success',
    onOk?: () => void
  ) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertType(type);
    setAlertOnOk(() => onOk || null);
    setAlertVisible(true);
  };

  const closeCustomAlert = () => {
    setAlertVisible(false);
    if (alertOnOk) alertOnOk();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showCustomAlert('Error', 'Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.success) {
        await AsyncStorage.setItem('fms_user', JSON.stringify(res.user));
        showCustomAlert(
          'Welcome!',
          `Login successful. Hello ${res.user?.name || 'User'}!`,
          'success',
          () => router.replace('/dashboard')
        );
      } else {
        showCustomAlert('Login Failed', res.message || 'Invalid credentials', 'error');
      }
    } catch (error) {
      showCustomAlert('Error', 'Something went wrong. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
  const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
  const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="construct" size={26} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.title}>Help Ticket Login</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Theme.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ========== CUSTOM SWEET ALERT ========== */}
      <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconCircle, { backgroundColor: alertBg }]}>
              <Ionicons name={alertIcon as any} size={42} color={alertColor} />
            </View>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMsg}</Text>
            <TouchableOpacity
              style={[styles.alertOkBtn, { backgroundColor: alertColor }]}
              onPress={closeCustomAlert}
              activeOpacity={0.85}
            >
              <Text style={styles.alertOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 15,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.surface,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: Theme.colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Custom Alert
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  alertIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertOkBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertOkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});