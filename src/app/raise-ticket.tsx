
// import React, { useEffect, useRef, useState } from 'react';
// import {
//   View, Text, StyleSheet, TextInput, TouchableOpacity,
//   ScrollView, SafeAreaView, ActivityIndicator, Modal,
//   FlatList, Platform, Image
// } from 'react-native';
// import { router } from 'expo-router';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import * as ImagePicker from 'expo-image-picker';
// import { Theme } from '../constants/theme';
// import { api } from '../services/api';
// import { useTickets } from '../context/TicketContext'; // Context added

// type AttachedFile = { uri: string; data: string; type: string; name: string };
// const MAX_FILES = 3;

// export default function RaiseTicketScreen({ onClose }: { onClose?: (refresh?: boolean) => void }) {
//   const [user, setUser] = useState<any>(null);
  
//   // States consumed from TicketContext
//   const { dropdowns, loadingDropdowns, fetchDropdowns, clearCache } = useTickets();

//   const [selectedLoc, setSelectedLoc] = useState('');
//   const [selectedPC, setSelectedPC] = useState('');
//   const [selectedSolver, setSelectedSolver] = useState('');
//   const [priority, setPriority] = useState('Low');
//   const [issue, setIssue] = useState('');
//   const [files, setFiles] = useState<AttachedFile[]>([]);

//   const [dateObj, setDateObj] = useState<Date | null>(null);
//   const [desiredDateStr, setDesiredDateStr] = useState('');
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   const [submitting, setSubmitting] = useState(false);
//   const submitLock = useRef(false);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [modalTitle, setModalTitle] = useState('');
//   const [modalData, setModalData] = useState<string[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [activeField, setActiveField] = useState<'loc' | 'pc' | 'solver' | null>(null);

//   const isModalView = !!onClose;

//   // ========== CUSTOM ALERT STATE ==========
//   const [alertVisible, setAlertVisible] = useState(false);
//   const [alertTitle, setAlertTitle] = useState('');
//   const [alertMsg, setAlertMsg] = useState('');
//   const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
//   const [alertOnOk, setAlertOnOk] = useState<(() => void) | null>(null);

//   const showCustomAlert = (
//     title: string,
//     msg: string,
//     type: 'success' | 'error' | 'info' = 'success',
//     onOk?: () => void
//   ) => {
//     setAlertTitle(title);
//     setAlertMsg(msg);
//     setAlertType(type);
//     setAlertOnOk(() => onOk || null);
//     setAlertVisible(true);
//   };

//   const closeCustomAlert = () => {
//     setAlertVisible(false);
//     if (alertOnOk) alertOnOk();
//   };

//   useEffect(() => {
//     loadUserAndDropdowns();
//   }, []);

//   const formatAndSetDate = (d: Date) => {
//     const day = String(d.getDate()).padStart(2, '0');
//     const month = String(d.getMonth() + 1).padStart(2, '0');
//     const year = d.getFullYear();
//     setDateObj(d);
//     setDesiredDateStr(`${day}/${month}/${year}`);
//   };

//   const toInputValue = (d: Date | null) => {
//     if (!d) return '';
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
//   };

//   const loadUserAndDropdowns = async () => {
//     const stored = await AsyncStorage.getItem('fms_user');
//     if (stored) {
//       const u = JSON.parse(stored);
//       setUser(u);
//       // Fetches instantly from context cache
//       await fetchDropdowns(false); 
//     } else {
//       router.replace('/login');
//     }
//   };

//   const openSearchModal = (field: 'loc' | 'pc' | 'solver', title: string, data: string[]) => {
//     setActiveField(field);
//     setModalTitle(title);
//     setModalData(data);
//     setSearchQuery('');
//     setModalVisible(true);
//   };

//   const handleSelectItem = (item: string) => {
//     if (activeField === 'loc') setSelectedLoc(item);
//     if (activeField === 'pc') setSelectedPC(item);
//     if (activeField === 'solver') setSelectedSolver(item);
//     setModalVisible(false);
//   };

