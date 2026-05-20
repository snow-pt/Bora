// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, border, typography } from '../theme/theme';
import * as Notifications from 'expo-notifications';
import { ThemeContext } from '../context/themeContext';

// Firebase imports
import { auth, db } from '../config/firebase';
import { signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// PRE-DEFINED AVATAR LIBRARY
const AVATAR_OPTIONS = [
    'https://api.dicebear.com/7.x/avataaars/png?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Jocelyn&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Jack&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Ryan&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Nala&backgroundColor=b6e3f4',
];

// Updated MenuRow to accept an 'onPress' action
const MenuRow = ({ icon, title, value, hasSwitch, switchValue, onToggle, isDestructive, onPress }: any) => (
    <TouchableOpacity style={styles.menuRow} disabled={hasSwitch} onPress={onPress}>
        <View style={styles.menuRowLeft}>
            <Ionicons name={icon} size={20} color={isDestructive ? colors.danger : colors.secondary} />
            <Text style={[styles.menuRowTitle, isDestructive && { color: colors.danger }]}>{title}</Text>
        </View>

        {hasSwitch ? (
            <Switch
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor={'#FFFFFF'}
                onValueChange={onToggle}
                value={switchValue}
            />
        ) : (
            <View style={styles.menuRowRight}>
                {value && <Text style={styles.menuRowValue}>{value}</Text>}
                {!isDestructive && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
            </View>
        )}
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }: any) {
    const { isDark, toggleTheme } = useContext(ThemeContext);
    
    const [userName, setUserName] = useState('Loading...');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarModalVisible, setAvatarModalVisible] = useState(false);

    const [pushEnabled, setPushEnabled] = useState(true);

    const [currency, setCurrency] = useState('EUR');
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

    const currentUser = auth.currentUser;

    // 1. FETCH USER DATA ON LOAD
    useEffect(() => {
        const fetchUserData = async () => {
            if (currentUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserName(data.fullName || 'Traveler');
                        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
                        if (data.currency) setCurrency(data.currency);
                        if (data.pushNotifications !== undefined) setPushEnabled(data.pushNotifications);
                        // NOTE: isDark is now securely handled by your ThemeContext!
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    // 2. AVATAR SELECTION HANDLER
    const handleSelectAvatar = async (selectedUrl: string) => {
        setAvatarUrl(selectedUrl);
        setAvatarModalVisible(false);
        if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.uid), { avatarUrl: selectedUrl });
        }
    };

    // 3. CURRENCY HANDLER
    const handleSelectCurrency = async (selectedCurrency: string) => {
        setCurrency(selectedCurrency);
        setCurrencyModalVisible(false);
        if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.uid), { currency: selectedCurrency });
        }
    };

    // 4. PUSH NOTIFICATIONS HANDLER
    const handleTogglePush = async (value: boolean) => {
        if (value) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Please enable notifications in your phone's settings.");
                return; 
            }
        }
        setPushEnabled(value);
        if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.uid), { pushNotifications: value });
        }
    };

    // 5. CHANGE PASSWORD
    const handlePasswordReset = async () => {
        if (currentUser?.email) {
            try {
                await sendPasswordResetEmail(auth, currentUser.email);
                Alert.alert("Email Sent!", `A password reset link was sent to ${currentUser.email}`);
            } catch (error: any) {
                Alert.alert("Error", error.message);
            }
        }
    };

    // 6. DELETE ACCOUNT
    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you absolutely sure? This will permanently delete your account and all associated trip data.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (currentUser) {
                                await deleteDoc(doc(db, 'users', currentUser.uid));
                                await deleteUser(currentUser);
                                await signOut(auth);
                            }
                        } catch (error: any) {
                            Alert.alert("Security Requirement", "Please log out and log back in to verify your identity before deleting your account.");
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            "Logout account",
            "Are you absolutely sure? This will permanently sign you off the application.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(auth);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to log out.');
                        }
                    }
                }
            ]
        )
    };

    return (
        // 🔥 MAGIC FIX: The background color now dynamically listens to isDark!
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        {/* Make the arrow readable in dark mode */}
                        <Ionicons name="arrow-back" size={28} color={isDark ? '#FFFFFF' : colors.secondary} />
                    </TouchableOpacity>

                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={() => setAvatarModalVisible(true)} style={styles.avatarCircle}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.editAvatarBadge} onPress={() => setAvatarModalVisible(true)}>
                            <Ionicons name="pencil" size={14} color={colors.surface} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.userName, isDark && { color: '#FFFFFF' }]}>{userName}</Text>
                    <Text style={styles.userSubtitle}>University of Maribor</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={[styles.cardGroup, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
                        <MenuRow icon="person-outline" title="Account Details" onPress={() => navigation.navigate('AccountDetails')} />
                        <View style={[styles.divider, isDark && { backgroundColor: '#333' }]} />
                        <MenuRow icon="lock-closed-outline" title="Change Password" onPress={handlePasswordReset} />
                        <View style={[styles.divider, isDark && { backgroundColor: '#333' }]} />
                        <MenuRow icon="wallet-outline" title="Default Currency" value={currency} onPress={() => setCurrencyModalVisible(true)} />
                    </View>

                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={[styles.cardGroup, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }]}>
                        <MenuRow icon="notifications-outline" title="Push Notifications" hasSwitch switchValue={pushEnabled} onToggle={handleTogglePush} />
                        <View style={[styles.divider, isDark && { backgroundColor: '#333' }]} />
                        <MenuRow icon="moon-outline" title="Dark Mode" hasSwitch switchValue={isDark} onToggle={toggleTheme} />
                    </View>

                    <View style={[styles.cardGroup, isDark && { backgroundColor: '#1E1E1E', borderColor: '#333' }, { marginTop: spacing.lg }]}>
                        <MenuRow icon="trash-outline" title="Delete Account" isDestructive onPress={handleDeleteAccount} />
                    </View>

                    <TouchableOpacity style={[styles.logoutButton, isDark && { borderColor: '#FFFFFF' }]} onPress={handleLogout}>
                        <Text style={[styles.logoutButtonText, isDark && { color: '#FFFFFF' }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* AVATAR SELECTOR MODAL */}
            <Modal visible={avatarModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContentCenter, isDark && { backgroundColor: '#1E1E1E' }]}>
                        <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Choose an Avatar</Text>

                        <View style={styles.avatarGrid}>
                            {AVATAR_OPTIONS.map((url, index) => (
                                <TouchableOpacity key={index} onPress={() => handleSelectAvatar(url)} style={[styles.avatarOption, avatarUrl === url && styles.avatarSelected]}>
                                    <Image source={{ uri: url }} style={styles.avatarOptionImage} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={[styles.modalCloseButton, isDark && { backgroundColor: '#333' }]} onPress={() => setAvatarModalVisible(false)}>
                            <Text style={[styles.modalCloseText, isDark && { color: '#FFFFFF' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* CURRENCY SELECTOR MODAL */}
            <Modal visible={currencyModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlayBottom}>
                    <View style={[styles.modalContentBottom, isDark && { backgroundColor: '#1E1E1E' }]}>
                        <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>Select Currency</Text>

                        {['EUR', 'USD', 'GBP', 'CZK', 'HUF'].map((item) => (
                            <TouchableOpacity key={item} style={[styles.modalOption, isDark && { borderBottomColor: '#333' }]} onPress={() => handleSelectCurrency(item)}>
                                <Text style={[styles.modalOptionText, isDark && { color: '#CCCCCC' }, currency === item && { color: colors.primary, fontWeight: 'bold' }]}>
                                    {item}
                                </Text>
                                {currency === item && <Ionicons name="checkmark" size={24} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={[styles.modalCloseButton, isDark && { backgroundColor: '#333' }]} onPress={() => setCurrencyModalVisible(false)}>
                            <Text style={[styles.modalCloseText, isDark && { color: '#FFFFFF' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    backButton: {
        position: 'absolute',
        top: spacing.xs,
        left: spacing.lg,
        padding: spacing.xs,
        zIndex: 10,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        overflow: 'hidden', 
    },
    avatarImage: {
        width: '100%',
        height: '100%'
    },
    avatarText: {
        ...typography.h1,
        color: colors.surface,
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.secondary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    userName: {
        ...typography.h2,
        color: colors.secondary,
    },
    userSubtitle: {
        ...typography.body,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    sectionTitle: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    cardGroup: {
        backgroundColor: colors.surface,
        borderRadius: border.radiusCard,
        overflow: 'hidden',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    menuRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: 'transparent', // Let parent cardGroup handle background
    },
    menuRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    menuRowTitle: {
        ...typography.body,
        color: colors.textMuted, // Adjusted so it doesn't clash as hard in dark mode
    },
    menuRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    menuRowValue: {
        ...typography.body,
        color: colors.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: '#E9ECEF',
        marginLeft: 44,
    },
    logoutButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: border.radiusButton,
        borderWidth: 1,
        borderColor: colors.secondary,
        alignItems: 'center',
    },
    logoutButtonText: {
        ...typography.body,
        fontWeight: 'bold',
        color: colors.secondary,
    },
    modalOverlayBottom: { 
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    modalContentBottom: { 
        backgroundColor: colors.surface, borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, padding: spacing.lg, 
        paddingBottom: spacing.xl * 2 
    },
    modalOverlay: { 
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        padding: spacing.xl 
    },
    modalContentCenter: { 
        backgroundColor: colors.surface, 
        borderRadius: 24, 
        padding: spacing.lg 
    },
    modalTitle: { 
        ...typography.h2, 
        color: colors.secondary, 
        marginBottom: spacing.lg, 
        textAlign: 'center' 
    },
    modalOption: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingVertical: spacing.md, 
        borderBottomWidth: 1, 
        borderBottomColor: '#E9ECEF' 
    },
    modalOptionText: { 
        ...typography.body, 
        color: colors.secondary, 
        fontSize: 18 
    },
    modalCloseButton: { 
        marginTop: spacing.xl, 
        paddingVertical: spacing.md,
        backgroundColor: '#F1F3F5', 
        borderRadius: border.radiusButton, 
        alignItems: 'center' 
    },
    modalCloseText: { 
        ...typography.body, 
        color: colors.secondary, 
        fontWeight: 'bold' 
    },
    avatarGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: spacing.md 
    },
    avatarOption: { 
        width: 70, 
        height: 70, 
        borderRadius: 35, 
        overflow: 'hidden', 
        borderWidth: 3, 
        borderColor: 'transparent' 
    },
    avatarSelected: { 
        borderColor: colors.primary 
    },
    avatarOptionImage: { 
        width: '100%', 
        height: '100%' 
    }
});