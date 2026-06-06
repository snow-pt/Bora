/**
 * @file LoginScreen.tsx
 * @description Serves as the primary entry point for user authentication. 
 * Handles both user registration and login flows using Firebase Authentication, 
 * and provisions initial user profile data within Firestore upon registration.
 */

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }: any) {
  // Subscribes to the global theme context to support dynamic rendering
  const { isDark } = useContext(ThemeContext);
  
  // --- State Management ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Determines the current authentication mode: false = Login, true = Registration
  const [isRegistering, setIsRegistering] = useState(false);

  /**
   * Validates local input states and executes the appropriate Firebase Authentication payload.
   * Handles both new user creation and existing user session initialization.
   */
  const handleAuthAction = async () => {
    Keyboard.dismiss();

    // Input Validation: Ensure required fields are populated based on the active mode
    if (!email || !password || (isRegistering && !fullName)) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Input Validation: Enforce standard email string formatting
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a properly formatted email address.');
      return;
    }

    // Input Validation: Comply with Firebase Authentication minimum password requirements
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Your password must be at least 6 characters long.');
      return;
    }

    try {
      if (isRegistering) {
        // Registration Flow: Provision the account within Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Registration Flow: Establish the initial user profile document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: fullName,
          email: email,
          createdAt: new Date().toISOString(),
        });

        Alert.alert('Success', 'Account created successfully!');
      } else {
        // Login Flow: Authenticate the existing user to establish an active session
        await signInWithEmailAndPassword(auth, email, password);
      }

    } catch (error: any) {
      // Surface authentication failures (e.g., incorrect credentials, duplicate email) to the user
      Alert.alert('Authentication Error', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          
          {/* Application Branding */}
          <Text style={styles.logo}>Bora!</Text>
          
          {/* Authentication Form */}
          <View style={styles.form}>
            {isRegistering && (
              <TextInput 
                style={[styles.input, isDark && { backgroundColor: '#1E1E1E', color: '#FFFFFF', borderColor: '#333' }]} 
                placeholder="Full Name" 
                placeholderTextColor={colors.textMuted} 
                value={fullName}
                onChangeText={setFullName}
              />
            )}

            <TextInput 
              style={[styles.input, isDark && { backgroundColor: '#1E1E1E', color: '#FFFFFF', borderColor: '#333' }]} 
              placeholder="Email Address" 
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted} 
              value={email}
              onChangeText={setEmail}
            />

            <TextInput 
              style={[styles.input, isDark && { backgroundColor: '#1E1E1E', color: '#FFFFFF', borderColor: '#333' }]} 
              placeholder="Password" 
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted} 
              value={password}
              onChangeText={setPassword}
            />
            
            {/* Form Submission Controller */}
            <TouchableOpacity style={styles.button} onPress={handleAuthAction}>
              <Text style={styles.buttonText}>
                {isRegistering ? "Let's Go!" : "Log In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Authentication Mode Toggle */}
          <TouchableOpacity 
            style={styles.footerLink} 
            onPress={() => setIsRegistering(!isRegistering)}
          >
            <Text style={styles.linkText}>
              {isRegistering 
                ? "Already have an account? Log In" 
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
          
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  logo: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xl * 2,
    fontSize: 48, 
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: border.radiusCard,
    padding: spacing.md,
    ...typography.body,
    color: colors.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: border.radiusButton,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: 'bold',
  },
  footerLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
    color: colors.textMuted,
  },
});