//   const filteredModalData = modalData.filter((item) =>
//     item.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const handleDateChange = (event: any, selectedDate?: Date) => {
//     if (Platform.OS === 'android') setShowDatePicker(false);
//     if (selectedDate) formatAndSetDate(selectedDate);
//   };

//   const pickImages = async () => {
//     if (files.length >= MAX_FILES) {
//       showCustomAlert('Limit', `Maximum ${MAX_FILES} images allowed.`, 'info');
//       return;
//     }
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsMultipleSelection: true,
//       selectionLimit: MAX_FILES - files.length,
//       base64: true,
//       quality: 0.5,
//     });
//     if (result.canceled) return;

//     const picked: AttachedFile[] = result.assets
//       .filter((a) => !!a.base64)
//       .map((a, i) => ({
//         uri: a.uri,
//         data: a.base64 as string,
//         type: a.mimeType || 'image/jpeg',
//         name: a.fileName || `issue_${Date.now()}_${i}.jpg`,
//       }));
//     setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
//   };

//   const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

//   const handleGoBack = (refresh = false) => {
//     if (isModalView && onClose) {
//       onClose(refresh);
//     } else {
//       if (router.canGoBack()) router.back();
//       else router.replace('/dashboard');
//     }
//   };

//   const handleSubmit = async () => {
//     if (submitLock.current) return;

//     if (!issue.trim()) return showCustomAlert('Required', 'Please describe the issue/problem.', 'error');
//     if (!selectedLoc) return showCustomAlert('Required', 'Please select Location.', 'error');
//     if (!selectedPC) return showCustomAlert('Required', 'Please select PC Assigned.', 'error');
//     if (!selectedSolver) return showCustomAlert('Required', 'Please select Problem Solver.', 'error');

//     submitLock.current = true;
//     setSubmitting(true);

//     const payload = {
//       loc: selectedLoc,
//       pc: selectedPC,
//       solver: selectedSolver,
//       prio: priority,
//       date: desiredDateStr,
//       issue: issue.trim(),
//       raisedBy: user?.name || '',
//       files: files.map((f) => ({ data: f.data, type: f.type, name: f.name })),
//     };

//     try {
//       const res = await api.createTicket(payload);
//       if (res && res.success) {
//         clearCache(); // 🔥 Clears context ticket caches instantly so dashboard loads fresh list on return
//         showCustomAlert(
//           'Success!',
//           `Ticket Created: ${res.ticketId}`,
//           'success',
//           () => handleGoBack(true)
//         );
//       } else {
//         submitLock.current = false;
//         showCustomAlert('Error', res?.message || 'Failed to submit ticket', 'error');
//       }
//     } catch (e) {
//       submitLock.current = false;
//       showCustomAlert('Error', 'Network error. Please try again.', 'error');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loadingDropdowns) {
//     return (
//       <SafeAreaView style={[styles.safeArea, isModalView && { backgroundColor: 'transparent' }]}>
//         <View style={styles.centerContainer}>
//           <ActivityIndicator size="large" color={Theme.colors.primary} />
//           <Text style={styles.loadingText}>Loading options...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const renderDropdown = (
//     label: string, icon: any, value: string, placeholder: string,
//     onPress: () => void
//   ) => (
//     <View style={styles.formGroup}>
//       <Text style={styles.label}>{label}</Text>
//       <TouchableOpacity style={styles.dropdownBox} onPress={onPress} activeOpacity={0.7}>
//         <View style={styles.dropdownLeft}>
//           <Ionicons name={icon} size={18} color={Theme.colors.textMuted} />
//           <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
//             {value || placeholder}
//           </Text>
//         </View>
//         <Ionicons name="chevron-down" size={18} color={Theme.colors.textMuted} />
//       </TouchableOpacity>
//     </View>
//   );

//   const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
//   const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
//   const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

//   // Filter solver options to exclude current user
//   const solverList = dropdowns.solvers.filter((s: string) => s !== user?.name);

