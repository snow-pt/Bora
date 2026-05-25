// src/screens/createTripScreen.tsx
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, border, typography } from '../theme/theme';
import { ThemeContext } from '../context/themeContext';

// Firebase imports
import { db, auth } from '../config/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export default function CreateTripScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);

  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<{ visible: boolean; mode: 'start' | 'end' }>({ visible: false, mode: 'start' });
  
  const [friends, setFriends] = useState<{uid: string, email: string}[]>([]);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifyingUser, setVerifyingUser] = useState(false);

  // --- CITY SEARCH ---
  const handleCitySearch = async (text: string) => {
    setCity(text); 
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5&language=en&format=json`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (error) {
        console.error("Geocoding Error:", error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]); 
    }
  };

  const handleSelectCity = (item: any) => {
    const fullName = `${item.name}${item.admin1 ? `, ${item.admin1}` : ''}, ${item.country}`;
    setCity(fullName);
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    setSuggestions([]); 
  };

  // --- DATE HELPERS ---
  const calculateDaysLeft = (start: Date) => {
    const today = new Date();
    const differenceInTime = start.getTime() - today.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    return differenceInDays > 0 ? differenceInDays : 0;
  };

  const getSafeMinDate = (date: Date) => {
    const safeDate = new Date(date);
    safeDate.setHours(0, 0, 0, 0); 
    return safeDate;
  };

  // 🔥 FIXED: Android closes instantly, iOS waits for "Done"
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker({ ...showPicker, visible: false });
    }
    
    if (selectedDate) {
      if (showPicker.mode === 'start') {
        setStartDate(selectedDate);
        // Prevent end date from being before the new start date
        if (endDate < selectedDate) setEndDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  // --- DATABASE FRIEND SEARCH ---
  const handleAddFriend = async () => {
    const email = newFriendEmail.trim().toLowerCase();
    
    if (!email || !email.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    
    if (friends.some(f => f.email === email)) {
      Alert.alert("Duplicate", "Friend is already added!");
      return;
    }

    setVerifyingUser(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("User Not Found", "No account is registered with this email. Ask them to sign up first!");
        return;
      }

      const userDoc = snapshot.docs[0];
      const newFriend = {
        uid: userDoc.id, 
        email: email
      };

      setFriends([...friends, newFriend]);
      setNewFriendEmail('');
      setModalVisible(false);
      
    } catch (error) {
      console.error("Error finding user:", error);
      Alert.alert("Error", "Could not verify email.");
    } finally {
      setVerifyingUser(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!city.trim() || latitude === 0) {
      Alert.alert("Missing Info", "Please search for and select a valid destination city from the list.");
      return;
    }

    setSaving(true);

    try {
      const daysLeftCalc = calculateDaysLeft(startDate);
      const formattedDates = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      const dynamicImageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(city.split(',')[0].trim())},travel/all`;

      const newTrip = {
        city: city.trim(),
        dates: formattedDates,
        daysLeft: daysLeftCalc,
        latitude: latitude,   
        longitude: longitude, 
        image: dynamicImageUrl, 
        pendingUserIds: friends.map(f => f.uid),       
        pendingEmails: friends.map(f => f.email),      
        acceptedUserIds: [],                           
        acceptedEmails: [],                            
        userId: auth.currentUser?.uid || 'anonymous'
      };

      await addDoc(collection(db, 'trips'), newTrip);
      
      Alert.alert("Success!", "Your new trip has been created.");
      navigation.navigate('Home'); 
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save the trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}>Plan a New Trip</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* City Autocomplete */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Destination City</Text>
          <View style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }, { marginBottom: 0 }]}>
            <Ionicons name="location-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isDark && { color: '#FFFFFF' }]}
              placeholder="e.g. Lisbon, Paris, Rome"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={handleCitySearch}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {suggestions.length > 0 && (
            <View style={[styles.dropdown, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
              {suggestions.map((item, index) => (
                <TouchableOpacity key={index} style={[styles.dropdownItem, isDark && { borderBottomColor: '#333' }]} onPress={() => handleSelectCity(item)}>
                  <Text style={[styles.dropdownText, isDark && { color: '#FFFFFF' }]}>
                    {item.name}{item.admin1 ? `, ${item.admin1}` : ''}, {item.country}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>Start Date</Text>
              <TouchableOpacity style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]} onPress={() => setShowPicker({ visible: true, mode: 'start' })}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.input, { paddingVertical: spacing.md }, isDark && { color: '#FFFFFF' }]}>{startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.label, isDark && { color: '#CCCCCC' }]}>End Date</Text>
              <TouchableOpacity style={[styles.inputContainer, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]} onPress={() => setShowPicker({ visible: true, mode: 'end' })}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.input, { paddingVertical: spacing.md }, isDark && { color: '#FFFFFF' }]}>{endDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 🔥 ANDROID DATE PICKER */}
          {Platform.OS === 'android' && showPicker.visible && (
            <DateTimePicker 
              value={showPicker.mode === 'start' ? startDate : endDate} 
              mode="date" 
              display="default" 
              minimumDate={showPicker.mode === 'end' ? getSafeMinDate(startDate) : getSafeMinDate(new Date())} 
              onChange={handleDateChange} 
            />
          )}

          <Text style={[styles.label, { marginTop: spacing.md }, isDark && { color: '#CCCCCC' }]}>Travel Buddies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsContainer}>
            {friends.map((friend, index) => (
              <View key={index} style={styles.friendAvatar}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${friend.email}&background=random&color=fff` }} style={styles.avatarImage} />
                <Text style={[styles.friendName, isDark && { color: '#CCCCCC' }]} numberOfLines={1}>{friend.email.split('@')[0]}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addFriendButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={28} color={colors.primary} />
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={handleCreateTrip} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveButtonText}>Create Trip</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FRIEND INVITE MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: '#1E1E1E' }]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Invite a Friend</Text>
            <Text style={[styles.modalSubtitle, isDark && { color: '#CCCCCC' }]}>Enter their email address to search for them.</Text>
            
            <TextInput
              style={[styles.modalInput, isDark && { color: '#FFFFFF', backgroundColor: '#2C2C2C', borderColor: '#444' }]}
              placeholder="friend@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={newFriendEmail}
              onChangeText={setNewFriendEmail}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalAdd, verifyingUser && { opacity: 0.7 }]} onPress={handleAddFriend} disabled={verifyingUser}>
                {verifyingUser ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.modalAddText}>Search & Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔥 IOS DATE PICKER MODAL */}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker.visible} transparent={true} animationType="slide">
          <View style={styles.datePickerModalOverlay}>
            <View style={[styles.datePickerModalContent, isDark && { backgroundColor: '#1E1E1E' }]}>
              <View style={[styles.datePickerHeader, isDark && { borderBottomColor: '#333' }]}>
                <TouchableOpacity onPress={() => setShowPicker({ ...showPicker, visible: false })}>
                  <Text style={styles.datePickerDoneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showPicker.mode === 'start' ? startDate : endDate}
                mode="date"
                display="inline" 
                themeVariant={isDark ? "dark" : "light"} 
                minimumDate={showPicker.mode === 'end' ? getSafeMinDate(startDate) : getSafeMinDate(new Date())}
                onChange={handleDateChange}
                style={styles.datePicker} // 👈 ADD THIS LINE
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  backButton: { marginRight: spacing.md },
  headerTitle: { ...typography.h1, color: colors.secondary },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.secondary, marginBottom: spacing.xs, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusCard, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.secondary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dropdown: { backgroundColor: colors.surface, borderRadius: border.radiusCard, borderWidth: 1, borderColor: '#E9ECEF', marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  dropdownItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownText: { ...typography.body, color: colors.secondary },
  friendsContainer: { flexDirection: 'row', marginBottom: spacing.xl, paddingVertical: spacing.sm },
  friendAvatar: { alignItems: 'center', marginRight: spacing.md, width: 60 },
  avatarImage: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
  friendName: { ...typography.caption, color: colors.secondary, fontSize: 10, textAlign: 'center' },
  addFriendButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.primary}10` },
  saveButton: { backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: border.radiusButton, alignItems: 'center', marginTop: spacing.xl },
  saveButtonText: { ...typography.body, color: colors.surface, fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, padding: spacing.xl, borderRadius: border.radiusCard, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalTitle: { ...typography.h2, color: colors.secondary, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  modalInput: { borderWidth: 1, borderColor: '#E9ECEF', borderRadius: border.radiusCard, padding: spacing.md, ...typography.body, marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  modalCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalCancelText: { ...typography.body, color: colors.textMuted, fontWeight: 'bold' },
  modalAdd: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: border.radiusButton },
  modalAddText: { ...typography.body, color: colors.surface, fontWeight: 'bold' },
  
  /* 🔥 NEW STYLES FOR IOS DATE PICKER MODAL */
  datePickerModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  datePickerModalContent: { backgroundColor: colors.surface, paddingBottom: spacing.xl * 2 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  datePickerDoneButton: { ...typography.body, color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  datePicker: {width: '100%', alignSelf: 'center' }
});