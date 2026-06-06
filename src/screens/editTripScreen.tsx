import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Theme and Context
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

// Firebase Imports
import { db, auth } from '../config/firebase';
import { doc, updateDoc, deleteDoc, collection, onSnapshot, getDocs, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
export default function EditTripScreen({ route, navigation }: any) {
  // Handles Dark/Light UI Mode
  const { isDark } = useContext(ThemeContext);
  // Extract the trip data passed from the previous screen via navigation params
  const { tripData } = route.params;

  // Core State
  const [activities, setActivities] = useState<any[]>([]);
  const [buddies, setBuddies] = useState<string[]>(tripData?.acceptedEmails || []);

  // State to hold the fetched profile data for avatars
  const [buddyProfiles, setBuddyProfiles] = useState<any[]>([]);

  // UI/Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verifyingUser, setVerifyingUser] = useState(false);
  
  // Date Picker State
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  // Tracks which date picker is currently open
  const [showPicker, setShowPicker] = useState<{ visible: boolean; mode: 'start' | 'end' }>({ visible: false, mode: 'start' });

  // Identify the current user to determine what UI elements they are allowed to interact with
  const currentUserEmail = auth.currentUser?.email || '';
  const currentUserUid = auth.currentUser?.uid || '';
  const isCreator = tripData.userId === currentUserUid;

  // Firebase Listener, keeps the activities list synced so they can be managed/deleted
  useEffect(() => {
    const activitiesRef = collection(db, 'trips', tripData.id, 'activities');
    const unsubscribe = onSnapshot(activitiesRef, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [tripData.id]);

  // Fetches user profiles so we can display their custom avatars
  useEffect(() => {
    const fetchProfiles = async () => {
      if (buddies.length === 0) {
        setBuddyProfiles([]);
        return;
      }
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', 'in', buddies));
        const snapshot = await getDocs(q);
        
        const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBuddyProfiles(profiles);
      } catch (error) {
        console.error("Error fetching buddy avatars:", error);
      }
    };
    fetchProfiles();
  }, [buddies]);

  // Formats the local state dates and pushes them to the master trip document.
  const handleUpdateDates = async () => {
    const formattedDates = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    try {
      await updateDoc(doc(db, 'trips', tripData.id), { dates: formattedDates });
      Alert.alert("Success", "Trip dates updated!");
    } catch (error) {
      console.error(error);
    }
  };

  // Looks up a user by email and adds them to the trip if they exist.
  const handleAddBuddy = async () => {
    const email = newEmail.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setVerifyingUser(true);
    try {
      // Search the 'users' collection to see if this person has an account
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);

      if (snap.empty) {
        Alert.alert("Not Found", "No user found with that email. Ask them to sign up!");
        setVerifyingUser(false);
        return;
      }

      // If user exists, grab their unique Firestore user ID
      const userId = snap.docs[0].id;

      // Push to PENDING arrays so they receive a real invite
      await updateDoc(doc(db, 'trips', tripData.id), {
        pendingUserIds: arrayUnion(userId),
        pendingEmails: arrayUnion(email)
      });

      setModalVisible(false);
      setNewEmail('');
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not add friend.");
    } finally {
      setVerifyingUser(false);
    }
  };

  // Removes a user from the trip. Dynamically handles both kicking a user out and the current user leaving the trip voluntarily.
  const handleRemoveBuddy = async (emailToRemove: string) => {
    // Determine the context of the action to display the correct warning
    const isSelf = emailToRemove === currentUserEmail;
    const title = isSelf ? "Leave Trip" : "Remove Buddy";
    const message = isSelf ? "Are you sure you want to leave this trip?" : `Are you sure you want to remove ${emailToRemove}?`;

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: isSelf ? "Leave" : "Remove", style: 'destructive', onPress: async () => {
          try {
            // Get the exact UID of the user being removed from the users collection
            const q = query(collection(db, 'users'), where('email', '==', emailToRemove));
            const snap = await getDocs(q);
            
            const tripRef = doc(db, 'trips', tripData.id);
            // Prepare to remove their email from all lists using arrayRemove
            const updates: any = {
              acceptedEmails: arrayRemove(emailToRemove),
              pendingEmails: arrayRemove(emailToRemove)
            };

            // If we successfully found their UID, remove that from the database too
            if (!snap.empty) {
              const uidToRemove = snap.docs[0].id;
              updates.acceptedUserIds = arrayRemove(uidToRemove);
              updates.pendingUserIds = arrayRemove(uidToRemove);
            }

            // Update Firestore securely
            await updateDoc(tripRef, updates);

            // Handle navigation/UI updates
            if (isSelf) {
              // If the user removed themselves, move them to the Home screen
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            } else {
              // If removing someone else, just remove their avatar from the UI list
              setBuddies(buddies.filter((b: string) => b !== emailToRemove));
            }

          } catch (error) {
            console.error("Remove buddy error:", error);
            Alert.alert("Error", "Could not update trip.");
          }
      }}
    ]);
  };

  // Deletes a specific activity from the itinerary.
  const handleDeleteActivity = (activityId: string) => {
    Alert.alert("Delete Activity", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'trips', tripData.id, 'activities', activityId));
      }}
    ]);
  };

  // Deletes the trip. Required manually deleting all nested sub-collections before deleting the parent document.
  const handleDeleteTrip = () => {
    Alert.alert("DELETE TRIP", "This will permanently erase the trip and all activities. Are you sure?", [
      { text: "Cancel" },
      { text: "DELETE FOREVER", style: 'destructive', onPress: async () => {
          try {
            // Fetch and loop through every single activity, deleting them one by one
            const activitiesRef = collection(db, 'trips', tripData.id, 'activities');
            const snapshot = await getDocs(activitiesRef);
            snapshot.forEach(async (docSnap) => await deleteDoc(docSnap.ref));
            
            // Once the sub-collection is empty, delete the main trip document
            await deleteDoc(doc(db, 'trips', tripData.id));
            
            // Destroy the navigation stack so the user can't "swipe back" to a deleted trip
            navigation.reset({index: 0, routes: [{ name: 'Home' }],});
          } catch (error) {
            console.error(error);
          }
      }}
    ]);
  };

  // Handles native date picker selection.
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ ...showPicker, visible: false });
    if (event.type === 'dismissed' || !selectedDate) return;
    // Ensure the end date is never logically before the start date
    if (showPicker.mode === 'start') {
      setStartDate(selectedDate);
      if (selectedDate > endDate) setEndDate(selectedDate);
    } else {
      setEndDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#121212' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Manage Trip</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Edit Dates Section */}
        <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Update Dates</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.dateBtn, isDark && styles.darkBtn]} onPress={() => setShowPicker({ visible: true, mode: 'start' })}>
            <Text style={[styles.dateText, isDark && { color: '#FFF' }]}>Start: {startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateBtn, isDark && styles.darkBtn]} onPress={() => setShowPicker({ visible: true, mode: 'end' })}>
            <Text style={[styles.dateText, isDark && { color: '#FFF' }]}>End: {endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveDateBtn} onPress={handleUpdateDates}>
          <Text style={styles.saveDateText}>Save New Dates</Text>
        </TouchableOpacity>

        {/* Floating Calendar Modal */}
        <Modal visible={showPicker.visible} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: isDark ? '#1E1E1E' : '#FFF', width: '90%', borderRadius: 20, padding: 20 }}>
              <DateTimePicker 
                value={showPicker.mode === 'start' ? startDate : endDate} 
                mode="date" 
                display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                onChange={handleDateChange} 
              />
              <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 }} onPress={() => setShowPicker({ ...showPicker, visible: false })}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Buddies Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }, { marginBottom: 0 }]}>Manage Buddies</Text>
          {/* Only the trip creator can add new friends */}
          {isCreator && (
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', paddingVertical: spacing.sm }}>
          {buddies.map((email, index) => {
            // Creators can remove anyone except themselves and guests can only remove themselves.
            const canRemove = (isCreator && email !== currentUserEmail) || (!isCreator && email === currentUserEmail);

            // Fetch Custom Avatar
            const buddyProfile = buddyProfiles.find((p) => p.email === email);
            const avatarUri = buddyProfile?.avatarUrl;
            return (
              <View key={index} style={styles.buddyCard}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                {canRemove && (
                  <TouchableOpacity style={styles.removeBuddyBtn} onPress={() => handleRemoveBuddy(email)}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Manage Activities Section */}
        <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }, { marginTop: spacing.lg }]}>Manage Activities</Text>
        {activities.map(act => (
          <View key={act.id} style={[styles.activityRow, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actTitle, isDark && { color: '#FFFFFF' }]}>{act.title}</Text>
              <Text style={styles.actTime}>{act.time} • {act.location}</Text>
            </View>
            <View style={styles.actActions}>
              <TouchableOpacity onPress={() => navigation.navigate('AddActivity', { tripId: tripData.id, activityToEdit: act })} style={styles.actionIcon}>
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteActivity(act.id)} style={styles.actionIcon}>
                <Ionicons name="trash" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Delete/Leave Trip Section, Creators delete the trip entirely. Guests just Leave it. */}
        {isCreator ? (
          <TouchableOpacity style={styles.deleteTripBtn} onPress={handleDeleteTrip}>
            <Ionicons name="warning-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteTripText}>Delete Entire Trip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.deleteTripBtn} onPress={() => handleRemoveBuddy(currentUserEmail)}>
            <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteTripText}>Leave Trip</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* Add Buddy Popup Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl }}>
          <View style={[ { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: border.radiusCard }, isDark && { backgroundColor: '#1E1E1E' } ]}>
            <Text style={[{ ...typography.h2, color: colors.secondary, marginBottom: spacing.xs }, isDark && { color: '#FFFFFF' }]}>Invite Friend</Text>
            <Text style={[{ ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg }, isDark && { color: '#CCCCCC' }]}>Enter their email address to search for them.</Text>
            
            <TextInput 
              style={[{ borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusCard, padding: spacing.md, ...typography.body, marginBottom: spacing.xl }, isDark && { color: '#FFFFFF', backgroundColor: '#2C2C2C', borderColor: '#444' }]} 
              placeholder="friend@example.com" 
              placeholderTextColor={colors.textMuted}
              value={newEmail} 
              onChangeText={setNewEmail} 
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
              <TouchableOpacity style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md }} onPress={() => setModalVisible(false)}>
                <Text style={{ ...typography.body, color: colors.textMuted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              {/* Add Button, Disabled while querying Firebase */}
              <TouchableOpacity 
                style={[{ backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: border.radiusButton }, verifyingUser && { opacity: 0.7 }]} 
                onPress={handleAddBuddy}
                disabled={verifyingUser}
              >
                {verifyingUser ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={{ ...typography.body, color: colors.surface, fontWeight: 'bold' }}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  backButton: { padding: spacing.xs },
  headerTitle: { ...typography.h2, color: colors.secondary, fontSize: 20 },
  content: { padding: spacing.lg },
  sectionTitle: { ...typography.body, fontWeight: 'bold', color: colors.secondary, marginBottom: spacing.sm },
  
  // Update Dates Section
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  dateBtn: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: border.radiusCard, borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center' },
  darkBtn: { backgroundColor: '#1E1E1E', borderColor: '#333' },
  dateText: { ...typography.caption, fontWeight: 'bold', color: colors.secondary },
  saveDateBtn: { backgroundColor: colors.primary, padding: spacing.sm, borderRadius: border.radiusButton, alignItems: 'center' },
  saveDateText: { color: colors.surface, fontWeight: 'bold' },

  // Buddy Avatars
  buddyCard: { position: 'relative', marginRight: spacing.md },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  removeBuddyBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 12 },

  // Activity Rows
  activityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: border.radiusCard, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E9ECEF' },
  actTitle: { ...typography.body, fontWeight: 'bold', color: colors.secondary },
  actTime: { ...typography.caption, color: colors.textMuted },
  actActions: { flexDirection: 'row', gap: spacing.sm },
  actionIcon: { padding: 4 },

  // Delete Trip Footer
  deleteTripBtn: { flexDirection: 'row', backgroundColor: colors.danger, padding: spacing.lg, borderRadius: border.radiusButton, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl * 2, marginBottom: spacing.xl, gap: 8 },
  deleteTripText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});