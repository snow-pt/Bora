import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Theme, Context and Custom Hooks
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';
import { useWeather } from '../hooks/useWeather';

// Firebase Imports
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ItineraryScreen({ route, navigation }: any) {
  // Handles Dark/Light UI Mode
  const { isDark } = useContext(ThemeContext);
  // Extract the trip data passed from the previous screen via navigation params
  const { tripData } = route.params;
  // Fetch live weather using the custom hook based on the trip's coordinates
  const { forecast, loadingWeather } = useWeather(tripData?.latitude, tripData?.longitude);
  // Local state to hold the list of daily activities fetched from Firestore
  const [dailyActivities, setDailyActivities] = useState<any[]>([]);
  // Fallback array in case there are no accepted emails yet
  const tripBuddies = tripData?.acceptedEmails || [];
  // Local state to hold the rich profile data of the travel buddies
  const [buddyProfiles, setBuddyProfiles] = useState<any[]>([]);
  

  // Firebase Listener
  useEffect(() => {
    if (!tripData?.id) return;

    // Get the activities sub-collection for this specific trip
    const activitiesRef = collection(db, 'trips', tripData.id, 'activities');
    // Query activities sorted chronologically
    const q = query(activitiesRef, orderBy('timestamp', 'asc'));

    // If a travel buddy adds an activity, this updates instantly on everyone's screen
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDailyActivities(fetchedActivities);
    });

    return () => unsubscribe();
  }, [tripData.id]);

  // Toggles the completion status of an activity.
  const handleToggleComplete = async (activityId: string, currentStatus: boolean) => {
    try {
      const activityRef = doc(db, 'trips', tripData.id, 'activities', activityId);
      await updateDoc(activityRef, {
        completed: !currentStatus
      });
    } catch (error) {
      console.error("Error updating activity: ", error);
    }
  };

  // Fetches buddies profiles
  useEffect(() => {
    const fetchBuddies = async () => {
      const emails = tripData?.acceptedEmails || [];
      if (emails.length === 0) return;

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', 'in', emails));
        const snapshot = await getDocs(q);
        
        const profiles = snapshot.docs.map(doc => doc.data());
        setBuddyProfiles(profiles);
      } catch (error) {
        console.error("Error fetching buddy profiles:", error);
      }
    };

    fetchBuddies();
  }, [tripData?.id]);

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#121212' }]}>
      
      {/* HERO IMAGE HEADER */}
      {/* Displays the location picture and top navigation buttons overlay */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: tripData.image }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
          <View style={styles.headerNavRow}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {/* Edit Trip Button */}
            <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripData })} style={styles.iconButton}>
              <Ionicons name="pencil" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Destination and Dates */}
        <View style={styles.tripInfoContainer}>
          <Text style={[styles.tripTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={3}>
            {tripData.city}
          </Text>
          <Text style={[styles.tripDates, isDark && { color: '#CCCCCC' }]}>
            {tripData.dates}
          </Text>
        </View>

        {/* Weather API */}
        <View style={styles.sectionContainer}>
          <View style={[styles.weatherBox, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
            <Text style={[styles.weatherBoxTitle, isDark && { color: '#FFFFFF' }]}>5-Day Forecast</Text>
            
            {loadingWeather ? (
              // Show spinner while waiting for Weather API
              <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : forecast.length > 0 ? (
              // Map over the mapped forecast data
              <View style={styles.weatherForecastRow}>
                {forecast.map((w) => (
                  <View key={w.id} style={styles.weatherDay}>
                    <Text style={[styles.weatherDayText, isDark && { color: '#888' }]}>{w.day}</Text>
                    <Ionicons name={w.icon as any} size={26} color={w.color} style={{ marginVertical: 4 }} />
                    <Text style={[styles.weatherTempText, isDark && { color: '#FFFFFF' }]}>{w.temp}</Text>
                  </View>
                ))}
              </View>
            ) : (
              // Fallback if an error occurs while getting location coordinates
              <Text style={[{ textAlign: 'center', fontStyle: 'italic', color: colors.textMuted }, isDark && { color: '#888' }]}>
                Weather unavailable for this location.
              </Text>
            )}

          </View>
        </View>

        {/* Travel Buddies List */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Travel Buddies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buddiesScroll}>
            {tripBuddies.length > 0 ? (
              // Show buddies avatar
              tripBuddies.map((email: string, index: number) => {
                const buddyProfile = buddyProfiles.find((p) => p.email === email);                
                const avatarUri = buddyProfile?.avatarUrl;
                return (
                  <View key={index} style={styles.avatarContainer}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar}/>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, isDark && { color: '#888' }]}>Just you for now!</Text>
            )}
          </ScrollView>
        </View>

        {/* Activity Timeline */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Itinerary</Text>
          <View style={styles.timeline}>
            {dailyActivities.length > 0 ? (
              dailyActivities.map((activity, index) => (
                <View key={activity.id} style={styles.timelineRow}>
                  {/* Left Column: Tappable Checkmark */}
                  <View style={styles.timeColumn}>
                    <TouchableOpacity onPress={() => handleToggleComplete(activity.id, activity.completed)}>
                      {activity.completed ? (
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} style={[styles.timelineIcon, isDark && { backgroundColor: '#121212' }]}/>
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={isDark ? '#888' : colors.textMuted} style={[styles.timelineIcon, isDark && { backgroundColor: '#121212' }]}/>
                      )}
                    </TouchableOpacity>
                    {/* Draw the vertical line connecting items (hide on the very last item) */}
                    {index !== dailyActivities.length - 1 && (
                      <View style={[styles.verticalLine, isDark && { backgroundColor: '#333' }, activity.completed && { backgroundColor: colors.success }]}/>
                    )}
                  </View>
                  {/* Right Column: Activity Details */}
                  <View style={styles.activityCard}>
                    <Text style={[styles.activityTime, activity.completed && styles.completedText, isDark && !activity.completed && { color: '#CCCCCC' }]}>
                      {activity.time}
                    </Text>
                    <View style={styles.activityTitleRow}>
                      <Ionicons name={activity.icon as any} size={18} color={activity.completed ? colors.textMuted : colors.primary} />
                      <Text style={[styles.activityTitle, activity.completed && styles.completedText, isDark && !activity.completed && { color: '#FFFFFF' }]}>
                        {activity.title}
                      </Text>
                    </View>
                    <Text style={[styles.activityLocation, activity.completed && styles.completedText, isDark && { color: '#888' }]}>
                      {activity.location}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              // Empty State Layout if no activities exist
              <View style={styles.emptyStateContainer}>
                <Ionicons name="map-outline" size={48} color={isDark ? '#333' : '#E9ECEF'} />
                <Text style={[styles.emptyStateText, isDark && { color: '#CCCCCC' }]}>Your itinerary is wide open.</Text>
                <Text style={styles.emptyStateSubText}>Tap the + button below to schedule your first group activity!</Text>
              </View>
            )}
          </View>
        </View>
        {/* Spacer to prevent bottom nav from hiding content */}
        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* Custom Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomNav, isDark && { backgroundColor: '#1E1E1E', borderTopColor: '#333' }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={28} color={isDark ? '#CCCCCC' : colors.secondary} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Home</Text>
        </TouchableOpacity>

        {/* Floating Add Activity Button */}
        <TouchableOpacity style={styles.navItemCenter} onPress={() => navigation.navigate('AddActivity', { tripId: tripData.id })}>
          <View style={styles.floatingActionBtn}>
            <Ionicons name="add" size={36} color={colors.surface} />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={28} color={isDark ? '#CCCCCC' : colors.secondary} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Profile</Text>
        </TouchableOpacity>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flex: 1 },
  
  // Hero Image
  heroContainer: { height: 180, position: 'relative' },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  heroSafeArea: { flex: 1 },
  headerNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: Platform.OS === 'android' ? spacing.md : spacing.sm },
  iconButton: { padding: spacing.xs },
  
  // Trip Text Area
  tripInfoContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  tripTitle: { ...typography.h1, color: colors.secondary, fontSize: 32, lineHeight: 36, marginBottom: 4 },
  tripDates: { ...typography.body, fontWeight: 'bold', color: colors.textMuted },

  // Weather Box
  weatherBox: { backgroundColor: colors.surface, borderRadius: border.radiusCard, padding: spacing.md, marginTop: spacing.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  weatherBoxTitle: { ...typography.caption, fontWeight: 'bold', color: colors.secondary, marginBottom: spacing.sm },
  weatherForecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherDay: { alignItems: 'center' },
  weatherDayText: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  weatherTempText: { ...typography.body, fontWeight: 'bold', color: colors.secondary, fontSize: 14 },

  // Shared Sections
  sectionContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, color: colors.secondary, fontSize: 18, marginBottom: spacing.md },
  
  // Travel Buddies Row
  buddiesScroll: { flexDirection: 'row', paddingBottom: spacing.xs },
  avatarContainer: { marginRight: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.surface },
  emptyText: { ...typography.caption, color: colors.textMuted, alignSelf: 'center', fontStyle: 'italic' },
  addBuddyBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.primary}10`, marginLeft: 4 },

  // Activity Timeline Layout
  timeline: { marginTop: spacing.sm },
  timelineRow: { flexDirection: 'row', minHeight: 80 },
  timeColumn: { width: 40, alignItems: 'center', marginRight: spacing.sm },
  timelineIcon: { backgroundColor: colors.background, zIndex: 2 },
  verticalLine: { width: 2, flex: 1, backgroundColor: '#E9ECEF', marginTop: -4, marginBottom: -4, zIndex: 1 },
  
  // Activity Card Content
  activityCard: { flex: 1, paddingBottom: spacing.xl, paddingTop: 2 },
  activityTime: { ...typography.caption, color: colors.textMuted, fontWeight: 'bold', marginBottom: 4 },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  activityTitle: { ...typography.body, fontWeight: 'bold', color: colors.secondary, flex: 1 },
  activityLocation: { ...typography.caption, color: colors.textMuted, marginLeft: 24 }, 
  
  // Dynamic completed state styling
  completedText: { textDecorationLine: 'line-through', color: colors.textMuted },

  // Empty State styling (No Activities)
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyStateText: { ...typography.body, fontWeight: 'bold', color: colors.secondary },
  emptyStateSubText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },

  // Bottom Navigation Bar
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface, paddingVertical: spacing.xs, justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#E9ECEF', paddingBottom: Platform.OS === 'ios' ? 20 : spacing.sm },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { ...typography.caption, color: colors.secondary, marginTop: 4, fontSize: 10, fontWeight: 'bold' },
  navItemCenter: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', marginTop: -30 },
  floatingActionBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});