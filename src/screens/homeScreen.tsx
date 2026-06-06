// src/screens/HomeScreen.tsx

// Grabbing all the standard React and React Native stuff I need.
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';

// SafeAreaView to make sure the app doesn't hide behind the notch on iPhones!
import { SafeAreaView } from 'react-native-safe-area-context';
// Icons for the UI
import { Ionicons } from '@expo/vector-icons';

// Importing my custom design tokens and theme context so dark mode works
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext'; 

// Expo libraries: Location for GPS and Notifications for local alerts
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications'; 

// Firebase stuff for database operations. Using Firestore here.
import { collection, onSnapshot, query, where, or, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// A quick lookup object so I can show cool symbols instead of just boring text like "EUR" or "USD"
const currencySymbols: { [key: string]: string } = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft'
};

export default function HomeScreen({ navigation }: any) {
  // Checking if the user toggled dark mode
  const { isDark } = useContext(ThemeContext);
  
  // --- STATE MANAGEMENT ---
  // Keeping track of all the user info and dashboard data.
  const [userName, setUserName] = useState('Loading...'); // Default text while fetching
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Money matters: how much I owe my friends vs how much they owe me
  const [totalYouOwe, setTotalYouOwe] = useState(0);
  const [totalYouAreOwed, setTotalYouAreOwed] = useState(0);

  // Currency settings. Defaulting to EUR just in case.
  const [userCurrency, setUserCurrency] = useState('EUR');
  const [currencySymbol, setCurrencySymbol] = useState('€');
  const [exchangeRate, setExchangeRate] = useState(1); // 1 means no conversion needed

  // Storing the user's GPS coords to calculate how far they are from the trip
  const [userCoords, setUserCoords] = useState<Location.LocationObjectCoords | null>(null);

  // Getting the currently logged-in user from Firebase Auth
  const currentUser = auth.currentUser;

  // REFS TO PREVENT NOTIFICATION SPAM ON INITIAL APP LOAD
  // If I don't use these, the app will literally blast the user with notifications
  // for old invites/expenses every time they open the app. Learned this the hard way!
  const initialInvitesLoaded = useRef(false);
  const initialExpensesLoaded = useRef(false);

  // Found this Haversine formula online to calculate distance between two coordinates.
  // Math is a bit crazy, but it works perfectly to show "X km away".
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    
    // If it's over 100km, no need for decimals. Otherwise, keep 1 decimal place.
    return d >= 100 ? d.toFixed(0) : d.toFixed(1); 
  };

  // GET USER LOCATION ON LOAD
  useEffect(() => {
    (async () => {
      try {
        // Asking nicely for location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return; // If they say no, just give up silently

        // Grabbing the actual coordinates
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserCoords(location.coords);
      } catch (error) {
        console.log("Erro ao obter localização:", error); // Oops, something went wrong
      }
    })();
  }, []);

  // LISTEN FOR NOTIFICATION TAPS
  useEffect(() => {
    // What happens when the user taps on a push notification while the app is running?
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Read the hidden payload data inside the notification
      const notificationData = response.notification.request.content.data;
      
      // If the payload tells us to go to Expenses, instantly navigate them there!
      // This makes the app feel super fast and native.
      if (notificationData && notificationData.screen === 'Expenses' && notificationData.groupId) {
        navigation.navigate('Expenses', { groupId: notificationData.groupId });
      }
    });

    // Cleanup listener on unmount so we don't get memory leaks
    return () => subscription.remove();
  }, [navigation]);

  // 1. FETCH DYNAMIC USER NAME & CURRENCY PREFERENCE
  useEffect(() => {
    if (!currentUser) return; // Safety check

    // Listening live to the user's profile document in Firestore
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Just extracting their first name so the greeting says "Hello, John" instead of their full name
        const fullName = data.fullName || 'Traveler';
        setUserName(fullName.split(' ')[0]); 

        // Apply their saved currency preferences
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
      // If they already use Euros, skip the API call to save bandwidth
      if (userCurrency === 'EUR') {
        setExchangeRate(1);
        return;
      }
      try {
        // Using a free API here. Hopefully it stays free!
        const res = await fetch('https://open.er-api.com/v6/latest/EUR');
        const data = await res.json();
        
        // If we got the data, update the state so all money UI updates instantly
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

    // Query 1: Get trips that I created OR trips where I accepted the invite
    const activeQuery = query(
      collection(db, 'trips'), 
      or(
        where('userId', '==', currentUser.uid),
        where('acceptedUserIds', 'array-contains', currentUser.uid)
      )
    );

    // Snapshot listener for active trips
    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort them so the trips happening soonest show up first at the top
      tripsData.sort((a: any, b: any) => a.daysLeft - b.daysLeft);
      setActiveTrips(tripsData);
      setLoading(false); // Hide the loading spinner
    });

    // Query 2: Look for trips where my user ID is just in the "pending" array
    const pendingQuery = query(
      collection(db, 'trips'),
      where('pendingUserIds', 'array-contains', currentUser.uid)
    );

    // Snapshot listener for invites
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingInvites(invitesData);

      // PREVENT INITIAL SPAM: Ignore the first load, only trigger notifications on LIVE updates
      if (!initialInvitesLoaded.current) {
        initialInvitesLoaded.current = true;
        return;
      }

      // NOTIFICATION: NEW TRIP INVITE
      snapshot.docChanges().forEach((change) => {
        // If a new document was added to my pending list, fire a local push notification!
        if (change.type === 'added') {
          const data = change.doc.data();
          Notifications.scheduleNotificationAsync({
            content: {
              title: "New Trip Invite! ",
              body: `You've been invited to ${data.city}. Tap to check it out!`,
              sound: true,
            },
            trigger: null, // trigger: null means show it IMMEDIATELY
          });
        }
      });
    });

    // Cleanup all listeners when the component unmounts
    return () => {
      unsubscribeActive();
      unsubscribePending();
    };
  }, [currentUser]);

  // 4. FETCH EXPENSES + EXPENSE LOOP NOTIFICATIONS
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Get all expenses where I am either the one who paid (creator) OR the one who owes money (debtor)
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

      // Calculate totals for the fancy finance card at the top
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        
        // If it's already completely paid and confirmed, don't count it in the active debt totals!
        if (data.paymentStatus === 'Confirmed') return;

        const amount = Number(data.amount) || 0;

        if (data.debtorId === currentUser.uid) {
          owe += amount; // I owe this
        } else if (data.creatorId === currentUser.uid) {
          owed += amount; // Someone owes me this
        }
      });

      setTotalYouOwe(owe);
      setTotalYouAreOwed(owed);

      // PREVENT INITIAL SPAM: Same trick as before. Don't notify for old debts when the app opens.
      if (!initialExpensesLoaded.current) {
        initialExpensesLoaded.current = true;
        return;
      }

      // EXPENSE NOTIFICATION LOOP
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        
        // Convert the debt amount to the user's preferred currency for the notification text
        const localAmount = (data.amount * exchangeRate).toFixed(2);

        // TRIGGER 1: NEW DEBT CREATED
        if (change.type === 'added') {
          // Only alert me if I am the one who owes the money!
          if (data.debtorId === currentUser.uid) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "New Trip Expense! ",
                body: `You owe ${currencySymbol}${localAmount} for "${data.title}".`,
                sound: true,
                // THE SECRET MAP: sending data so the app knows where to go if they tap this
                data: { screen: 'Expenses', groupId: data.groupId }, 
              },
              trigger: null,
            });
          }
        }

        // TRIGGER 2 & 3: STATUS UPDATED (Paid vs Confirmed)
        if (change.type === 'modified') {
          
          // Someone claims they paid me. I need to verify it.
          if (data.creatorId === currentUser.uid && data.paymentStatus === 'AwaitingConfirmation') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Payment Sent! ",
                body: `Someone marked "${data.title}" as paid. Open the app to confirm!`,
                sound: true,
                data: { screen: 'Expenses', groupId: data.groupId },
              },
              trigger: null,
            });
          }

          // I paid someone, and they finally confirmed they received it! Yay.
          if (data.debtorId === currentUser.uid && data.paymentStatus === 'Confirmed') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Payment Confirmed! ",
                body: `Your payment of ${currencySymbol}${localAmount} for "${data.title}" was approved.`,
                sound: true,
                data: { screen: 'Expenses', groupId: data.groupId },
              },
              trigger: null,
            });
          }
        }
      });
    });

    return () => unsubscribeExpenses();
  }, [currentUser, exchangeRate, currencySymbol]); // Re-run this if exchange rates change

  // --- ACTIONS ---
  
  // User clicked the green checkmark to join a trip
  const handleAcceptInvite = async (tripId: string) => {
    if (!currentUser?.uid || !currentUser?.email) return;
    const tripRef = doc(db, 'trips', tripId);
    
    // Move the user from the "pending" arrays to the "accepted" arrays in Firestore
    await updateDoc(tripRef, {
      pendingUserIds: arrayRemove(currentUser.uid),
      pendingEmails: arrayRemove(currentUser.email.toLowerCase()),
      acceptedUserIds: arrayUnion(currentUser.uid),
      acceptedEmails: arrayUnion(currentUser.email.toLowerCase())
    });
  };

  // User clicked the red X to reject a trip invite
  const handleDeclineInvite = async (tripId: string) => {
    if (!currentUser?.uid || !currentUser?.email) return;
    const tripRef = doc(db, 'trips', tripId);
    
    // Just delete them from the pending arrays entirely
    await updateDoc(tripRef, {
      pendingUserIds: arrayRemove(currentUser.uid),
      pendingEmails: arrayRemove(currentUser.email.toLowerCase())
    });
  };

  // --- RENDER UI ---
  return (
    // Main wrapper. Setting the background color based on the dark mode context!
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      
      {/* Scrollable area so the user can actually scroll if they have a lot of trips */}
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.greeting, isDark && { color: '#FFFFFF' }]}>Hello, {userName}</Text>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          
          {/* FINANCE SUMMARY CARD (Floating over the header) */}
          <View style={[styles.financeCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}>
            <View style={styles.financeRow}>
              <View>
                <Text style={styles.financeLabel}>You Owe</Text>
                {/* Multiplying the raw DB amount by the live exchange rate */}
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
          {/* Only render this whole block if they actually have invites */}
          {pendingInvites.length > 0 && (
            <View style={styles.invitesContainer}>
              <Text style={[styles.sectionTitle, { fontSize: 16, color: colors.primary }]}>Pending Invites ({pendingInvites.length})</Text>
              
              {/* Loop through all invites and create a little card for each */}
              {pendingInvites.map((trip) => (
                <View key={trip.id} style={[styles.inviteCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteCity, isDark && { color: '#FFFFFF' }]}>Trip to {trip.city}</Text>
                    <Text style={styles.inviteDates}>{trip.dates}</Text>
                  </View>
                  <View style={styles.inviteActions}>
                    {/* Decline Button */}
                    <TouchableOpacity onPress={() => handleDeclineInvite(trip.id)} style={styles.actionBtn}>
                      <Ionicons name="close-circle" size={32} color={colors.danger} />
                    </TouchableOpacity>
                    {/* Accept Button */}
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
            // Show a spinner while Firestore is still thinking
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : activeTrips.length === 0 ? (
            // Empty state if they have no trips
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 20 }}>
              No trips planned yet. Tap the + to start exploring!
            </Text>
          ) : (
            <View style={styles.tripsList}>
              {/* Loop through their active trips */}
              {activeTrips.map((trip) => {
                
                // Calculating distance logic here for the UI
                let distanceDisplay = ' Location data unavailable';
                if (userCoords && trip.latitude && trip.longitude) {
                  const km = calculateDistance(
                    userCoords.latitude,
                    userCoords.longitude,
                    Number(trip.latitude),
                    Number(trip.longitude)
                  );
                  distanceDisplay = ` ${km} km away from you`;
                }

                return (
                  // Clicking the card takes them to the Itinerary screen, passing the trip data along
                  <TouchableOpacity 
                    key={trip.id} 
                    style={[styles.tripCard, isDark && { backgroundColor: '#1E1E1E', shadowOpacity: 0 }]}
                    onPress={() => navigation.navigate('Itinerary', { tripData: trip })}
                  >
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: trip.image }} style={styles.tripImage} />
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}> Leaves in {trip.daysLeft} Days!</Text>
                      </View>
                    </View>
                    <View style={styles.tripInfo}>
                      <Text style={[styles.tripCity, isDark && { color: '#FFFFFF' }]}>{trip.city}</Text>
                      <Text style={styles.tripDates}>{trip.dates}</Text>
                      {/* Using the distance we calculated above */}
                      <Text style={styles.tripDistance}>{distanceDisplay}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- CUSTOM BOTTOM NAVIGATION BAR --- */}
      {/* Kept this simple instead of using a complex React Navigation Tab Navigator */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomNav, isDark && { backgroundColor: '#1E1E1E', borderTopColor: '#333' }]}>
        
        {/* Go to Expenses Screen */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SelectGroup')}>
          <Ionicons name="wallet-outline" size={24} color={isDark ? '#CCCCCC' : colors.textMuted} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Expenses</Text>
        </TouchableOpacity>
        
        {/* Giant Floating Action Button to create a new trip */}
        <TouchableOpacity style={styles.navItemCenter} onPress={() => navigation.navigate('CreateTrip')}>
          <Ionicons name="add-circle" size={48} color={colors.primary} />
        </TouchableOpacity>
        
        {/* Go to Profile Screen */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color={isDark ? '#CCCCCC' : colors.textMuted} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Profile</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </View>
  );
}

// --- STYLES ---
// Kept all the styling at the bottom so it doesn't clutter the logic above.
// Using a mix of absolute pixels and my theme spacing/colors for consistency.
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: colors.secondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  greeting: { ...typography.h2, color: colors.surface, marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg },
  
  financeCard: {
    backgroundColor: colors.surface, borderRadius: border.radiusCard, padding: spacing.lg,
    // Pulling it up with negative margin so it overlaps the header! Looks neat.
    marginTop: -40, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
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
  
  // Trips List Styles
  tripsList: { gap: spacing.md, paddingBottom: spacing.xl },
  tripCard: {
    backgroundColor: colors.surface, borderRadius: border.radiusCard, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 5, elevation: 2,
  },
  imageContainer: { position: 'relative' },
  tripImage: { width: '100%', height: 150 },
  badge: {
    // Positioning the "Leaves in X days" badge over the image corner
    position: 'absolute', top: spacing.md, right: spacing.md, backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: border.radiusButton,
  },
  badgeText: { ...typography.caption, color: colors.surface, fontWeight: 'bold' },
  tripInfo: { padding: spacing.md },
  tripCity: { ...typography.h2, color: colors.secondary, fontSize: 18, marginBottom: spacing.xs },
  tripDates: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  tripDistance: { ...typography.caption, color: colors.textMuted },
  
  // Custom Tab Bar Styles
  bottomNav: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingVertical: spacing.sm,
    justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#E9ECEF',
  },
  navItem: { alignItems: 'center', justifyContent: 'center', padding: spacing.sm, flex: 1 },
  // Pulling the plus button slightly up out of the nav bar
  navItemCenter: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -15 }, 
  navText: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 10 },
});