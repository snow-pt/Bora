// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';

// Import Firebase
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function HomeScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM FIREBASE
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'trips'));
        const tripsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() // Spreads out the city, dates, image, etc.
        }));
        setTrips(tripsData);
      } catch (error) {
        console.error("Error fetching trips: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <Text style={styles.greeting}>Hello, Diogo</Text>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.financeCard}>
            <View style={styles.financeRow}>
              <View>
                <Text style={styles.financeLabel}>You Owe</Text>
                <Text style={[styles.financeAmount, { color: colors.danger }]}>€142</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.financeLabel}>You are Owed</Text>
                <Text style={[styles.financeAmount, { color: colors.success }]}>€89</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Upcoming Trips</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.tripsList}>
              {trips.map((trip) => (
                // CHANGED TO TOUCHABLE OPACITY FOR NAVIGATION
                <TouchableOpacity 
                  key={trip.id} 
                  style={styles.tripCard}
                  onPress={() => navigation.navigate('Itinerary', { tripData: trip })}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: trip.image }} style={styles.tripImage} />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>🔥 Leaves in {trip.daysLeft} Days!</Text>
                    </View>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripCity}>{trip.city}</Text>
                    <Text style={styles.tripDates}>{trip.dates}</Text>
                    {/* Temporary placeholder until we build the Location feature */}
                    <Text style={styles.tripDistance}>📍 Distance calculating...</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Expenses')}>
          <Ionicons name="wallet-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navText}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItemCenter} onPress={() => navigation.navigate('CreateTrip')}>
          <Ionicons name="add-circle" size={48} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ... Keep your exact same styles down here ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.secondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  greeting: { ...typography.h2, color: colors.surface, marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg },
  financeCard: {
    backgroundColor: colors.surface, borderRadius: border.radiusCard, padding: spacing.lg,
    marginTop: -40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  financeLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  financeAmount: { ...typography.h2 },
  sectionTitle: { ...typography.h2, color: colors.secondary, marginTop: spacing.xl, marginBottom: spacing.md, fontSize: 20 },
  tripsList: { gap: spacing.md, paddingBottom: spacing.xl },
  tripCard: {
    backgroundColor: colors.surface, borderRadius: border.radiusCard, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
  },
  imageContainer: { position: 'relative' },
  tripImage: { width: '100%', height: 150 },
  badge: {
    position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: border.radiusButton,
  },
  badgeText: { ...typography.caption, color: colors.surface, fontWeight: 'bold' },
  tripInfo: { padding: spacing.md },
  tripCity: { ...typography.h2, color: colors.secondary, fontSize: 18, marginBottom: spacing.xs },
  tripDates: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  tripDistance: { ...typography.caption, color: colors.textMuted },
  bottomNav: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingVertical: spacing.sm,
    justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#E9ECEF',
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: spacing.sm, flex: 1 },
  navItemCenter: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -15 },
  navText: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 10 },
});