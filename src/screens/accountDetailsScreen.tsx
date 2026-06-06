/**
 * @file AccountDetailsScreen.tsx
 * @description Provides a user interface for reading and updating personal profile information.
 * Integrates with Firebase Firestore to persist user identity data and utilizes the global ThemeContext
 * for seamless dark/light mode rendering.
 */

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext'; 

import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function AccountDetailsScreen({ navigation }: any) {
  // Subscribes to the global theme context to trigger UI re-renders upon theme toggling
  const { isDark } = useContext(ThemeContext); 

  // --- State Management ---
  const [fullName, setFullName] = useState('');
  // Manages the initial loading indicator while fetching data from the remote database
  const [loading, setLoading] = useState(true);
  // Disables the submit button to prevent duplicate API calls during active database writes
  const [saving, setSaving] = useState(false);

  const currentUser = auth.currentUser;

  /**
   * Fetches the user's existing profile data on component mount.
   * Executed asynchronously to avoid blocking the main UI thread.
   */
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            // Pre-populate the form with the database value to establish initial state
            setFullName(userDoc.data().fullName || '');
          }
        } catch (error) {
          console.error("Failed to fetch user document:", error);
        } finally {
          // Resolve the loading state regardless of API success or failure to ensure UI progression
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  /**
   * Validates the input state and pushes the updated data payload to Firestore.
   */
  const handleSave = async () => {
    // Input sanitization: prevent submission of empty strings or whitespace-only names
    if (!fullName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      if (currentUser) {
        // Perform a partial document update to modify only the fullName field
        await updateDoc(doc(db, 'users', currentUser.uid), { fullName });
        Alert.alert("Success", "Profile updated!");
        
        // UX Enhancement: Automatically route the user back to the profile menu post-update
        navigation.goBack(); 
      }
    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      
      {/* Navigation Header */}
      <View style={[styles.header, isDark && { borderBottomColor: '#333' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Account Details</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Editable Identity Field */}
            <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Full Name</Text>
            <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && { color: '#FFFFFF' }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Read-Only Authentication Field
                Rationale: Email modifications require re-authentication with the Firebase Auth provider.
                Locking this UI element ensures the Firestore document does not fall out of sync with the Auth state.
            */}
            <Text style={[styles.readOnlyLabel, isDark && { color: '#888888' }]}>Email Address (Read Only)</Text>
            <View style={[styles.inputContainer, styles.inputDisabled, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.disabledText, isDark && { color: '#AAAAAA' }]}>{currentUser?.email}</Text>
            </View>

            {/* Action Controller */}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  backButton: { marginRight: spacing.md },
  headerTitle: { ...typography.h2, color: colors.secondary },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.secondary, marginBottom: spacing.xs, fontWeight: 'bold' },
  readOnlyLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusButton, paddingHorizontal: spacing.md },
  inputDisabled: { backgroundColor: '#F8F9FA' },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.secondary },
  disabledText: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.textMuted },
  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: border.radiusButton, alignItems: 'center', marginTop: spacing.xl },
  saveButtonText: { ...typography.body, color: colors.surface, fontWeight: 'bold' }
});