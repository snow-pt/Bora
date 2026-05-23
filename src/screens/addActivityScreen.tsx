// src/screens/AddActivityScreen.tsx
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

const activityCategories = [
  { id: '1', name: 'restaurant-outline', label: 'Food' },
  { id: '2', name: 'camera-outline', label: 'Sightseeing' },
  { id: '3', name: 'water-outline', label: 'Relax' },
  { id: '4', name: 'beer-outline', label: 'Drinks' },
  { id: '5', name: 'airplane-outline', label: 'Transit' },
  { id: '6', name: 'ticket-outline', label: 'Event' },
];

export default function AddActivityScreen({ route, navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  const { tripId, activityToEdit } = route.params; 

  const [title, setTitle] = useState(activityToEdit ? activityToEdit.title : '');
  const [location, setLocation] = useState(activityToEdit ? activityToEdit.location : '');
  const [time, setTime] = useState(new Date()); 
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(activityToEdit ? activityToEdit.icon : 'camera-outline');
  const [saving, setSaving] = useState(false);

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedTime) setTime(selectedTime);
  };

  const handleSaveActivity = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Info", "Please give this activity a title.");
      return;
    }
    setSaving(true);
    try {
      const formattedTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      
      // If we are editing, UPDATE the existing doc. If creating, ADD a new doc!
      if (activityToEdit) {
        const activityRef = doc(db, 'trips', tripId, 'activities', activityToEdit.id);
        await updateDoc(activityRef, {
          title: title.trim(),
          location: location.trim(),
          time: formattedTime,
          icon: selectedIcon
        });
      } else {
        const activitiesRef = collection(db, 'trips', tripId, 'activities');
        await addDoc(activitiesRef, {
          title: title.trim(),
          location: location.trim() || 'TBD',
          time: formattedTime,
          timestamp: time.getTime(),
          icon: selectedIcon,
          completed: false
        });
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save the activity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#121212' }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Add to Itinerary</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>What are we doing?</Text>
        <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
          <TextInput
            style={[styles.input, isDark && { color: '#FFFFFF' }]}
            placeholder="e.g. Dinner at Da Enzo"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Location</Text>
        <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
          <Ionicons name="location-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, isDark && { color: '#FFFFFF' }]}
            placeholder="Address or Place Name"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Time</Text>
        <TouchableOpacity 
          style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
          <Text style={[styles.input, { paddingVertical: spacing.md + 4 }, isDark && { color: '#FFFFFF' }]}>
            {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}

        <Text style={[styles.label, { marginTop: spacing.md }, isDark && { color: '#CCCCCC' }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
          {activityCategories.map((cat) => {
            const isSelected = selectedIcon === cat.name;
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.iconBubble, isSelected && styles.iconBubbleSelected, isDark && !isSelected && { backgroundColor: '#1E1E1E' }]}
                onPress={() => setSelectedIcon(cat.name)}
              >
                <Ionicons name={cat.name as any} size={24} color={isSelected ? colors.surface : colors.primary} />
                <Text style={[styles.iconLabel, isSelected && { color: colors.surface }, isDark && !isSelected && { color: '#CCCCCC' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.7 }]} 
          onPress={handleSaveActivity} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveButtonText}>Save Activity</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  backButton: { padding: spacing.xs },
  headerTitle: { ...typography.h2, color: colors.secondary, fontSize: 20 },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.secondary, marginBottom: spacing.xs, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusCard, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.secondary },
  iconScroll: { flexDirection: 'row', marginBottom: spacing.xl * 2, paddingVertical: spacing.xs },
  iconBubble: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: border.radiusCard, marginRight: spacing.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  iconBubbleSelected: { backgroundColor: colors.primary },
  iconLabel: { ...typography.caption, color: colors.secondary, marginTop: 4, fontSize: 10, fontWeight: 'bold' },
  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: border.radiusButton, alignItems: 'center' },
  saveButtonText: { ...typography.body, color: colors.surface, fontWeight: 'bold', fontSize: 16 }
});