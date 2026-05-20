// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

// Import Firebase
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function HomeScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  
  const [userName, setUserName] = useState('Loading...');
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;


  // 1. FETCH DYNAMIC USER NAME (LIVE UPDATE)
  useEffect(() => {
    if (!currentUser) return;

    // Listen to this specific user's document live
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const fullName = docSnap.data().fullName || 'Traveler';
        setUserName(fullName.split(' ')[0]); 
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, [currentUser]);

  // 2. FETCH PRIVATE TRIPS
  useEffect(() => {
    if (!currentUser) return;

    // 🔥 Query: "Look in 'trips', but ONLY give me the ones where userId matches mine!"
    const q = query(collection(db, 'trips'), where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTrips(tripsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trips: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Dark Mode Header */}
        <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
          <SafeAreaView edges={['top']}>
            {/* Dynamic Name Fix */}
            <Text style={[styles.greeting, isDark && { color: '#FFFFFF' }]}>Hello, {userName}</Text>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          
          {/* Finance Overlap Card */}
          <View style={[styles.financeCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}>
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

          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Upcoming Trips</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : trips.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>
              No trips planned yet. Tap the + to start exploring!
            </Text>
          ) : (
            <View style={styles.tripsList}>
              {trips.map((trip) => (
                <TouchableOpacity 
                  key={trip.id} 
                  style={[styles.tripCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}
                  onPress={() => navigation.navigate('Itinerary', { tripData: trip })}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: trip.image }} style={styles.tripImage} />
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>🔥 Leaves in {trip.daysLeft} Days!</Text>
                    </View>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={[styles.tripCity, isDark && { color: '#FFFFFF' }]}>{trip.city}</Text>
                    <Text style={styles.tripDates}>{trip.dates}</Text>
                    <Text style={styles.tripDistance}>📍 Distance calculating...</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Dark Mode Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomNav, isDark && { backgroundColor: '#1E1E1E', borderTopColor: '#333' }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Expenses')}>
          <Ionicons name="wallet-outline" size={24} color={isDark ? '#CCCCCC' : colors.textMuted} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Expenses</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItemCenter} onPress={() => navigation.navigate('CreateTrip')}>
          <Ionicons name="add-circle" size={48} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color={isDark ? '#CCCCCC' : colors.textMuted} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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