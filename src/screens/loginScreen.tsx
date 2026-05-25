import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback,Keyboard, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, border, typography } from '../theme/theme';
import { useContext } from 'react';
import { ThemeContext } from '../context/themeContext';

// Import our Firebase setup
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  // Input form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Toggle between registering a new account or logging into an existing one
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuthAction = async () => {
    // 1. Basic empty check
    Keyboard.dismiss();
    if (!email || !password || (isRegistering && !fullName)) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // 2. REGEX VALIDATION
    // Standard email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a properly formatted email address.');
      return;
    }

    // Firebase Auth strictly requires passwords to be at least 6 characters
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Your password must be at least 6 characters long.');
      return;
    }

    try {
      if (isRegistering) {
        // 1. Create user account in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Save the user's profile details to Firestore database
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: fullName,
          email: email,
          createdAt: new Date().toISOString(),
        });

        Alert.alert('Success', 'Account created successfully!');
      } else {
        // Log in existing user
        await signInWithEmailAndPassword(auth, email, password);
      }

    } catch (error: any) {
      // Clear explanation of what went wrong (e.g., weak password, email already exists)
      Alert.alert('Authentication Error', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.content}>
        <Text style={styles.logo}>Bora!</Text>
        
        <View style={styles.form}>
          {isRegistering && (
            <TextInput 
              style={styles.input} 
              placeholder="Full Name" 
              placeholderTextColor={colors.textMuted} 
              value={fullName}
              onChangeText={setFullName}
            />
          )}

          <TextInput 
            style={styles.input} 
            placeholder="Email Address" 
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted} 
            value={email}
            onChangeText={setEmail}
          />

          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted} 
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity style={styles.button} onPress={handleAuthAction}>
            <Text style={styles.buttonText}>
              {isRegistering ? "Let's Go!" : "Log In"}
            </Text>
          </TouchableOpacity>
        </View>

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