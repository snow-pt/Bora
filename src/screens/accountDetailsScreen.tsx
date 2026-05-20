// src/screens/AccountDetailsScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext'; // 👈 Added the global brain

import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function AccountDetailsScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext); // 👈 Tapped into the theme state

  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setFullName(userDoc.data().fullName || '');
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), { fullName });
        Alert.alert("Success", "Profile updated!");
        navigation.goBack(); // Send them back to the Profile screen
      }
    } catch (error) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
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

            <Text style={[styles.readOnlyLabel, isDark && { color: '#888888' }]}>Email Address (Read Only)</Text>
            <View style={[styles.inputContainer, styles.inputDisabled, isDark && { backgroundColor: '#2A2A2A', borderColor: '#333' }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <Text style={[styles.disabledText, isDark && { color: '#AAAAAA' }]}>{currentUser?.email}</Text>
            </View>

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