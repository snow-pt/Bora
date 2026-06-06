import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';

// SafeAreaView to make sure our UI doesn't crash into the iPhone notch or Android status bar!
import { SafeAreaView } from 'react-native-safe-area-context';

// Pulling in my global design system and dark mode context
import { ThemeContext } from '../context/themeContext';
import { colors, spacing, border, typography } from '../theme/theme'; 
import { Ionicons } from '@expo/vector-icons';

// Firebase stuff for querying the database in real-time
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function SelectGroupScreen({ navigation }: any) {
  // Grab the current theme mode so we can flip colors if the user loves dark mode
  const { isDark } = useContext(ThemeContext);
  
  // --- STATE ---
  // Storing the list of trips/groups the user is part of
  const [groups, setGroups] = useState<any[]>([]);
  // Keeps track of whether we are still waiting for Firebase to reply
  const [loading, setLoading] = useState(true);
  
  // Who is currently logged into the app?
  const currentUser = auth.currentUser;

  // --- FETCHING TRIPS ---
  useEffect(() => {
    // Safety first: if nobody is logged in, stop right here and stop loading
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Building the Firestore query. 
    // I only want to see trips that I created (userId) OR trips where I actually accepted the invite!
    const activeQuery = query(
      collection(db, 'trips'),
      or(
        where('userId', '==', currentUser.uid),
        where('acceptedUserIds', 'array-contains', currentUser.uid)
      )
    );
    
    // Setting up a real-time listener (onSnapshot).
    // This is awesome because if someone adds me to a trip while I'm on this screen, it pops up instantly!
    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      // Loop through the documents Firebase sent back and format them into a nice array
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setGroups(tripsData); // Save to state
      setLoading(false);    // Turn off the loading spinner
    }, (error) => {
      // Always good to log errors just in case my database rules block me or something
      console.log("Error loading groups:", error);
      setLoading(false);
    });

    // Cleanup function: stop listening to Firebase when I leave this screen to save memory
    return () => unsubscribeActive();
  }, [currentUser]);

  // --- ACTIONS ---
  // When the user taps a trip, we navigate them to the Expenses screen and pass the trip ID along!
  const handleSelectGroup = (groupId: string) => {
    navigation.navigate('Expenses', { groupId }); 
  };

  // --- RENDER UI ---
  return (
    // Wrapping everything in SafeAreaView. Also applying the dark mode background color dynamically!
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]} edges={['top', 'left', 'right']}>
      
      {/* HEADER */}
      <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
        {/* Simple back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        
        <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>Select Trip</Text>
        
        {/* Empty view just to balance out the flex layout so the title stays perfectly centered */}
        <View style={{ width: 24 }} />
      </View>

      {/* Helpful little prompt for the user */}
      <Text style={[styles.subtitle, isDark && { color: '#CCCCCC' }]}>
        Which group/trip does this expense belong to?
      </Text>

      {/* CONDITIONAL RENDERING: What state are we in right now? */}
      {loading ? (
        // State 1: Still waiting for Firebase... show a spinner
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        // State 2: Firebase answered, but we have literally no trips. Sad.
        <Text style={styles.emptyText}>No created or shared trips were found.</Text>
      ) : (
        // State 3: We have trips! Render them using FlatList.
        // FlatList is way better for performance than mapping over a standard ScrollView!
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id} // React needs a unique key for every item
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            
            // The actual card for each trip
            <TouchableOpacity 
              style={[styles.groupCard, isDark && { backgroundColor: '#1E1E1E' }]}
              onPress={() => handleSelectGroup(item.id)} // Trigger the navigation!
            >
              <View style={styles.groupInfo}>
                {/* Cute little airplane icon to make it look like a travel app */}
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F1F3F5' }]}>
                  <Ionicons name="airplane" size={22} color={colors.primary} />
                </View>
                
                <View style={styles.textContainer}>
                  {/* Trip Name (City). Added a fallback string just in case the data is corrupted */}
                  <Text style={[styles.groupName, isDark && { color: '#FFF' }]} numberOfLines={1}>
                    {item.city || "Unknown Destination"}
                  </Text>
                  
                  {/* Trip Dates */}
                  <Text style={styles.groupDate}>
                    {item.dates || "Date not defined"}
                  </Text>
                </View>
              </View>
              
              {/* Arrow pointing right so the user intuitively knows they can tap this row */}
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// --- STYLES ---
// Tucked away at the bottom so it doesn't clutter my beautiful React logic up top
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.surface },
  backButton: { padding: spacing.xs },
  title: { ...typography.h2, color: colors.secondary, fontSize: 20 },
  subtitle: { ...typography.body, paddingHorizontal: spacing.lg, marginTop: spacing.md, color: colors.textMuted },
  
  // List spacing
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  
  // Group Card styling - giving it a nice soft shadow to make it pop!
  groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderRadius: border.radiusCard, marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  groupInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  
  // Icon and Text layout
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1, justifyContent: 'center' },
  groupName: { ...typography.body, fontWeight: 'bold', color: colors.secondary, fontSize: 16, marginBottom: 2 },
  groupDate: { ...typography.caption, color: colors.textMuted, fontSize: 13 },
  
  // Fallback text style for when they have no trips
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});