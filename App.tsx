// App.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import Firebase tools
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';

import LoginScreen from './src/screens/loginScreen';
import HomeScreen from './src/screens/homeScreen';
import ItineraryScreen from './src/screens/itineraryScreen';
import ProfileScreen from './src/screens/profileScreen';
import AccountDetailsScreen from './src/screens/accountDetailsScreen';
import { ThemeProvider } from './src/context/themeContext';
import CreateTripScreen from './src/screens/createTripScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This function listens for login/logout events the moment the app opens
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      setLoading(false); // Stop the loading spinner once we know the status
    });

    return unsubscribe;
  }, []);

  // Show a loading spinner while Firebase checks the user's phone for a saved login
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
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Itinerary" component={ItineraryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
    </ThemeProvider>
  );
}