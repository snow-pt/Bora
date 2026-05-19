import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/loginScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Set the status bar text color to match your theme (light or dark) */}
      <StatusBar style="auto" />
      
      {/* Rendering your login screen here */}
      <LoginScreen />
    </SafeAreaProvider>
  );
}