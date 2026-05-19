import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: "AIzaSyAbAZcnLJRJUpol2dWVB_oKi8ffIbPM6vk",
  authDomain: "bora-15ed7.firebaseapp.com",
  projectId: "bora-15ed7",
  storageBucket: "bora-15ed7.firebasestorage.app",
  messagingSenderId: "930013789153",
  appId: "1:930013789153:web:17676cd81f50e9b26170a0"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);