//   return (
//     <SafeAreaView style={[styles.safeArea, isModalView && { backgroundColor: 'transparent' }]}>
//       <View style={[styles.webOuterContainer, isModalView && { backgroundColor: 'transparent' }]}>
//         <View style={[styles.mainWrapper, isModalView && { maxWidth: '100%', borderWidth: 0 }]}>

//           <View style={[styles.appBar, isModalView && { paddingTop: 16 }]}>
//             <Text style={styles.appBarTitle}>Raise Ticket</Text>
//             <TouchableOpacity style={styles.backBtn} onPress={() => handleGoBack(false)}>
//               <Ionicons name="close" size={26} color={Theme.colors.text} />
//             </TouchableOpacity>
//           </View>

//           <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
//             <View style={styles.formGroup}>
//               <Text style={styles.label}>ISSUE / PROBLEM *</Text>
//               <TextInput
//                 style={styles.textArea}
//                 placeholder="Describe the issue clearly..."
//                 placeholderTextColor={Theme.colors.textMuted}
//                 multiline
//                 numberOfLines={4}
//                 value={issue}
//                 onChangeText={setIssue}
//               />
//             </View>

//             {renderDropdown('LOCATION *', 'location-outline', selectedLoc, 'Select Location',
//               () => openSearchModal('loc', 'Select Location', dropdowns.locations))}
//             {renderDropdown('PC ASSIGNED *', 'person-outline', selectedPC, 'Select PC Assigned',
//               () => openSearchModal('pc', 'Select PC Assigned', dropdowns.pcs))}
//             {renderDropdown('PROBLEM SOLVER *', 'build-outline', selectedSolver, 'Select Problem Solver',
//               () => openSearchModal('solver', 'Select Problem Solver', solverList))}

//             <View style={styles.formGroup}>
//               <Text style={styles.label}>PRIORITY</Text>
//               <View style={styles.priorityRow}>
//                 {['Low', 'Medium', 'High'].map((p) => (
//                   <TouchableOpacity
//                     key={p}
//                     style={[
//                       styles.prioBtn,
//                       priority === p ? (p === 'High' ? styles.prioHigh : styles.prioActive) : null,
//                     ]}
//                     onPress={() => setPriority(p)}
//                   >
//                     <Text style={[styles.prioText, priority === p ? styles.activePrioText : null]}>{p}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             <View style={styles.formGroup}>
//               <Text style={styles.label}>DESIRED DATE (OPTIONAL)</Text>
//               {Platform.OS === 'web' ? (
//                 <View style={styles.dropdownBox}>
//                   <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
//                   <input
//                     type="date"
//                     style={{
//                       flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600',
//                       color: desiredDateStr ? Theme.colors.text : Theme.colors.textMuted,
//                       backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer',
//                     }}
//                     value={toInputValue(dateObj)}
//                     onChange={(e) => {
//                       if (e.target.value) {
//                         const [y, m, d] = e.target.value.split('-').map(Number);
//                         formatAndSetDate(new Date(y, m - 1, d));
//                       } else {
//                         setDateObj(null);
//                         setDesiredDateStr('');
//                       }
//                     }}
//                   />
//                 </View>
//               ) : (
//                 <TouchableOpacity style={styles.dropdownBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
//                   <View style={styles.dropdownLeft}>
//                     <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} />
//                     <Text style={[styles.dropdownText, !desiredDateStr && styles.placeholderText]}>
//                       {desiredDateStr || 'Select Date (Optional)'}
//                     </Text>
//                   </View>
//                   <Ionicons name="calendar" size={18} color={Theme.colors.primary} />
//                 </TouchableOpacity>
//               )}

//               {showDatePicker && Platform.OS !== 'web' && (
//                 <DateTimePicker
//                   value={dateObj || new Date()}
//                   mode="date"
//                   display={Platform.OS === 'ios' ? 'spinner' : 'default'}
//                   onChange={handleDateChange}
//                   minimumDate={new Date()}
//                 />
//               )}
//             </View>

