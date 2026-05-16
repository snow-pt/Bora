// src/screens/LoginScreen.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, border, typography } from '../theme/theme';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Bora!</Text>
        
        <View style={styles.form}>
          <TextInput 
            style={styles.input} 
            placeholder="Full Name" 
            placeholderTextColor={colors.textMuted} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Email Address" 
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            secureTextEntry
            placeholderTextColor={colors.textMuted} 
          />
          
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Let's Go!</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footerLink}>
          <Text style={styles.linkText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>
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
    borderColor: '#E9ECEF', // Subtle outline
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