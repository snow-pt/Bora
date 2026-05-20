// src/context/ThemeContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native'; // 👈 NEW: Detects phone's system theme
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // 👈 NEW: Listens for login/logout

export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: async (val: boolean) => {},
});

export const ThemeProvider = ({ children }: any) => {
  const systemTheme = useColorScheme(); 
  // Initial state matches the phone's system settings
  const [isDark, setIsDark] = useState(systemTheme === 'dark');

  useEffect(() => {
    // This listener fires automatically whenever someone logs in OR logs out
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // LOGGED IN: Fetch their specific preference from Firebase
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().darkMode !== undefined) {
          setIsDark(userDoc.data().darkMode);
        }
      } else {
        // LOGGED OUT: Fall back to the phone's system theme
        setIsDark(systemTheme === 'dark');
      }
    });

    return unsubscribe;
  }, [systemTheme]);

  // Update state and save to Firebase simultaneously
  const toggleTheme = async (value: boolean) => {
    setIsDark(value);
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { darkMode: value });
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};