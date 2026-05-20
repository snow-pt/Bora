// src/screens/itineraryScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme/theme';

export default function ItineraryScreen({ route }: any) {
  // This receives the data passed from the HomeScreen
  const { tripData } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{tripData.city} Itinerary</Text>
      <Text style={styles.subtitle}>Dates: {tripData.dates}</Text>
      <Text style={{ marginTop: 20, textAlign: 'center' }}>
        (Timeline UI will be built here later)
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.secondary },
  subtitle: { ...typography.caption, color: colors.textMuted },
});