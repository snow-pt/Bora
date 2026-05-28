// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext'; 

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications'; 

import { collection, onSnapshot, query, where, or, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const currencySymbols: { [key: string]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft'
};

export default function HomeScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  
  const [userName, setUserName] = useState('Loading...');
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalYouOwe, setTotalYouOwe] = useState(0);
  const [totalYouAreOwed, setTotalYouAreOwed] = useState(0);

  const [userCurrency, setUserCurrency] = useState('EUR');
  const [currencySymbol, setCurrencySymbol] = useState('€');
  const [exchangeRate, setExchangeRate] = useState(1);

  const [userCoords, setUserCoords] = useState<Location.LocationObjectCoords | null>(null);

  const currentUser = auth.currentUser;

  // 🔥 REFS TO PREVENT NOTIFICATION SPAM ON INITIAL APP LOAD
  const initialInvitesLoaded = useRef(false);
  const initialExpensesLoaded = useRef(false);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d >= 100 ? d.toFixed(0) : d.toFixed(1); 
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserCoords(location.coords);
      } catch (error) {
        console.log("Erro ao obter localização:", error);
      }
    })();
  }, []);

  // 🔥 LISTEN FOR NOTIFICATION TAPS
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Read the secret map from the notification we just tapped
      const notificationData = response.notification.request.content.data;
      
      // If the map says to go to Expenses, instantly navigate there!
      if (notificationData && notificationData.screen === 'Expenses' && notificationData.groupId) {
        navigation.navigate('Expenses', { groupId: notificationData.groupId });
      }
    });

    return () => subscription.remove();
  }, [navigation]);

  // 1. FETCH DYNAMIC USER NAME & CURRENCY PREFERENCE
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fullName = data.fullName || 'Traveler';
        setUserName(fullName.split(' ')[0]); 

        const savedCurrency = data.currency || 'EUR';
        setUserCurrency(savedCurrency);
        setCurrencySymbol(currencySymbols[savedCurrency] || '€');
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. FETCH LIVE EXCHANGE RATES (Base: EUR)
  useEffect(() => {
    const fetchRates = async () => {
      if (userCurrency === 'EUR') {
        setExchangeRate(1);
        return;
      }
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR');
        const data = await res.json();
        if (data && data.rates && data.rates[userCurrency]) {
          setExchangeRate(data.rates[userCurrency]);
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      }
    };
    fetchRates();
  }, [userCurrency]);

  // 3. FETCH TRIPS (ACTIVE & PENDING) + TRIP INVITE NOTIFICATIONS
  useEffect(() => {
    if (!currentUser?.uid) return;

    const activeQuery = query(
      collection(db, 'trips'), 
      or(
        where('userId', '==', currentUser.uid),
        where('acceptedUserIds', 'array-contains', currentUser.uid)
      )
    );

    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      tripsData.sort((a: any, b: any) => a.daysLeft - b.daysLeft);
      setActiveTrips(tripsData);
      setLoading(false);
    });

    const pendingQuery = query(
      collection(db, 'trips'),
      where('pendingUserIds', 'array-contains', currentUser.uid)
    );

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingInvites(invitesData);

      // 🔥 PREVENT INITIAL SPAM: Ignore the first load, only trigger on live updates
      if (!initialInvitesLoaded.current) {
        initialInvitesLoaded.current = true;
        return;
      }

      // 🔥 NOTIFICATION: NEW TRIP INVITE
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          Notifications.scheduleNotificationAsync({
            content: {
              title: "New Trip Invite! ✈️",
              body: `You've been invited to ${data.city}. Tap to check it out!`,
              sound: true,
            },
            trigger: null, 
          });
        }
      });
    });

    return () => {
      unsubscribeActive();
      unsubscribePending();
    };
  }, [currentUser]);

  // 4. FETCH EXPENSES + EXPENSE LOOP NOTIFICATIONS
  useEffect(() => {
    if (!currentUser?.uid) return;

    const expensesQuery = query(
      collection(db, 'expenses'),
      or(
        where('creatorId', '==', currentUser.uid),
        where('debtorId', '==', currentUser.uid)
      )
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      let owe = 0;
      let owed = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.paymentStatus === 'Confirmed') return;

        const amount = Number(data.amount) || 0;

        if (data.debtorId === currentUser.uid) {
          owe += amount;
        } else if (data.creatorId === currentUser.uid) {
          owed += amount;
        }
      });

      setTotalYouOwe(owe);
      setTotalYouAreOwed(owed);

      // 🔥 PREVENT INITIAL SPAM: Ignore the first load
      if (!initialExpensesLoaded.current) {
        initialExpensesLoaded.current = true;
        return;
      }

      // 🔥 EXPENSE NOTIFICATION LOOP
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const localAmount = (data.amount * exchangeRate).toFixed(2);

        // TRIGGER 1: NEW DEBT CREATED
        if (change.type === 'added') {
          if (data.debtorId === currentUser.uid) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "New Trip Expense! 💸",
                body: `You owe ${currencySymbol}${localAmount} for "${data.title}".`,
                sound: true,
                // 🔥 THE SECRET MAP
                data: { screen: 'Expenses', groupId: data.groupId }, 
              },
              trigger: null,
            });
          }
        }

        // TRIGGER 2 & 3: STATUS UPDATED (Paid vs Confirmed)
        if (change.type === 'modified') {
          
          if (data.creatorId === currentUser.uid && data.paymentStatus === 'AwaitingConfirmation') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Payment Sent! 🤑",
                body: `Someone marked "${data.title}" as paid. Open the app to confirm!`,
                sound: true,
                // 🔥 THE SECRET MAP
                data: { screen: 'Expenses', groupId: data.groupId },
              },
              trigger: null,
            });
          }

          if (data.debtorId === currentUser.uid && data.paymentStatus === 'Confirmed') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Payment Confirmed! ✅",
                body: `Your payment of ${currencySymbol}${localAmount} for "${data.title}" was approved.`,
                sound: true,
                // 🔥 THE SECRET MAP
                data: { screen: 'Expenses', groupId: data.groupId },
              },
              trigger: null,
            });
          }
        }
      });
    });

    return () => unsubscribeExpenses();
  }, [currentUser, exchangeRate, currencySymbol]);

  // --- ACTIONS ---
  const handleAcceptInvite = async (tripId: string) => {
    if (!currentUser?.uid || !currentUser?.email) return;
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      pendingUserIds: arrayRemove(currentUser.uid),
      pendingEmails: arrayRemove(currentUser.email.toLowerCase()),
      acceptedUserIds: arrayUnion(currentUser.uid),
      acceptedEmails: arrayUnion(currentUser.email.toLowerCase())
    });
  };

  const handleDeclineInvite = async (tripId: string) => {
    if (!currentUser?.uid || !currentUser?.email) return;
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      pendingUserIds: arrayRemove(currentUser.uid),
      pendingEmails: arrayRemove(currentUser.email.toLowerCase())
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.greeting, isDark && { color: '#FFFFFF' }]}>Hello, {userName}</Text>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={[styles.financeCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}>
            <View style={styles.financeRow}>
              <View>
                <Text style={styles.financeLabel}>You Owe</Text>
                <Text style={[styles.financeAmount, { color: colors.danger }]}>
                  {currencySymbol}{(totalYouOwe * exchangeRate).toFixed(2)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.financeLabel}>You are Owed</Text>
                <Text style={[styles.financeAmount, { color: colors.success }]}>
                  {currencySymbol}{(totalYouAreOwed * exchangeRate).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* --- PENDING INVITES SECTION --- */}
          {pendingInvites.length > 0 && (
            <View style={styles.invitesContainer}>
              <Text style={[styles.sectionTitle, { fontSize: 16, color: colors.primary }]}>Pending Invites ({pendingInvites.length})</Text>
              {pendingInvites.map((trip) => (
                <View key={trip.id} style={[styles.inviteCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteCity, isDark && { color: '#FFFFFF' }]}>Trip to {trip.city}</Text>
                    <Text style={styles.inviteDates}>{trip.dates}</Text>
                  </View>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity onPress={() => handleDeclineInvite(trip.id)} style={styles.actionBtn}>
                      <Ionicons name="close-circle" size={32} color={colors.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAcceptInvite(trip.id)} style={styles.actionBtn}>
                      <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* --- UPCOMING TRIPS SECTION --- */}
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Upcoming Trips</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : activeTrips.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>
              No trips planned yet. Tap the + to start exploring!
            </Text>
          ) : (
            <View style={styles.tripsList}>
              {activeTrips.map((trip) => {
                let distanceDisplay = '📍 Location data unavailable';
                if (userCoords && trip.latitude && trip.longitude) {
                  const km = calculateDistance(
                    userCoords.latitude,
                    userCoords.longitude,
                    Number(trip.latitude),
                    Number(trip.longitude)
                  );
                  distanceDisplay = `📍 ${km} km away from you`;
                }

                return (
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
                      <Text style={styles.tripDistance}>{distanceDisplay}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.bottomNav, isDark && { backgroundColor: '#1E1E1E', borderTopColor: '#333' }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SelectGroup')}>
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
  
  // Invites Styles
  invitesContainer: { marginTop: spacing.md, paddingBottom: spacing.sm },
  inviteCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: border.radiusCard, padding: spacing.md, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: spacing.sm },
  inviteCity: { ...typography.body, fontWeight: 'bold', color: colors.secondary, marginBottom: 2 },
  inviteDates: { ...typography.caption, color: colors.textMuted },
  inviteActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: 4 },

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