//             <View style={styles.formGroup}>
//               <Text style={styles.label}>ATTACH IMAGES (OPTIONAL, MAX {MAX_FILES})</Text>
//               <View style={styles.filesRow}>
//                 {files.map((f, i) => (
//                   <View key={i} style={styles.thumbWrap}>
//                     <Image source={{ uri: f.uri }} style={styles.thumb} />
//                     <TouchableOpacity style={styles.thumbRemove} onPress={() => removeFile(i)}>
//                       <Ionicons name="close-circle" size={20} color="#EF4444" />
//                     </TouchableOpacity>
//                   </View>
//                 ))}
//                 {files.length < MAX_FILES && (
//                   <TouchableOpacity style={styles.addImgBtn} onPress={pickImages} activeOpacity={0.7}>
//                     <Ionicons name="image-outline" size={24} color={Theme.colors.primary} />
//                     <Text style={styles.addImgText}>Add</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             </View>

//             <TouchableOpacity
//               style={[styles.submitBtn, submitting ? styles.btnDisabled : null]}
//               onPress={handleSubmit}
//               disabled={submitting}
//               activeOpacity={0.8}
//             >
//               {submitting ? (
//                 <ActivityIndicator color="#FFFFFF" />
//               ) : (
//                 <Text style={styles.submitBtnText}>Submit Ticket</Text>
//               )}
//             </TouchableOpacity>
//           </ScrollView>
//         </View>
//       </View>

//       {/* Search Modal */}
//       <Modal visible={modalVisible} animationType="slide" transparent={false}>
//         <SafeAreaView style={styles.modalSafeArea}>
//           <View style={styles.webOuterContainer}>
//             <View style={styles.mainWrapper}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>{modalTitle}</Text>
//                 <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
//                   <Ionicons name="close" size={24} color={Theme.colors.text} />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.modalSearchContainer}>
//                 <Ionicons name="search" size={18} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
//                 <TextInput
//                   style={styles.modalSearchInput}
//                   placeholder="Search..."
//                   placeholderTextColor={Theme.colors.textMuted}
//                   value={searchQuery}
//                   onChangeText={setSearchQuery}
//                   autoFocus
//                 />
//                 {searchQuery.length > 0 && (
//                   <TouchableOpacity onPress={() => setSearchQuery('')}>
//                     <Ionicons name="close-circle" size={18} color={Theme.colors.textMuted} />
//                   </TouchableOpacity>
//                 )}
//               </View>

//               <FlatList
//                 data={filteredModalData}
//                 keyExtractor={(item) => item}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectItem(item)}>
//                     <Text style={styles.modalItemText}>{item}</Text>
//                     <Ionicons name="chevron-forward" size={16} color={Theme.colors.borderDark} />
//                   </TouchableOpacity>
//                 )}
//                 ListEmptyComponent={
//                   <View style={styles.emptySearch}>
//                     <Text style={styles.emptySearchText}>No matching results found</Text>
//                   </View>
//                 }
//               />
//             </View>
//           </View>
//         </SafeAreaView>
//       </Modal>

