import React, { useContext, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/themeContext';
import { colors, spacing, border, typography } from '../theme/theme'; 
import { Ionicons } from '@expo/vector-icons';

import { collection, onSnapshot, query, addDoc, doc, getDoc, updateDoc, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function ExpensesScreen({ route, navigation }: any) {
  const { isDark } = useContext(ThemeContext);
  const currentUser = auth.currentUser;
  const { groupId } = route.params || {}; 

  const [expenses, setExpenses] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<string>(''); 

  useEffect(() => {
    if (!groupId) return;

    const tripRef = doc(db, 'trips', groupId);
    const unsubscribeTrip = onSnapshot(tripRef, async (tripSnap) => {
      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const uids = [tripData.userId, ...(tripData.acceptedUserIds || [])];
        
        const otherUIDs = uids.filter(uid => uid !== currentUser?.uid);
        
        const membersFetched = await Promise.all(
          otherUIDs.map(async (uid) => {
            try {
              const userSnap = await getDoc(doc(db, 'users', uid));
              if (userSnap.exists()) {
                const userData = userSnap.data();
                return {
                  id: uid,
                  name: userData.fullName || `User (${uid.substring(0, 4)})`
                };
              }
            } catch (err) {
              console.log(`Error fetching user ${uid}:`, err);
            }
            return { id: uid, name: `User (${uid.substring(0, 4)})` };
          })
        );
          
        setGroupMembers(membersFetched);
      }
    });

    return () => unsubscribeTrip();
  }, [groupId, currentUser]);

  useEffect(() => {
    if (!currentUser?.uid || !groupId) {
      setLoading(false);
      return;
    }

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expensesData);
      setLoading(false);
    }, (error) => {
      console.log("Error loading expenses:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, groupId]);

  const totalToReceive = expenses
    .filter(e => e.creatorId === currentUser?.uid && e.paymentStatus !== 'Confirmed')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalToPay = expenses
    .filter(e => e.debtorId === currentUser?.uid && e.paymentStatus !== 'Confirmed')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const isFormValid = title.trim().length > 0 && amount.trim().length > 0 && selectedDebtor !== '';

  const handleAddExpense = async () => {
    if (!isFormValid) {
      Alert.alert("Incomplete Fields", "Please provide a title, a value, and select who owes you the money.");
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid Value", "Please enter a valid price greater than 0.");
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        title: title.trim(),
        amount: parsedAmount,
        creatorId: currentUser?.uid,       
        debtorId: selectedDebtor,         
        paymentStatus: 'Pending',        
        groupId: groupId,
        createdAt: new Date().toISOString()
      });

      setTitle('');
      setAmount('');
      setSelectedDebtor('');
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving expense: ", error);
    }
  };

  const handleExpensePress = async (expense: any) => {
    if (expense.debtorId === currentUser?.uid && expense.paymentStatus === 'Pending') {
      Alert.alert(
        "Mark as Paid?",
        `Do you want to notify that you have transferred ${(expense.amount || 0).toFixed(2)}€?`,
        [
          { text: "No", style: "cancel" },
          { 
            text: "Yes, I paid!", 
            onPress: async () => {
              await updateDoc(doc(db, 'expenses', expense.id), { paymentStatus: 'AwaitingConfirmation' });
            }
          }
        ]
      );
    } 
    else if (expense.creatorId === currentUser?.uid && expense.paymentStatus === 'AwaitingConfirmation') {
      Alert.alert(
        "Confirm Receipt! 💰",
        `Do you confirm that you received ${(expense.amount || 0).toFixed(2)}€ for "${expense.title}"?`,
        [
          { 
            text: "Not received yet", 
            style: "destructive",
            onPress: async () => {
              await updateDoc(doc(db, 'expenses', expense.id), { paymentStatus: 'Pending' });
            }
          },
          { 
            text: "Yes, Confirm!", 
            style: "default",
            onPress: async () => {
              await updateDoc(doc(db, 'expenses', expense.id), { paymentStatus: 'Confirmed' });
            }
          }
        ]
      );
    }
  };

  const dismissKeyboard = useCallback(() => { Keyboard.dismiss(); }, []);

  const renderExpenseItem = ({ item }: { item: any }) => {
    const isMyExpense = item.creatorId === currentUser?.uid;
    const itemAmount = Number(item.amount) || 0;
    
    let statusText = "Pending";
    let statusColor = colors.danger;
    
    if (item.paymentStatus === 'AwaitingConfirmation') {
      statusText = isMyExpense ? "⚠️ Click to confirm!" : "Awaiting validation...";
      statusColor = "#FF9800"; 
    } else if (item.paymentStatus === 'Confirmed') {
      statusText = "Settled ✅";
      statusColor = colors.success;
    }

    const debtorMember = groupMembers.find(m => m.id === item.debtorId);
    const creatorMember = groupMembers.find(m => m.id === item.creatorId);

    const debtorDisplay = item.debtorId === currentUser?.uid ? 'Me' : (debtorMember ? debtorMember.name : 'Someone');
    const creatorDisplay = item.creatorId === currentUser?.uid ? 'Me' : (creatorMember ? creatorMember.name : 'Someone');

    return (
      <TouchableOpacity 
        style={[styles.expenseCard, isDark && { backgroundColor: '#1E1E1E' }, item.paymentStatus === 'Confirmed' && { opacity: 0.5 }]}
        onPress={() => handleExpensePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseTitle, isDark && { color: '#FFFFFF' }, item.paymentStatus === 'Confirmed' && { textDecorationLine: 'line-through' }]}>
            {item.title}
          </Text>
          <Text style={[styles.statusText, { color: statusColor, fontWeight: 'bold' }]}>
            {statusText}
          </Text>
          <Text style={styles.expensePayer}>
            {isMyExpense ? `You should receive from: ${debtorDisplay}` : `You owe: ${creatorDisplay}`}
          </Text>
        </View>

        <Text style={[styles.expenseAmount, { color: isMyExpense ? colors.success : colors.danger }]}>
          {isMyExpense ? '+' : '-'} {itemAmount.toFixed(2)}€
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, isDark && { backgroundColor: '#1E1E1E' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>Expense Control</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={[styles.summaryContainer, isDark && { backgroundColor: '#1E1E1E' }]}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>To Receive</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>+{totalToReceive.toFixed(2)}€</Text>
        </View>
        <View style={[styles.divider, isDark && { backgroundColor: '#333' }]} />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>To Pay</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>-{totalToPay.toFixed(2)}€</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : expenses.length === 0 ? (
        <Text style={styles.emptyText}>No active expenses in this group.</Text>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Assign Expense</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={dismissKeyboard}>
          <View style={[styles.modalContent, isDark && { backgroundColor: '#1E1E1E' }]}>
            <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>New Integrated Expense</Text>

            <TextInput
              style={[styles.input, isDark && { backgroundColor: '#2A2A2A', color: '#FFF', borderColor: '#444' }]}
              placeholder="Description (e.g., Uber to Hotel)"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, isDark && { backgroundColor: '#2A2A2A', color: '#FFF', borderColor: '#444' }]}
              placeholder="Amount (€)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={[styles.inputLabel, isDark && { color: '#FFF' }]}>Who owes you this money?</Text>
            
            {groupMembers.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.md }}>
                There are no other members in this group to charge.
              </Text>
            ) : (
              <View style={styles.selectorContainer}>
                {groupMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.selectorButton, 
                      selectedDebtor === member.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedDebtor(member.id)}
                  >
                    <Text style={[styles.selectorText, selectedDebtor === member.id && { color: '#FFF' }, isDark && selectedDebtor !== member.id && { color: '#FFF' }]}>
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalBtn, 
                  { backgroundColor: isFormValid ? colors.primary : '#E9ECEF' },
                  !isFormValid && { opacity: 0.6 }
                ]} 
                onPress={handleAddExpense}
                disabled={!isFormValid}
              >
                <Text style={[styles.saveBtnText, !isFormValid && { color: '#6C757D' }]}>
                  Submit Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: colors.surface },
  backButton: { padding: spacing.xs },
  title: { ...typography.h2, color: colors.secondary, fontSize: 20 },
  summaryContainer: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md, borderRadius: border.radiusCard, padding: spacing.lg, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  summaryBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#E9ECEF', marginHorizontal: spacing.md },
  summaryLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  summaryValue: { ...typography.h2, fontSize: 22 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: border.radiusCard, marginBottom: spacing.sm, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  expenseInfo: { flex: 1 },
  expenseTitle: { ...typography.body, fontWeight: 'bold', color: colors.secondary, fontSize: 16 },
  statusText: { fontSize: 13, marginTop: 2 },
  expensePayer: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  expenseAmount: { ...typography.h2, fontSize: 18 },
  addButton: { position: 'absolute', bottom: spacing.xl, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: border.radiusButton, elevation: 5 },
  addButtonText: { ...typography.body, fontWeight: 'bold', color: '#FFF', marginLeft: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: border.radiusCard, borderTopRightRadius: border.radiusCard, padding: spacing.lg, paddingBottom: 40 },
  modalTitle: { ...typography.h2, color: colors.secondary, marginBottom: spacing.lg },
  inputLabel: { ...typography.caption, marginBottom: spacing.sm, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, fontSize: 16 },
  selectorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xl },
  selectorButton: { borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: spacing.sm, minWidth: 80, alignItems: 'center' },
  selectorText: { ...typography.caption, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  modalBtn: { flex: 1, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#E9ECEF' },
  cancelBtnText: { color: '#495057', fontWeight: 'bold' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 40 }
});