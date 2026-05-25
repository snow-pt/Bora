import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/themeContext';
import { colors, spacing, border, typography } from '../theme/theme'; 
import { Ionicons } from '@expo/vector-icons';

import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function SelectGroupScreen({ navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const activeQuery = query(
      collection(db, 'trips'),
      or(
        where('userId', '==', currentUser.uid),
        where('acceptedUserIds', 'array-contains', currentUser.uid)
      )
    );
    
    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(tripsData);
      setLoading(false);
    }, (error) => {
      console.log("Error loading groups:", error);
      setLoading(false);
    });

    return () => unsubscribeActive();
  }, [currentUser]);

  const handleSelectGroup = (groupId: string) => {
    navigation.navigate('Expenses', { groupId }); 
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>Select Trip</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, isDark && { color: '#CCCCCC' }]}>
        Which group/trip does this expense belong to?
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <Text style={styles.emptyText}>No created or shared trips were found.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.groupCard, isDark && { backgroundColor: '#1E1E1E' }]}
              onPress={() => handleSelectGroup(item.id)}
            >
              <View style={styles.groupInfo}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F1F3F5' }]}>
                  <Ionicons name="airplane" size={22} color={colors.primary} />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={[styles.groupName, isDark && { color: '#FFF' }]} numberOfLines={1}>
                    {item.city || "Unknown Destination"}
                  </Text>
                  
                  <Text style={styles.groupDate}>
                    {item.dates || "Date not defined"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.surface },
  backButton: { padding: spacing.xs },
  title: { ...typography.h2, color: colors.secondary, fontSize: 20 },
  subtitle: { ...typography.body, paddingHorizontal: spacing.lg, marginTop: spacing.md, color: colors.textMuted },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderRadius: border.radiusCard, marginBottom: spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  groupInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1, justifyContent: 'center' },
  groupName: { ...typography.body, fontWeight: 'bold', color: colors.secondary, fontSize: 16, marginBottom: 2 },
  groupDate: { ...typography.caption, color: colors.textMuted, fontSize: 13 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});