//       {/* ========== CUSTOM SWEET ALERT ========== */}
//       <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
//         <View style={styles.alertOverlay}>
//           <View style={styles.alertCard}>
//             <View style={[styles.alertIconCircle, { backgroundColor: alertBg }]}>
//               <Ionicons name={alertIcon as any} size={42} color={alertColor} />
//             </View>
//             <Text style={styles.alertTitle}>{alertTitle}</Text>
//            <Text style={styles.alertMessage}>{alertMsg}</Text>
//             <TouchableOpacity
//               style={[styles.alertOkBtn, { backgroundColor: alertColor }]}
//               onPress={closeCustomAlert}
//               activeOpacity={0.85}
//             >
//               <Text style={styles.alertOkText}>OK</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// // ... Stylings remain identical to preserve CSS exactly as provided ...
// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: Theme.colors.background },
//   webOuterContainer: { flex: 1, alignItems: 'center', backgroundColor: Theme.colors.background },
//   mainWrapper: {
//     flex: 1, width: '100%', maxWidth: 600, backgroundColor: '#FFFFFF',
//     borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
//     borderRightWidth: Platform.OS === 'web' ? 1 : 0,
//     borderColor: Theme.colors.border,
//   },
//   centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
//   loadingText: { marginTop: 10, color: Theme.colors.textMuted, fontSize: 14 },
//   appBar: {
//     backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//     paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
//     paddingTop: Platform.OS === 'android' ? 40 : 14,
//   },
//   backBtn: { padding: 4, backgroundColor: '#E2E8F0', borderRadius: 20 },
//   appBarTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: '800' },
//   container: { flex: 1, backgroundColor: '#FFFFFF' },
//   scrollContent: { padding: 20 },
//   formGroup: { marginBottom: 20 },
//   label: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
//   dropdownBox: {
//     backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
//     paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
//   },
//   dropdownLeft: { flexDirection: 'row', alignItems: 'center' },
//   dropdownText: { fontSize: 15, fontWeight: '600', color: Theme.colors.text, marginLeft: 10 },
//   placeholderText: { color: Theme.colors.textMuted, fontWeight: '400' },
//   textArea: {
//     backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
//     paddingHorizontal: 14, paddingTop: 12, height: 100, fontSize: 15, color: Theme.colors.text, textAlignVertical: 'top',
//   },
//   priorityRow: { flexDirection: 'row' },
//   prioBtn: {
//     flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border,
//     borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginRight: 8,
//   },
//   prioActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
//   prioHigh: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
//   prioText: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
//   activePrioText: { color: '#FFFFFF' },
//   filesRow: { flexDirection: 'row', flexWrap: 'wrap' },
//   thumbWrap: { width: 80, height: 80, marginRight: 10, marginBottom: 10 },
//   thumb: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border },
//   thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 10 },
//   addImgBtn: {
//     width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
//     borderColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC',
//   },
//   addImgText: { fontSize: 12, color: Theme.colors.primary, fontWeight: '600', marginTop: 2 },
//   submitBtn: {
//     backgroundColor: Theme.colors.primary, height: 54, borderRadius: 27,
//     justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30, elevation: 2,
//   },
//   btnDisabled: { opacity: 0.7 },
//   submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
//   modalSafeArea: { flex: 1, backgroundColor: Theme.colors.background },
//   modalHeader: {
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1,
//     borderBottomColor: Theme.colors.border, backgroundColor: '#FFFFFF',
//   },
//   modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.colors.text },
//   modalCloseBtn: { padding: 4 },
//   modalSearchContainer: {
//     flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background,
//     margin: 16, paddingHorizontal: 14, height: 46, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border,
//   },
//   modalSearchInput: { flex: 1, fontSize: 15, color: Theme.colors.text },
//   modalItem: {
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1,
//     borderBottomColor: Theme.colors.border, backgroundColor: '#FFFFFF',
//   },
//   modalItemText: { fontSize: 15, fontWeight: '600', color: Theme.colors.text },
//   emptySearch: { padding: 30, alignItems: 'center' },
//   emptySearchText: { color: Theme.colors.textMuted, fontSize: 14 },

//   alertOverlay: {
//     flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24,
//   },
//   alertCard: {
//     width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center',
//     elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24,
//   },
//   alertIconCircle: {
//     width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18,
//   },
//   alertTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, marginBottom: 8, textAlign: 'center' },
//   alertMessage: { fontSize: 15, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
//   alertOkBtn: { width: '100%', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
//   alertOkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
// });










import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Modal,
  FlatList, Platform, Image, Linking
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker'; // ✅ ImagePicker ki jagah ye
import { Theme } from '../constants/theme';
import { api } from '../services/api';
import { useTickets } from '../context/TicketContext';

type AttachedFile = { uri: string; data: string; type: string; name: string };
const MAX_FILES = 3;

