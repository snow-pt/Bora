/**
 * @file App.tsx
 * @description Root application component. Establishes global providers (Theme, Navigation),
 * configures foreground notification behaviors, and manages the primary authentication routing 
 * gate (Unauthenticated vs. Authenticated flows) using Firebase Auth.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';

import LoginScreen from './src/screens/loginScreen';
import HomeScreen from './src/screens/homeScreen';
import ItineraryScreen from './src/screens/itineraryScreen';
import ProfileScreen from './src/screens/profileScreen';
import AccountDetailsScreen from './src/screens/accountDetailsScreen';
import { ThemeProvider } from './src/context/themeContext';
import CreateTripScreen from './src/screens/createTripScreen';
import EditTripScreen from './src/screens/editTripScreen';
import AddActivityScreen from './src/screens/addActivityScreen';
import ExpensesScreen from './src/screens/expensesScreen';
import SelectGroupScreen from './src/screens/selectGroupScreen';

import * as Notifications from 'expo-notifications';

// Configure Expo Notifications foreground presentation parameters.
// Ensures that notifications received while the application is active are displayed
// as standard OS banner alerts rather than being silently absorbed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,     
    shouldShowList: true,       
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
  // --- Global Application State ---
  const [user, setUser] = useState(null);
  // Blocks the UI rendering until Firebase confirms the initial session state
  const [loading, setLoading] = useState(true);

  /**
   * Mounts a real-time listener to the Firebase Authentication service.
   * Automatically resolves the user's session token from secure device storage upon app launch
   * and triggers re-renders if the session expires or the user explicitly logs out.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      setLoading(false); 
    });

    // Cleanup the subscription on component unmount to prevent memory leaks
    return unsubscribe;
  }, []);

  // Suspend the main application render until the authentication state is definitively resolved
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          {/* Authentication Routing Gate:
            Dynamically injects the authorized navigation stack if a valid user session exists,
            otherwise restricts the user entirely to the Login screen.
          */}
          {user ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Itinerary" component={ItineraryScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
              <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
              
              {/* Modal Presentations for overlay forms */}
              <Stack.Screen 
                name="EditTrip" 
                component={EditTripScreen} 
                options={{ presentation: 'modal' }} 
              />
              <Stack.Screen name="Expenses" component={ExpensesScreen} />
              <Stack.Screen name="SelectGroup" component={SelectGroupScreen} />
              <Stack.Screen 
                name="AddActivity" 
                component={AddActivityScreen} 
                options={{ presentation: 'modal' }} 
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
          
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}