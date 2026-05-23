// src/screens/itineraryScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

// NEW: Import the Firestore tools to read data and update the completed status
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const dummyWeather = [
  { id: '1', day: 'Mon', temp: '22°', icon: 'partly-sunny', color: '#FDB813' },
  { id: '2', day: 'Tue', temp: '24°', icon: 'sunny', color: '#FDB813' },
  { id: '3', day: 'Wed', temp: '19°', icon: 'rainy', color: '#4A90E2' },
  { id: '4', day: 'Thu', temp: '21°', icon: 'cloudy', color: '#888888' },
  { id: '5', day: 'Fri', temp: '25°', icon: 'sunny', color: '#FDB813' },
];

export default function ItineraryScreen({ route, navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  const { tripData } = route.params;

  const [dailyActivities, setDailyActivities] = useState<any[]>([]);
  const tripBuddies = tripData?.acceptedEmails || [];

  // --- 📡 FIREBASE LISTENER ---
  useEffect(() => {
    if (!tripData?.id) return;

    // Look inside this specific trip's 'activities' folder, sorted by time!
    const activitiesRef = collection(db, 'trips', tripData.id, 'activities');
    const q = query(activitiesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDailyActivities(fetchedActivities);
    });

    return () => unsubscribe();
  }, [tripData.id]);

  // --- TOGGLE COMPLETED STATUS ---
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

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#121212' }]}>
      
      <View style={styles.heroContainer}>
        <Image source={{ uri: tripData.image }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>{tripData.city}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripData })} style={styles.iconButton}>
              <Ionicons name="pencil" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        
        <View style={styles.datesContainer}>
          <Text style={[styles.datesText, isDark && { color: '#CCCCCC' }]}>{tripData.dates}</Text>
        </View>

        {/* Forecast Box */}
        <View style={styles.sectionContainer}>
          <View style={[styles.weatherBox, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
            <Text style={[styles.weatherBoxTitle, isDark && { color: '#FFFFFF' }]}>5-Day Forecast</Text>
            <View style={styles.weatherForecastRow}>
              {dummyWeather.map((w) => (
                <View key={w.id} style={styles.weatherDay}>
                  <Text style={[styles.weatherDayText, isDark && { color: '#888' }]}>{w.day}</Text>
                  <Ionicons name={w.icon as any} size={26} color={w.color} style={{ marginVertical: 4 }} />
                  <Text style={[styles.weatherTempText, isDark && { color: '#FFFFFF' }]}>{w.temp}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Travel Buddies */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Travel Buddies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buddiesScroll}>
            {tripBuddies.length > 0 ? (
              tripBuddies.map((email: string, index: number) => (
                <View key={index} style={styles.avatarContainer}>
                  <Image source={{ uri: `https://ui-avatars.com/api/?name=${email}&background=random&color=fff` }} style={styles.avatar} />
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, isDark && { color: '#888' }]}>Just you for now!</Text>
            )}
          </ScrollView>
        </View>

        {/* Timeline */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Itinerary</Text>
          
          <View style={styles.timeline}>
            {dailyActivities.length > 0 ? (
              dailyActivities.map((activity, index) => (
                <View key={activity.id} style={styles.timelineRow}>
                  
                  {/* Tappable Completion Circle */}
                  <View style={styles.timeColumn}>
                    <TouchableOpacity onPress={() => handleToggleComplete(activity.id, activity.completed)}>
                      {activity.completed ? (
                        <Ionicons 
                          name="checkmark-circle" 
                          size={24} 
                          color={colors.success}
                          style={[styles.timelineIcon, isDark && { backgroundColor: '#121212' }]} 
                        />
                      ) : (
                        <Ionicons 
                          name="ellipse-outline" 
                          size={24} 
                          color={isDark ? '#888' : colors.textMuted} 
                          style={[styles.timelineIcon, isDark && { backgroundColor: '#121212' }]} 
                        />
                      )}
                    </TouchableOpacity>
                    
                    {index !== dailyActivities.length - 1 && (
                      <View style={[
                        styles.verticalLine, 
                        // FIX: Dims the uncompleted connecting line in dark mode
                        isDark && { backgroundColor: '#333' }, 
                        activity.completed && { backgroundColor: colors.success }
                      ]} />
                    )}
                  </View>

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
              <View style={styles.emptyStateContainer}>
                <Ionicons name="map-outline" size={48} color={isDark ? '#333' : '#E9ECEF'} />
                <Text style={[styles.emptyStateText, isDark && { color: '#CCCCCC' }]}>Your itinerary is wide open.</Text>
                <Text style={styles.emptyStateSubText}>Tap the + button below to schedule your first group activity!</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* Custom Bottom Navigation */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomNav, isDark && { backgroundColor: '#1E1E1E', borderTopColor: '#333' }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={28} color={isDark ? '#CCCCCC' : colors.secondary} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Home</Text>
        </TouchableOpacity>
        
        {/* Adds activity and passes the exact tripId to the modal! */}
        <TouchableOpacity style={styles.navItemCenter} onPress={() => navigation.navigate('AddActivity', { tripId: tripData.id })}>
          <View style={styles.floatingActionBtn}>
            <Ionicons name="add" size={36} color={colors.surface} />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Navigate to Trip Chat')}>
          <Ionicons name="chatbubbles-outline" size={28} color={isDark ? '#CCCCCC' : colors.secondary} />
          <Text style={[styles.navText, isDark && { color: '#CCCCCC' }]}>Group Chat</Text>
        </TouchableOpacity>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flex: 1 },
  
  heroContainer: { height: 220, position: 'relative' },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroSafeArea: { flex: 1, justifyContent: 'space-between' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: Platform.OS === 'android' ? spacing.md : 0 },
  iconButton: { padding: spacing.xs },
  heroTitle: { ...typography.h1, color: '#FFFFFF', fontSize: 24 },

  datesContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  datesText: { ...typography.body, fontWeight: 'bold', color: colors.secondary },

  weatherBox: { backgroundColor: colors.surface, borderRadius: border.radiusCard, padding: spacing.md, marginTop: spacing.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  weatherBoxTitle: { ...typography.caption, fontWeight: 'bold', color: colors.secondary, marginBottom: spacing.sm },
  weatherForecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherDay: { alignItems: 'center' },
  weatherDayText: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  weatherTempText: { ...typography.body, fontWeight: 'bold', color: colors.secondary, fontSize: 14 },

  sectionContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, color: colors.secondary, fontSize: 18, marginBottom: spacing.md },
  
  buddiesScroll: { flexDirection: 'row', paddingBottom: spacing.xs },
  avatarContainer: { marginRight: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.surface },
  emptyText: { ...typography.caption, color: colors.textMuted, alignSelf: 'center', fontStyle: 'italic' },
  addBuddyBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.primary}10`, marginLeft: 4 },

  timeline: { marginTop: spacing.sm },
  timelineRow: { flexDirection: 'row', minHeight: 80 },
  timeColumn: { width: 40, alignItems: 'center', marginRight: spacing.sm },
  timelineIcon: { backgroundColor: colors.background, zIndex: 2 },
  verticalLine: { width: 2, flex: 1, backgroundColor: '#E9ECEF', marginTop: -4, marginBottom: -4, zIndex: 1 },
  
  activityCard: { flex: 1, paddingBottom: spacing.xl, paddingTop: 2 },
  activityTime: { ...typography.caption, color: colors.textMuted, fontWeight: 'bold', marginBottom: 4 },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  activityTitle: { ...typography.body, fontWeight: 'bold', color: colors.secondary, flex: 1 },
  activityLocation: { ...typography.caption, color: colors.textMuted, marginLeft: 24 }, 
  
  completedText: { textDecorationLine: 'line-through', color: colors.textMuted },

  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyStateText: { ...typography.body, fontWeight: 'bold', color: colors.secondary },
  emptyStateSubText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.xl },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface, paddingVertical: spacing.xs, justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#E9ECEF', paddingBottom: Platform.OS === 'ios' ? 20 : spacing.sm },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navText: { ...typography.caption, color: colors.secondary, marginTop: 4, fontSize: 10, fontWeight: 'bold' },
  navItemCenter: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', marginTop: -30 },
  floatingActionBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
});