export default function RaiseTicketScreen({ onClose }: { onClose?: (refresh?: boolean) => void }) {
  const [user, setUser] = useState<any>(null);
  const { dropdowns, loadingDropdowns, fetchDropdowns, clearCache } = useTickets();

  const [selectedLoc, setSelectedLoc] = useState('');
  const [selectedPC, setSelectedPC] = useState('');
  const [selectedSolver, setSelectedSolver] = useState('');
  const [priority, setPriority] = useState('Low');
  const [issue, setIssue] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);

  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [desiredDateStr, setDesiredDateStr] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeField, setActiveField] = useState<'loc' | 'pc' | 'solver' | null>(null);

  const isModalView = !!onClose;

  // ========== CUSTOM ALERT STATE ==========
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
  const [alertOnOk, setAlertOnOk] = useState<(() => void) | null>(null);

  const showCustomAlert = (
    title: string,
    msg: string,
    type: 'success' | 'error' | 'info' = 'success',
    onOk?: () => void
  ) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertType(type);
    setAlertOnOk(() => onOk || null);
    setAlertVisible(true);
  };

  const closeCustomAlert = () => {
    setAlertVisible(false);
    if (alertOnOk) alertOnOk();
  };

  useEffect(() => {
    loadUserAndDropdowns();
  }, []);

  const formatAndSetDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setDateObj(d);
    setDesiredDateStr(`${day}/${month}/${year}`);
  };

  const toInputValue = (d: Date | null) => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const loadUserAndDropdowns = async () => {
    const stored = await AsyncStorage.getItem('fms_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      await fetchDropdowns(false);
    } else {
      router.replace('/login');
    }
  };

  const openSearchModal = (field: 'loc' | 'pc' | 'solver', title: string, data: string[]) => {
    setActiveField(field);
    setModalTitle(title);
    setModalData(data);
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelectItem = (item: string) => {
    if (activeField === 'loc') setSelectedLoc(item);
    if (activeField === 'pc') setSelectedPC(item);
    if (activeField === 'solver') setSelectedSolver(item);
    setModalVisible(false);
  };

  const filteredModalData = modalData.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) formatAndSetDate(selectedDate);
  };

  // ✅ NEW: PDF + CSV + Images sab allow
  const pickFiles = async () => {
    if (files.length >= MAX_FILES) {
      showCustomAlert('Limit', `Maximum ${MAX_FILES} files allowed.`, 'info');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/*',
          'application/pdf',
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      const remaining = MAX_FILES - files.length;
      const selected = assets.slice(0, remaining);

      const newFiles: AttachedFile[] = [];

      for (let i = 0; i < selected.length; i++) {
        const asset = selected[i];
        // File ko base64 me convert karna
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            // data:application/pdf;base64,.... se sirf base64 part nikaalo
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        newFiles.push({
          uri: asset.uri,
          data: base64,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name || `file_${Date.now()}_${i}`,
        });
      }

      setFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES));
    } catch (err) {
      console.log('Document pick error:', err);
      showCustomAlert('Error', 'Could not pick file. Please try again.', 'error');
    }
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // File icon decide karne ke liye helper
  const getFileIcon = (type: string, name: string) => {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (t.includes('pdf') || n.endsWith('.pdf')) return 'document-text';
    if (t.includes('csv') || n.endsWith('.csv') || t.includes('excel') || n.endsWith('.xlsx') || n.endsWith('.xls')) return 'grid';
    if (t.includes('image')) return 'image';
    return 'document-attach';
  };

  const isImageFile = (type: string, name: string) => {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return t.includes('image') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.webp');
  };

  const handleGoBack = (refresh = false) => {
    if (isModalView && onClose) {
      onClose(refresh);
    } else {
      if (router.canGoBack()) router.back();
      else router.replace('/dashboard');
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;

    if (!issue.trim()) return showCustomAlert('Required', 'Please describe the issue/problem.', 'error');
    if (!selectedLoc) return showCustomAlert('Required', 'Please select Location.', 'error');
    if (!selectedPC) return showCustomAlert('Required', 'Please select PC Assigned.', 'error');
    if (!selectedSolver) return showCustomAlert('Required', 'Please select Problem Solver.', 'error');

    submitLock.current = true;
    setSubmitting(true);

    const payload = {
      loc: selectedLoc,
      pc: selectedPC,
      solver: selectedSolver,
      prio: priority,
      date: desiredDateStr,
      issue: issue.trim(),
      raisedBy: user?.name || '',
      files: files.map((f) => ({ data: f.data, type: f.type, name: f.name })),
    };

    try {
      const res = await api.createTicket(payload);
      if (res && res.success) {
        clearCache();
        showCustomAlert(
          'Success!',
          `Ticket Created: ${res.ticketId}`,
          'success',
          () => handleGoBack(true)
        );
      } else {
        submitLock.current = false;
        showCustomAlert('Error', res?.message || 'Failed to submit ticket', 'error');
      }
    } catch (e) {
      submitLock.current = false;
      showCustomAlert('Error', 'Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDropdowns) {
    return (
      <SafeAreaView style={[styles.safeArea, isModalView && { backgroundColor: 'transparent' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderDropdown = (
    label: string, icon: any, value: string, placeholder: string,
    onPress: () => void
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdownBox} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.dropdownLeft}>
          <Ionicons name={icon} size={18} color={Theme.colors.textMuted} />
          <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
            {value || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
  const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
  const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

  const solverList = dropdowns.solvers.filter((s: string) => s !== user?.name);

  return (
    <SafeAreaView style={[styles.safeArea, isModalView && { backgroundColor: 'transparent' }]}>
      <View style={[styles.webOuterContainer, isModalView && { backgroundColor: 'transparent' }]}>
        <View style={[styles.mainWrapper, isModalView && { maxWidth: '100%', borderWidth: 0 }]}>

          <View style={[styles.appBar, isModalView && { paddingTop: 16 }]}>
            <Text style={styles.appBarTitle}>Raise Ticket</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => handleGoBack(false)}>
              <Ionicons name="close" size={26} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>ISSUE / PROBLEM *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the issue clearly..."
                placeholderTextColor={Theme.colors.textMuted}
                multiline
                numberOfLines={4}
                value={issue}
                onChangeText={setIssue}
              />
            </View>

            {renderDropdown('LOCATION *', 'location-outline', selectedLoc, 'Select Location',
              () => openSearchModal('loc', 'Select Location', dropdowns.locations))}
            {renderDropdown('PC ASSIGNED *', 'person-outline', selectedPC, 'Select PC Assigned',
              () => openSearchModal('pc', 'Select PC Assigned', dropdowns.pcs))}
            {renderDropdown('PROBLEM SOLVER *', 'build-outline', selectedSolver, 'Select Problem Solver',
              () => openSearchModal('solver', 'Select Problem Solver', solverList))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.priorityRow}>
                {['Low', 'Medium', 'High'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.prioBtn,
                      priority === p ? (p === 'High' ? styles.prioHigh : styles.prioActive) : null,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.prioText, priority === p ? styles.activePrioText : null]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>DESIRED DATE (OPTIONAL)</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.dropdownBox}>
                  <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
                  <input
                    type="date"
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600',
                      color: desiredDateStr ? Theme.colors.text : Theme.colors.textMuted,
                      backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer',
                    }}
                    value={toInputValue(dateObj)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split('-').map(Number);
                        formatAndSetDate(new Date(y, m - 1, d));
                      } else {
                        setDateObj(null);
                        setDesiredDateStr('');
                      }
                    }}
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.dropdownBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <View style={styles.dropdownLeft}>
                    <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} />
                    <Text style={[styles.dropdownText, !desiredDateStr && styles.placeholderText]}>
                      {desiredDateStr || 'Select Date (Optional)'}
                    </Text>
                  </View>
                  <Ionicons name="calendar" size={18} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}

              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={dateObj || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* ✅ UPDATED ATTACH SECTION */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>ATTACH FILES (OPTIONAL, MAX {MAX_FILES})</Text>
              <Text style={styles.hintText}>Images, PDF, CSV supported</Text>
              <View style={styles.filesRow}>
                {files.map((f, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    {isImageFile(f.type, f.name) ? (
                      <Image source={{ uri: f.uri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.docThumb]}>
                        <Ionicons
                          name={getFileIcon(f.type, f.name) as any}
                          size={28}
                          color={Theme.colors.primary}
                        />
                        <Text style={styles.docName} numberOfLines={2}>
                          {f.name}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => removeFile(i)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {files.length < MAX_FILES && (
                  <TouchableOpacity style={styles.addImgBtn} onPress={pickFiles} activeOpacity={0.7}>
                    <Ionicons name="attach" size={24} color={Theme.colors.primary} />
                    <Text style={styles.addImgText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting ? styles.btnDisabled : null]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Search Modal - same as before */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.webOuterContainer}>
            <View style={styles.mainWrapper}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSearchContainer}>
                <Ionicons name="search" size={18} color={Theme.colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search..."
                  placeholderTextColor={Theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={Theme.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredModalData}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectItem(item)}>
                    <Text style={styles.modalItemText}>{item}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Theme.colors.borderDark} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>No matching results found</Text>
                  </View>
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Alert - same as before */}
      <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconCircle, { backgroundColor: alertBg }]}>
              <Ionicons name={alertIcon as any} size={42} color={alertColor} />
            </View>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMsg}</Text>
            <TouchableOpacity
              style={[styles.alertOkBtn, { backgroundColor: alertColor }]}
              onPress={closeCustomAlert}
              activeOpacity={0.85}
            >
              <Text style={styles.alertOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  webOuterContainer: { flex: 1, alignItems: 'center', backgroundColor: Theme.colors.background },
  mainWrapper: {
    flex: 1, width: '100%', maxWidth: 600, backgroundColor: '#FFFFFF',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: Theme.colors.border,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  loadingText: { marginTop: 10, color: Theme.colors.textMuted, fontSize: 14 },
  appBar: {
    backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
    paddingTop: Platform.OS === 'android' ? 40 : 14,
  },
  backBtn: { padding: 4, backgroundColor: '#E2E8F0', borderRadius: 20 },
  appBarTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
  hintText: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 8, marginTop: -4 },
  dropdownBox: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
    paddingHorizontal: 14, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center' },
  dropdownText: { fontSize: 15, fontWeight: '600', color: Theme.colors.text, marginLeft: 10 },
  placeholderText: { color: Theme.colors.textMuted, fontWeight: '400' },
  textArea: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, height: 100, fontSize: 15, color: Theme.colors.text, textAlignVertical: 'top',
  },
  priorityRow: { flexDirection: 'row' },
  prioBtn: {
    flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: Theme.colors.border,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginRight: 8,
  },
  prioActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  prioHigh: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  prioText: { fontSize: 14, fontWeight: '600', color: Theme.colors.text },
  activePrioText: { color: '#FFFFFF' },
  filesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  thumbWrap: { width: 80, height: 80, marginRight: 10, marginBottom: 10 },
  thumb: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border },
  docThumb: {
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  docName: { fontSize: 8, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 4 },
  thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 10 },
  addImgBtn: {
    width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC',
  },
  addImgText: { fontSize: 12, color: Theme.colors.primary, fontWeight: '600', marginTop: 2 },
  submitBtn: {
    backgroundColor: Theme.colors.primary, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30, elevation: 2,
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalSafeArea: { flex: 1, backgroundColor: Theme.colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border, backgroundColor: '#FFFFFF',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.colors.text },
  modalCloseBtn: { padding: 4 },
  modalSearchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background,
    margin: 16, paddingHorizontal: 14, height: 46, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border,
  },
  modalSearchInput: { flex: 1, fontSize: 15, color: Theme.colors.text },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border, backgroundColor: '#FFFFFF',
  },
  modalItemText: { fontSize: 15, fontWeight: '600', color: Theme.colors.text },
  emptySearch: { padding: 30, alignItems: 'center' },
  emptySearchText: { color: Theme.colors.textMuted, fontSize: 14 },
  alertOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  alertCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center',
    elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24,
  },
  alertIconCircle: {
    width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  alertTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, marginBottom: 8, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  alertOkBtn: { width: '100%', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  alertOkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});