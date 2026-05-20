// src/context/ThemeContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export const ThemeContext = createContext({
  isDark: false,
  toggleTheme: (val: boolean) => {},
});

export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState(false);

  // Load the saved preference from Firebase when the app opens
  useEffect(() => {
    const fetchTheme = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().darkMode !== undefined) {
          setIsDark(userDoc.data().darkMode);
        }
      }
    };
    fetchTheme();
  }, []);

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