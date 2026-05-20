// src/screens/CreateTripScreen.tsx
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

// Firebase tools
import { db, auth } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';


export default function CreateTripScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);

  const [city, setCity] = useState('');
  const [dates, setDates] = useState('');
  const [daysLeft, setDaysLeft] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateTrip = async () => {
    // Basic validation
    if (!city.trim() || !dates.trim() || !daysLeft.trim()) {
      Alert.alert("Missing Info", "Please fill out all fields.");
      return;
    }

    setSaving(true);

    try {
      // Build the new trip object
     // Build the new trip object
      const newTrip = {
        city: city.trim(),
        dates: dates.trim(),
        daysLeft: parseInt(daysLeft),
        latitude: 0, 
        longitude: 0,
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop',
        userId: auth.currentUser?.uid 
     };

      // Push to the 'trips' collection in Firestore
      await addDoc(collection(db, 'trips'), newTrip);
      
      Alert.alert("Success!", "Your new trip has been created.");
      navigation.navigate('Home'); // Send them back to the dashboard
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save the trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Plan a New Trip</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* City Input */}
        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Destination City</Text>
        <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
          <Ionicons name="location-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isDark && { color: '#FFFFFF' }]}
            placeholder="e.g. Lisbon, Paris, Rome"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* Dates Input */}
        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Travel Dates</Text>
        <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isDark && { color: '#FFFFFF' }]}
            placeholder="e.g. Oct 10 - 15, 2026"
            placeholderTextColor={colors.textMuted}
            value={dates}
            onChangeText={setDates}
          />
        </View>

        {/* Days Left Input */}
        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Countdown (Days Until Trip)</Text>
        <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
          <Ionicons name="timer-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isDark && { color: '#FFFFFF' }]}
            placeholder="e.g. 45"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={daysLeft}
            onChangeText={setDaysLeft}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.7 }]} 
          onPress={handleCreateTrip} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Create Trip</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.md },
  backButton: { marginRight: spacing.md },
  headerTitle: { ...typography.h1, color: colors.secondary },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.secondary, marginBottom: spacing.xs, fontWeight: 'bold' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, 
    borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusButton, 
    paddingHorizontal: spacing.md, marginBottom: spacing.lg 
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.secondary },
  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: border.radiusButton, alignItems: 'center', marginTop: spacing.md },
  saveButtonText: { ...typography.body, color: colors.surface, fontWeight: 'bold', fontSize: 16 }
});