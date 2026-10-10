

// import React, { useCallback, useRef, useState, useEffect } from 'react';
// import {
//   View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView,
//   Platform, TextInput, ScrollView, useWindowDimensions, Modal, Image,
// } from 'react-native';
// import { router, useFocusEffect } from 'expo-router';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import * as ImagePicker from 'expo-image-picker';
// import { Theme } from '../constants/theme';
// import { api } from '../services/api';
// import { useTickets } from '../context/TicketContext';
// import RaiseTicketScreen from './raise-ticket';

// type ActionKind = 'accept' | 'reject' | 'solve' | 'revise' | 'verify' | 'close' | 'reraise';
// type AttachedFile = { uri: string; data: string; type: string; name: string };

// const clean = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// const ACTION_META: Record<ActionKind, { label: string; icon: any; color: string; title: string }> = {
//   accept:  { label: 'Accept',  icon: 'checkmark-circle-outline', color: '#10B981', title: 'Accept Ticket' },
//   reject:  { label: 'Reject',  icon: 'close-circle-outline',     color: '#EF4444', title: 'Reject Ticket' },
//   solve:   { label: 'Solve',   icon: 'construct-outline',        color: '#10B981', title: 'Mark as Solved' },
//   revise:  { label: 'Revise',  icon: 'time-outline',             color: '#F59E0B', title: 'Revise Date' },
//   verify:  { label: 'Verify',  icon: 'shield-checkmark-outline', color: '#3B82F6', title: 'Verify Solution' },
//   close:   { label: 'Close',   icon: 'lock-closed-outline',      color: '#10B981', title: 'Close Ticket' },
//   reraise: { label: 'Reraise', icon: 'refresh-outline',          color: '#EF4444', title: 'Reraise Ticket' },
// };

// // ========================================================
// // ✅ DATE PARSER (DD/MM/YYYY Safe)
// // ========================================================
// function parseAppDate(val: any): Date | null {
//   if (!val) return null;
//   const str = String(val).trim().replace(/\u00a0/g, ' ');
//   if (!str || str === '-' || str === '') return null;
//   const m = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
//   if (!m) {
//     const d = new Date(str);
//     return isNaN(d.getTime()) ? null : d;
//   }
//   let day = parseInt(m[1], 10);
//   let month = parseInt(m[2], 10) - 1;
//   let year = parseInt(m[3], 10);
//   if (year < 100) year += 2000;
//   const h = m[4] ? parseInt(m[4], 10) : 0;
//   const min = m[5] ? parseInt(m[5], 10) : 0;
//   const s = m[6] ? parseInt(m[6], 10) : 0;
//   const d = new Date(year, month, day, h, min, s);
//   return isNaN(d.getTime()) ? null : d;
// }

// // ========================================================
// // ✅ LIVE TIME LEFT — Final Rule
// //  1. PC Check     → Timestamp + 1 hour
// //  2. Solve        → Planned Date 11:59:59 PM
// //  3. PC Verify    → Actual_2 (solve time) + 1 hour
// //  4. Close        → Actual_3 (verify time) + 1 hour
// // ========================================================
// const LiveTimeLeft = ({ ticket, user }: { ticket: any, user: any }) => {
//   const [timeLeft, setTimeLeft] = useState<{ text: string, overdue: boolean } | null>(null);

//   useEffect(() => {
//     if (!user || !ticket) { setTimeLeft(null); return; }

//     const me = clean(user.name);
//     const isPc = clean(ticket.pc) === me;
//     const isSolver = clean(ticket.solver) === me;
//     const isRaiser = clean(ticket.raiser) === me;

//     const s1 = clean(ticket.status1);
//     const s2 = clean(ticket.status2);
//     const s3 = clean(ticket.status3);
//     const s4 = clean(ticket.status4);

//     // ❌ Closed / Reject → hide
//     if (s4 === 'closed' || s1 === 'reject') { setTimeLeft(null); return; }

//     let targetDate: Date | null = null;
//     let isMyTurn = false;

//     if (s1 !== 'done') {
//       // ✅ STEP 1: PC Check — Timestamp + 1 hour
//       const createdDate = parseAppDate(ticket.timestamp);
//       if (createdDate) {
//         targetDate = new Date(createdDate.getTime() + 60 * 60 * 1000);
//       }
//       isMyTurn = isPc;
//     } else if (s2 !== 'solved') {
//       // ✅ STEP 2: Solve — Planned date ke din 11:59:59 PM
//       const plannedD = parseAppDate(ticket.reviseDate || ticket.plannedDate);
//       if (plannedD) {
//         targetDate = new Date(plannedD.getFullYear(), plannedD.getMonth(), plannedD.getDate(), 23, 59, 59);
//       }
//       isMyTurn = isSolver;
//     } else if (s3 !== 'verified') {
//       // ✅ STEP 3: PC Verify — Solve hone ke baad + 1 hour
//       const solvedDate = parseAppDate(ticket.actualDate);
//       if (solvedDate) {
//         targetDate = new Date(solvedDate.getTime() + 60 * 60 * 1000);
//       } else {
//         const pd3 = parseAppDate(ticket.planned3);
//         if (pd3) targetDate = new Date(pd3.getFullYear(), pd3.getMonth(), pd3.getDate(), 23, 59, 59);
//       }
//       isMyTurn = isPc;
//     } else if (s4 !== 'closed') {
//       // ✅ STEP 4: Close — Verify hone ke baad + 1 hour
//       const verifiedDate = parseAppDate(ticket.actual3);
//       if (verifiedDate) {
//         targetDate = new Date(verifiedDate.getTime() + 60 * 60 * 1000);
//       } else {
//         const pd4 = parseAppDate(ticket.planned4);
//         if (pd4) targetDate = new Date(pd4.getFullYear(), pd4.getMonth(), pd4.getDate(), 23, 59, 59);
//       }
//       isMyTurn = isRaiser;
//     }

//     if (!isMyTurn || !targetDate) { setTimeLeft(null); return; }

//     const deadlineMs = targetDate.getTime();

//     const tick = () => {
//       const now = new Date().getTime();
//       const diffMs = deadlineMs - now;
//       const totalSeconds = Math.round(diffMs / 1000);
//       const isOverdue = totalSeconds < 0;
//       const absSeconds = Math.abs(totalSeconds);

//       const days = Math.floor(absSeconds / (3600 * 24));
//       const hours = Math.floor((absSeconds % (3600 * 24)) / 3600);
//       const mins = Math.floor((absSeconds % 3600) / 60);
//       const secs = absSeconds % 60;

//       let formattedTime = '';
//       if (days > 0) {
//         formattedTime = `${days}d ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
//       } else if (hours > 0) {
//         formattedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
//       } else {
//         formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
//       }

//       setTimeLeft({
//         text: isOverdue ? `Overdue: -${formattedTime}` : `Time Left: ${formattedTime}`,
//         overdue: isOverdue
//       });
//     };

//     tick();
//     const intervalId = setInterval(tick, 1000);
//     return () => clearInterval(intervalId);
//   }, [ticket, user]);

//   if (!timeLeft) return null;

//   return (
//     <View style={[styles.timeLeftBar, timeLeft.overdue && styles.timeLeftBarOverdue]}>
//       <Ionicons name="time-outline" size={16} color={timeLeft.overdue ? '#B91C1C' : '#0E7490'} style={{ marginRight: 6 }} />
//       <Text style={[styles.timeLeftText, timeLeft.overdue && styles.timeLeftTextOverdue]}>
//         {timeLeft.text}
//       </Text>
//     </View>
//   );
// };
// // ========================================================

// function DateField({ value, onChange, minToday }: { value: Date | null; onChange: (d: Date | null) => void; minToday?: boolean }) {
//   const [show, setShow] = useState(false);
//   const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
//   const toInput = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

//   if (Platform.OS === 'web') {
//     return (
//       <View style={styles.inputBox}>
//         <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
//         <input type="date" style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer', color: value ? Theme.colors.text : Theme.colors.textMuted }} value={toInput(value)} onChange={(e) => { if (e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); onChange(new Date(y, m - 1, d)); } else onChange(null); }} />
//       </View>
//     );
//   }

//   return (
//     <>
//       <TouchableOpacity style={styles.inputBox} onPress={() => setShow(true)} activeOpacity={0.7}>
//         <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
//         <Text style={{ fontSize: 15, fontWeight: value ? '600' : '400', color: value ? Theme.colors.text : Theme.colors.textMuted }}>{value ? fmt(value) : 'Select Date'}</Text>
//       </TouchableOpacity>
//       {show && (
//         <DateTimePicker value={value || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={minToday ? new Date() : undefined} onChange={(e: any, d?: Date) => { if (Platform.OS === 'android') setShow(false); if (d) onChange(d); }} />
//       )}
//     </>
//   );
// }

// export default function DashboardScreen() {
//   const { width } = useWindowDimensions();
//   const getColumnWidth = () => { if (width >= 1200) return '25%'; if (width >= 768) return '33.33%'; return '100%'; };
//   const isLargeScreen = width >= 768;

//   const [user, setUser] = useState<any>(null);
//   const { tickets, counts, stats, loading, fetchTickets, clearCache } = useTickets();
//   const [filter, setFilter] = useState('action');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [showRaiseModal, setShowRaiseModal] = useState(false);

//   const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

//   const [actionTicket, setActionTicket] = useState<any>(null);
//   const [actionKind, setActionKind] = useState<ActionKind | null>(null);
//   const [remark, setRemark] = useState('');
//   const [actionDate, setActionDate] = useState<Date | null>(null);
//   const [rating, setRating] = useState(0);
//   const [files, setFiles] = useState<AttachedFile[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const submitLock = useRef(false);

//   const [alertVisible, setAlertVisible] = useState(false);
//   const [alertTitle, setAlertTitle] = useState('');
//   const [alertMsg, setAlertMsg] = useState('');
//   const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
//   const [alertOnOk, setAlertOnOk] = useState<(() => void) | null>(null);

//   const showCustomAlert = (title: string, msg: string, type: 'success' | 'error' | 'info' = 'success', onOk?: () => void) => {
//     setAlertTitle(title); setAlertMsg(msg); setAlertType(type); setAlertOnOk(() => onOk || null); setAlertVisible(true);
//   };
//   const closeCustomAlert = () => { setAlertVisible(false); if (alertOnOk) alertOnOk(); };

//   const loadTickets = useCallback(async (forceRefresh = false) => {
//     try {
//       const stored = await AsyncStorage.getItem('fms_user');
//       if (stored) {
//         const userData = JSON.parse(stored);
//         setUser(userData);
//         await fetchTickets(userData.name, filter, forceRefresh);
//       } else {
//         router.replace('/login');
//       }
//     } catch (e) {}
//   }, [filter, fetchTickets]);

//   useFocusEffect(useCallback(() => { loadTickets(false); setShowRaiseModal(false); }, [loadTickets]));

//   const handleLogout = async () => { clearCache(); await AsyncStorage.removeItem('fms_user'); router.replace('/login'); };

//   const filteredTickets = tickets.filter(
//     (t) => String(t.ticketId).toLowerCase().includes(searchQuery.toLowerCase()) || String(t.issue).toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   const getActions = (t: any): ActionKind[] => {
//     if (!user) return [];
//     const me = clean(user.name);
//     const isPc = clean(t.pc) === me;
//     const isSolver = clean(t.solver) === me;
//     const isRaiser = clean(t.raiser) === me;
//     const s1 = clean(t.status1), s2 = clean(t.status2), s3 = clean(t.status3);

//     const list: ActionKind[] = [];
//     if (isPc && s1 !== 'done') list.push('accept', 'reject');
//     if (isSolver && s1 === 'done' && s2 !== 'solved') list.push('solve', 'revise');
//     if (isPc && s2 === 'solved' && s3 !== 'verified') list.push('verify');
//     if (isRaiser && s3 === 'verified') list.push('close', 'reraise');
//     return list;
//   };

//   const openAction = (t: any, kind: ActionKind) => {
//     // ✅ FIX: Revise + Reraise dono pe 3-revision limit
//     if ((kind === 'revise' || kind === 'reraise') && (parseInt(t.reviseCount, 10) || 0) >= 3) {
//       showCustomAlert('Limit Reached', 'Maximum 3 revisions allowed.', 'error');
//       return;
//     }

//     // ✅ FIX: Revise sirf planned date ke baad allowed
//     if (kind === 'revise') {
//       const lastDate = parseAppDate(t.reviseDate || t.plannedDate);
//       if (lastDate) {
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
//         if (today < lastDay) {
//           showCustomAlert(
//             'Not Allowed',
//             `Revision is only allowed on or after the planned date: ${t.reviseDate || t.plannedDate}`,
//             'error'
//           );
//           return;
//         }
//       }
//     }

//     setActionTicket(t); setActionKind(kind); setRemark(''); setActionDate(null); setRating(0); setFiles([]); submitLock.current = false;
//   };
//   const closeAction = () => { setActionTicket(null); setActionKind(null); };

//   const pickProof = async () => {
//     if (files.length >= 3) { showCustomAlert('Limit', 'Maximum 3 images allowed.', 'info'); return; }
//     const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 - files.length, base64: true, quality: 0.5 });
//     if (result.canceled) return;
//     const picked: AttachedFile[] = result.assets.filter((a) => !!a.base64).map((a, i) => ({ uri: a.uri, data: a.base64 as string, type: a.mimeType || 'image/jpeg', name: a.fileName || `proof_${Date.now()}_${i}.jpg` }));
//     setFiles((prev) => [...prev, ...picked].slice(0, 3));
//   };

//   const fmtDate = (d: Date | null) => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';

//   const submitAction = async () => {
//     if (!actionTicket || !actionKind || submitLock.current) return;
//     const ticketId = actionTicket.ticketId;
//     let actionType: 'step2' | 'step3' | 'step4' | 'step5' = 'step2';
//     let payload: any = { ticketId };

//     switch (actionKind) {
//       case 'accept': if (!actionDate) return showCustomAlert('Required', 'Please select planned date.', 'error'); actionType = 'step2'; payload = { ticketId, status: 'Done', remark: remark.trim(), nextDate: fmtDate(actionDate) }; break;
//       case 'reject': if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark for rejection.', 'error'); actionType = 'step2'; payload = { ticketId, status: 'Reject', remark: remark.trim(), nextDate: '' }; break;
//       case 'solve': actionType = 'step3'; payload = { ticketId, subAction: 'solve', remark: remark.trim(), files: files.map((f) => ({ data: f.data, type: f.type, name: f.name })) }; break;
//       case 'revise': if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error'); if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark.', 'error'); actionType = 'step3'; payload = { ticketId, subAction: 'revise', remark: remark.trim(), reviseDate: fmtDate(actionDate) }; break;
//       case 'verify': actionType = 'step4'; payload = { ticketId, remark: remark.trim() }; break;
//       case 'close': if (!rating) return showCustomAlert('Required', 'Please give a rating.', 'error'); actionType = 'step5'; payload = { ticketId, subAction: 'close', rating }; break;
//       case 'reraise': if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error'); actionType = 'step5'; payload = { ticketId, subAction: 'reraise', reraiseDate: fmtDate(actionDate) }; break;
//       default: return;
//     }

//     submitLock.current = true; setSubmitting(true);
//     try {
//       const res = await api.submitAction(actionType, payload);
//       if (res && res.success) {
//         clearCache();
//         showCustomAlert('Success!', `${ACTION_META[actionKind].label} completed successfully.`, 'success', () => { closeAction(); loadTickets(true); });
//       } else { submitLock.current = false; showCustomAlert('Error', res?.message || 'Action failed', 'error'); }
//     } catch (e) { submitLock.current = false; showCustomAlert('Error', 'Network error.', 'error'); } finally { setSubmitting(false); }
//   };

//   const renderTicket = (item: any) => {
//     const actions = getActions(item);
//     const isHighPriority = clean(item.priority) === 'high';
//     const isExpanded = expandedIssues[item.ticketId];

//     return (
//       <View style={[styles.ticketCard, isHighPriority && styles.ticketCardHigh]}>
//         <View style={styles.ticketHeader}>
//           <View style={styles.idContainer}>
//             <View style={styles.iconBox}><Ionicons name="ticket" size={14} color={Theme.colors.primary} /></View>
//             <Text style={styles.ticketId}>{item.ticketId}</Text>
//           </View>
//         </View>

//         <View style={styles.issueWrapper}>
//           <Text style={styles.ticketIssue} numberOfLines={isExpanded ? undefined : 3}>
//             {item.issue}
//           </Text>
//           {item.issue && item.issue.length > 100 && (
//             <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedIssues(p => ({ ...p, [item.ticketId]: !p[item.ticketId] }))}>
//               <Text style={styles.readMoreText}>{isExpanded ? 'Show Less' : 'Read More...'}</Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         <LiveTimeLeft ticket={item} user={user} />

//         <View style={styles.metaRow}>
//           <View style={[styles.chip, isHighPriority ? styles.chipHigh : styles.chipNormal]}>
//             <Ionicons name="alert-circle" size={12} color={isHighPriority ? '#DC2626' : '#059669'} />
//             <Text style={[styles.chipText, { color: isHighPriority ? '#DC2626' : '#059669' }]}> {item.priority || 'Normal'}</Text>
//           </View>
//           <View style={styles.chip}><Ionicons name="location" size={12} color={Theme.colors.textMuted} /><Text style={styles.chipText}> {item.location}</Text></View>
//           {!!item.desiredDate && <View style={styles.chip}><Ionicons name="calendar" size={12} color={Theme.colors.textMuted} /><Text style={styles.chipText}> {item.desiredDate}</Text></View>}
//         </View>

//         <View style={styles.peopleGrid}>
//           <View style={styles.personBox}><Text style={styles.personLabel}>Raiser</Text><Text style={styles.personName}>{item.raiser}</Text></View>
//           <View style={styles.personDivider} />
//           <View style={styles.personBox}><Text style={styles.personLabel}>PC</Text><Text style={styles.personName}>{item.pc}</Text></View>
//           <View style={styles.personDivider} />
//           <View style={styles.personBox}><Text style={styles.personLabel}>Solver</Text><Text style={styles.personName}>{item.solver}</Text></View>
//         </View>

//         <View style={styles.dateGrid}>
//           <View style={styles.dateCol}><Text style={styles.dateLabel}>PLANNED</Text><Text style={styles.dateValue}>{item.plannedDate || '-'}</Text></View>
//           <View style={styles.dateCol}><Text style={styles.dateLabel}>REVISED</Text><Text style={styles.dateValue}>{item.reviseDate || '-'}</Text></View>
//         </View>
//         <View style={[styles.dateGrid, { marginTop: 10, marginBottom: 16 }]}>
//           <View style={styles.dateCol}><Text style={styles.dateLabel}>REV. COUNT</Text><Text style={styles.dateValue}>{item.reviseCount || '0'}</Text></View>
//         </View>

//         {!!item.remark1 && (
//           <View style={[styles.remarkBox, { backgroundColor: '#F8FAFC', borderLeftColor: '#94A3B8' }]}>
//             <Text style={styles.remarkLabel}>PC Remark (Accept/Reject)</Text><Text style={[styles.remarkText, { color: Theme.colors.text }]}>💬 {item.remark1}</Text>
//           </View>
//         )}
//         {!!item.remark2 && (
//           <View style={[styles.remarkBox, { backgroundColor: clean(item.status2).includes('revision') || clean(item.status2).includes('pending') ? '#FFF7ED' : '#FFFBEB', borderLeftColor: '#F59E0B' }]}>
//             <Text style={[styles.remarkLabel, { color: '#B45309' }]}>{(clean(item.status2).includes('revision') || clean(item.status2).includes('pending')) ? '⚠️ Solver Revision Remark' : 'Solver Remark (Solve)'}</Text>
//             <Text style={[styles.remarkText, { color: '#92400E' }]}>💬 {item.remark2}</Text>
//           </View>
//         )}
//         {!!item.remark3 && (
//           <View style={[styles.remarkBox, { backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }]}>
//             <Text style={[styles.remarkLabel, { color: '#1D4ED8' }]}>PC Verify Remark</Text><Text style={[styles.remarkText, { color: '#1E40AF' }]}>💬 {item.remark3}</Text>
//           </View>
//         )}

//         {actions.length > 0 && (
//           <View style={styles.actionRow}>
//             {actions.map((a) => (
//               <TouchableOpacity key={a} style={[styles.actionBtn, { backgroundColor: ACTION_META[a].color }]} onPress={() => openAction(item, a)} activeOpacity={0.8}>
//                 <Ionicons name={ACTION_META[a].icon} size={16} color="#FFFFFF" />
//                 <Text style={styles.actionBtnText}>{ACTION_META[a].label}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         )}
//       </View>
//     );
//   };

//   const kind = actionKind;
//   const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
//   const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
//   const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <View style={styles.appBar}>
//         <View style={styles.appBarLeft}>
//           <Ionicons name="construct" size={22} color={Theme.colors.primary} />
//           <Text style={styles.appBarTitle}>Help Ticket</Text>
//         </View>
//         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//           <TouchableOpacity style={[styles.logoutBtn, { marginRight: 12 }]} onPress={() => loadTickets(true)}>
//             <Ionicons name="refresh" size={22} color={Theme.colors.primary} />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
//             <Ionicons name="log-out-outline" size={22} color={Theme.colors.error} />
//           </TouchableOpacity>
//         </View>
//       </View>

//       <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
//         <View style={styles.webWrapper}>
//           <View style={styles.welcomeSection}>
//             <View style={styles.welcomeText}>
//               <Text style={styles.greeting}>Welcome back,</Text>
//               <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
//             </View>
//             <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name ? user.name.charAt(0) : 'U'}</Text></View>
//           </View>

//           <View style={styles.statsRow}>
//             <View style={[styles.statBox, { borderTopColor: '#F59E0B' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekRaised}</Text><Text style={styles.statLabel}>Week Raised</Text></View>
//             <View style={[styles.statBox, { borderTopColor: '#3B82F6' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.monthRaised}</Text><Text style={styles.statLabel}>Month Raised</Text></View>
//             <View style={[styles.statBox, { borderTopColor: '#10B981' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekSolved}</Text><Text style={styles.statLabel}>Week Solved</Text></View>
//             <View style={[styles.statBox, { borderTopColor: '#8B5CF6' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.monthSolved}</Text><Text style={styles.statLabel}>Month Solved</Text></View>
//             <View style={[styles.statBox, { borderTopColor: '#EC4899' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekTarget && stats.weekTarget !== '-' ? stats.weekTarget : '-'}</Text><Text style={styles.statLabel}>Week Target</Text></View>
//           </View>

//           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll} contentContainerStyle={styles.segmentScrollContent}>
//             {(['action', 'raised', 'assigned', 'revised'] as const).map((f) => (
//               <TouchableOpacity key={f} style={[styles.segmentTab, filter === f && styles.segmentActive]} onPress={() => { if (f === filter) return; setSearchQuery(''); setFilter(f); if (user?.name) fetchTickets(user.name, f, f === 'revised'); }}>
//                 <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]} numberOfLines={1}>
//                   {f === 'action' ? 'My Actions' : f === 'raised' ? 'Raised' : f === 'assigned' ? 'Assigned' : 'Revised'} ({counts[f as keyof typeof counts] || 0})
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </ScrollView>

//           <View style={styles.searchContainer}>
//             <Ionicons name="search" size={18} color={Theme.colors.textMuted} style={styles.searchIcon} />
//             <TextInput style={styles.searchInput} placeholder="Search by ID or Issue..." placeholderTextColor={Theme.colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
//           </View>

//           {loading ? (
//             <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
//           ) : filteredTickets.length === 0 ? (
//             <View style={styles.emptyState}>
//               <Ionicons name="checkmark-done-circle-outline" size={60} color={Theme.colors.borderDark} />
//               <Text style={styles.emptyText}>No tickets found.</Text>
//             </View>
//           ) : (
//             <View style={styles.gridContainer}>
//               {filteredTickets.map((t) => (
//                 <View key={t.ticketId} style={[styles.gridItem, { width: getColumnWidth() }]}>{renderTicket(t)}</View>
//               ))}
//             </View>
//           )}
//         </View>
//       </ScrollView>

//       <TouchableOpacity style={styles.fab} onPress={() => { if (isLargeScreen) setShowRaiseModal(true); else router.push('/raise-ticket'); }} activeOpacity={0.8}>
//         <Ionicons name="add" size={28} color="#FFFFFF" />
//       </TouchableOpacity>

//       {isLargeScreen && (
//         <Modal visible={showRaiseModal} transparent animationType="fade" onRequestClose={() => setShowRaiseModal(false)}>
//           <View style={styles.blurOverlay}>
//             <View style={styles.raiseModalCard}>
//               <TouchableOpacity style={styles.closeRaiseBtn} onPress={() => setShowRaiseModal(false)}>
//                 <Ionicons name="close" size={24} color={Theme.colors.text} />
//               </TouchableOpacity>
//               <View style={{ flex: 1 }}>
//                 <RaiseTicketScreen onClose={(shouldRefresh) => { setShowRaiseModal(false); if (shouldRefresh) loadTickets(true); }} />
//               </View>
//             </View>
//           </View>
//         </Modal>
//       )}

//       <Modal visible={!!kind} transparent animationType="fade" onRequestClose={closeAction}>
//         <View style={styles.overlay}>
//           <View style={styles.modalCard}>
//             {kind && (
//               <ScrollView keyboardShouldPersistTaps="handled">
//                 <View style={styles.modalHead}>
//                   <Text style={styles.modalTitle}>{ACTION_META[kind].title}</Text>
//                   <TouchableOpacity onPress={closeAction}><Ionicons name="close" size={24} color={Theme.colors.text} /></TouchableOpacity>
//                 </View>
//                 <Text style={styles.modalSub}>{actionTicket?.ticketId}</Text>

//                 {(kind === 'accept' || kind === 'revise' || kind === 'reraise') && (
//                   <View style={styles.fieldGroup}>
//                     <Text style={styles.fieldLabel}>{kind === 'accept' ? 'PLANNED DATE *' : 'NEW DATE *'}</Text>
//                     <DateField value={actionDate} onChange={setActionDate} minToday />
//                   </View>
//                 )}

//                 {kind === 'close' && (
//                   <View style={styles.fieldGroup}>
//                     <Text style={styles.fieldLabel}>RATING *</Text>
//                     <View style={{ flexDirection: 'row' }}>
//                       {[1, 2, 3, 4, 5].map((n) => (<TouchableOpacity key={n} onPress={() => setRating(n)} style={{ marginRight: 8 }}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color="#F59E0B" /></TouchableOpacity>))}
//                     </View>
//                   </View>
//                 )}

//                 {kind !== 'close' && kind !== 'reraise' && (
//                   <View style={styles.fieldGroup}>
//                     <Text style={styles.fieldLabel}>REMARK {kind === 'reject' || kind === 'revise' ? '*' : '(OPTIONAL)'}</Text>
//                     <TextInput style={styles.remarkInput} placeholder="Write remark..." placeholderTextColor={Theme.colors.textMuted} multiline value={remark} onChangeText={setRemark} />
//                   </View>
//                 )}

//                 {kind === 'solve' && (
//                   <View style={styles.fieldGroup}>
//                     <Text style={styles.fieldLabel}>PROOF IMAGES (OPTIONAL, MAX 3)</Text>
//                     <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
//                       {files.map((f, i) => (
//                         <View key={i} style={styles.thumbWrap}>
//                           <Image source={{ uri: f.uri }} style={styles.thumb} />
//                           <TouchableOpacity style={styles.thumbRemove} onPress={() => setFiles((p) => p.filter((_, x) => x !== i))}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
//                         </View>
//                       ))}
//                       {files.length < 3 && (<TouchableOpacity style={styles.addImgBtn} onPress={pickProof}><Ionicons name="image-outline" size={24} color={Theme.colors.primary} /><Text style={styles.addImgText}>Add</Text></TouchableOpacity>)}
//                     </View>
//                   </View>
//                 )}

//                 <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: ACTION_META[kind].color }, submitting && { opacity: 0.7 }]} onPress={submitAction} disabled={submitting} activeOpacity={0.8}>
//                   {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>{ACTION_META[kind].label}</Text>}
//                 </TouchableOpacity>
//               </ScrollView>
//             )}
//           </View>
//         </View>
//       </Modal>

//       <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
//         <View style={styles.alertOverlay}>
//           <View style={styles.alertCard}>
//             <View style={[styles.alertIconCircle, { backgroundColor: alertBg }]}><Ionicons name={alertIcon as any} size={42} color={alertColor} /></View>
//             <Text style={styles.alertTitle}>{alertTitle}</Text><Text style={styles.alertMessage}>{alertMsg}</Text>
//             <TouchableOpacity style={[styles.alertOkBtn, { backgroundColor: alertColor }]} onPress={closeCustomAlert} activeOpacity={0.85}><Text style={styles.alertOkText}>OK</Text></TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
//   container: { flex: 1, backgroundColor: Theme.colors.background },
//   webWrapper: { flex: 1, width: '100%', padding: Platform.OS === 'web' ? 24 : 16 },
//   appBar: { backgroundColor: Theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, paddingTop: Platform.OS === 'android' ? 40 : 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
//   appBarLeft: { flexDirection: 'row', alignItems: 'center' },
//   appBarTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: '800', marginLeft: 8 },
//   logoutBtn: { padding: 4 },
//   welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
//   welcomeText: { flex: 1, paddingRight: 10 },
//   greeting: { fontSize: 13, color: Theme.colors.textMuted, marginBottom: 2 },
//   userName: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
//   avatar: { width: 44, height: 44, backgroundColor: Theme.colors.primaryLight, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
//   avatarText: { fontSize: 18, fontWeight: '700', color: Theme.colors.primary },

//   statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -4 },
//   statBox: { width: Platform.OS !== 'web' ? '47%' : undefined, flex: Platform.OS === 'web' ? 1 : undefined, minWidth: Platform.OS === 'web' ? 0 : undefined, marginHorizontal: 4, marginBottom: Platform.OS !== 'web' ? 8 : 0, backgroundColor: Theme.colors.surface, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, borderTopWidth: 4, alignItems: 'center', elevation: 1 },
//   statNum: { fontSize: 22, fontWeight: '800', color: Theme.colors.text, marginBottom: 4 },
//   statLabel: { fontSize: 11, fontWeight: '600', color: Theme.colors.textMuted, textAlign: 'center' },

//   segmentScroll: { marginBottom: 20 },
//   segmentScrollContent: { flexDirection: 'row', backgroundColor: '#E2E8F0', padding: 4, borderRadius: 12, minWidth: '100%' },
//   segmentTab: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderRadius: 10, marginRight: 4 },
//   segmentActive: { backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
//   segmentText: { fontSize: 13, fontWeight: '600', color: Theme.colors.textMuted },
//   segmentTextActive: { color: Theme.colors.primary, fontWeight: '700' },

//   searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, height: 48, marginBottom: 20, paddingHorizontal: 14 },
//   searchIcon: { marginRight: 10 },
//   searchInput: { flex: 1, fontSize: 15, color: Theme.colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as any,
//   gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
//   gridItem: { paddingHorizontal: 6 },
//   ticketCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: Theme.colors.primary, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
//   ticketCardHigh: { borderLeftColor: '#EF4444' },
//   ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
//   idContainer: { flexDirection: 'row', alignItems: 'center' },
//   iconBox: { backgroundColor: '#F1F5F9', padding: 6, borderRadius: 8, marginRight: 8 },
//   ticketId: { fontSize: 13, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },

//   issueWrapper: { marginBottom: 12 },
//   ticketIssue: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, lineHeight: 22 },
//   readMoreText: { color: Theme.colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },

//   timeLeftBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#CFFAFE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: '#A5F3FC' },
//   timeLeftBarOverdue: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
//   timeLeftText: { fontSize: 13, fontWeight: '700', color: '#0E7490' },
//   timeLeftTextOverdue: { color: '#B91C1C' },

//   metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
//   chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9' },
//   chipHigh: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
//   chipNormal: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
//   chipText: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginLeft: 2 },
//   peopleGrid: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
//   personBox: { flex: 1, paddingHorizontal: 2 },
//   personLabel: { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '600', marginBottom: 2 },
//   personName: { fontSize: 12, color: Theme.colors.text, fontWeight: '700' },
//   personDivider: { width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 6 },

//   dateGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
//   dateCol: { flex: 1 },
//   dateLabel: { fontSize: 10, color: Theme.colors.textMuted, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
//   dateValue: { fontSize: 13, color: Theme.colors.text, fontWeight: '700' },

//   statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
//   statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 6, marginBottom: 4 },
//   statusChipText: { fontSize: 11, fontWeight: '700' },
//   remarkLabel: { fontSize: 11, fontWeight: '800', color: Theme.colors.textMuted, marginBottom: 4, letterSpacing: 0.3 },
//   remarkBox: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
//   remarkText: { fontSize: 13, color: '#92400E', fontWeight: '500', fontStyle: 'italic' },
//   actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
//   actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
//   actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6, letterSpacing: 0.3 },
//   emptyState: { alignItems: 'center', marginTop: 40 },
//   emptyText: { marginTop: 12, fontSize: 15, color: Theme.colors.textMuted, fontWeight: '500' },
//   fab: { position: 'absolute', bottom: 25, right: 20, backgroundColor: Theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
//   overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
//   modalCard: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
//   modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   modalTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
//   modalSub: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginTop: 2, marginBottom: 16 },
//   fieldGroup: { marginBottom: 16 },
//   fieldLabel: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
//   inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50 },
//   remarkInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, height: 90, fontSize: 15, color: Theme.colors.text, textAlignVertical: 'top' },
//   thumbWrap: { width: 70, height: 70, marginRight: 10, marginBottom: 10 },
//   thumb: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border },
//   thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 10 },
//   addImgBtn: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
//   addImgText: { fontSize: 12, color: Theme.colors.primary, fontWeight: '600', marginTop: 2 },
//   confirmBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
//   confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
//   blurOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(5px)' } as any : {}) },
//   raiseModalCard: { width: '100%', maxWidth: 650, height: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, position: 'relative' },
//   closeRaiseBtn: { position: 'absolute', top: 15, right: 15, zIndex: 999, backgroundColor: '#F1F5F9', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
//   alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
//   alertCard: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
//   alertIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
//   alertTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, marginBottom: 8, textAlign: 'center' },
//   alertMessage: { fontSize: 15, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
//   alertOkBtn: { width: '100%', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
//   alertOkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }
// });









import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView,
  Platform, TextInput, ScrollView, useWindowDimensions, Modal, Image, Linking
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../constants/theme';
import { api } from '../services/api';
import { useTickets } from '../context/TicketContext';
import RaiseTicketScreen from './raise-ticket';

type ActionKind = 'accept' | 'reject' | 'solve' | 'revise' | 'verify' | 'close' | 'reraise';
type AttachedFile = { uri: string; data: string; type: string; name: string };

const clean = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ACTION_META: Record<ActionKind, { label: string; icon: any; color: string; title: string }> = {
  accept:  { label: 'Accept',  icon: 'checkmark-circle-outline', color: '#10B981', title: 'Accept Ticket' },
  reject:  { label: 'Reject',  icon: 'close-circle-outline',     color: '#EF4444', title: 'Reject Ticket' },
  solve:   { label: 'Solve',   icon: 'construct-outline',        color: '#10B981', title: 'Mark as Solved' },
  revise:  { label: 'Revise',  icon: 'time-outline',             color: '#F59E0B', title: 'Revise Date' },
  verify:  { label: 'Verify',  icon: 'shield-checkmark-outline', color: '#3B82F6', title: 'Verify Solution' },
  close:   { label: 'Close',   icon: 'lock-closed-outline',      color: '#10B981', title: 'Close Ticket' },
  reraise: { label: 'Reraise', icon: 'refresh-outline',          color: '#EF4444', title: 'Reraise Ticket' },
};

// ========================================================
// ✅ EXACT PREVIOUS HELPERS (No Sheet Logic)
// ========================================================
function parseAppDate(val: any): Date | null {
  if (!val) return null;
  const str = String(val).trim().replace(/\u00a0/g, ' ');
  if (!str || str === '-') return null;
  const m = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  let day = parseInt(m[1], 10);
  let month = parseInt(m[2], 10) - 1;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const h = m[4] ? parseInt(m[4], 10) : 23;
  const min = m[5] ? parseInt(m[5], 10) : 59;
  const s = m[6] ? parseInt(m[6], 10) : 59;
  const d = new Date(year, month, day, h, min, s);
  return isNaN(d.getTime()) ? null : d;
}

function getTimeLeft(plannedDate?: string, desiredDate?: string, reviseDate?: string) {
  const target =
    parseAppDate(reviseDate) ||
    parseAppDate(plannedDate) ||
    parseAppDate(desiredDate);

  if (!target) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;

  const absMins = Math.floor(Math.abs(diffMs) / 60000);
  const totalHours = Math.floor(absMins / 60);
  const mins = absMins % 60;

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  // ✅ Days + Hours:Minutes  (jaise pehle dikhna chahiye)
  // Example: 30d 8:18   |   2d 8:18   |   0d 5:12 → 5:12
  let text = '';
  if (days > 0) {
    text = `${overdue ? '-' : ''}${days}d ${hours}:${String(mins).padStart(2, '0')}`;
  } else {
    text = `${overdue ? '-' : ''}${hours}:${String(mins).padStart(2, '0')}`;
  }

  return { text, overdue };
}

function parseImageUrls(raw: any): string[] {
  if (!raw) return [];
  return String(raw).split(',').map((s) => s.trim()).filter((u) => u.startsWith('http'));
}

// ========================================================

function DateField({ value, onChange, minToday }: { value: Date | null; onChange: (d: Date | null) => void; minToday?: boolean }) {
  const [show, setShow] = useState(false);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const toInput = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.inputBox}>
        <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
        <input type="date" style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer', color: value ? Theme.colors.text : Theme.colors.textMuted }} value={toInput(value)} onChange={(e) => { if (e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); onChange(new Date(y, m - 1, d)); } else onChange(null); }} />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.inputBox} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={{ fontSize: 15, fontWeight: value ? '600' : '400', color: value ? Theme.colors.text : Theme.colors.textMuted }}>{value ? fmt(value) : 'Select Date'}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={minToday ? new Date() : undefined} onChange={(e: any, d?: Date) => { if (Platform.OS === 'android') setShow(false); if (d) onChange(d); }} />
      )}
    </>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const getColumnWidth = () => { if (width >= 1200) return '25%'; if (width >= 768) return '33.33%'; return '100%'; };
  const isLargeScreen = width >= 768;

  const [user, setUser] = useState<any>(null);
  const { tickets, counts, stats, loading, fetchTickets, clearCache } = useTickets();
  const [filter, setFilter] = useState('action');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  const [actionTicket, setActionTicket] = useState<any>(null);
  const [actionKind, setActionKind] = useState<ActionKind | null>(null);
  const [remark, setRemark] = useState('');
  const [actionDate, setActionDate] = useState<Date | null>(null);
  const [rating, setRating] = useState(0);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
  const [alertOnOk, setAlertOnOk] = useState<(() => void) | null>(null);

  const showCustomAlert = (title: string, msg: string, type: 'success' | 'error' | 'info' = 'success', onOk?: () => void) => {
    setAlertTitle(title); setAlertMsg(msg); setAlertType(type); setAlertOnOk(() => onOk || null); setAlertVisible(true);
  };
  const closeCustomAlert = () => { setAlertVisible(false); if (alertOnOk) alertOnOk(); };

  const loadTickets = useCallback(async (forceRefresh = false) => {
    try {
      const stored = await AsyncStorage.getItem('fms_user');
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
        await fetchTickets(userData.name, filter, forceRefresh);
      } else {
        router.replace('/login');
      }
    } catch (e) {}
  }, [filter, fetchTickets]);

  useFocusEffect(useCallback(() => { loadTickets(false); setShowRaiseModal(false); }, [loadTickets]));

  const handleLogout = async () => { clearCache(); await AsyncStorage.removeItem('fms_user'); router.replace('/login'); };

  const filteredTickets = tickets.filter(
    (t) => String(t.ticketId).toLowerCase().includes(searchQuery.toLowerCase()) || String(t.issue).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActions = (t: any): ActionKind[] => {
    if (!user) return [];
    const me = clean(user.name);
    const isPc = clean(t.pc) === me;
    const isSolver = clean(t.solver) === me;
    const isRaiser = clean(t.raiser) === me;
    const s1 = clean(t.status1), s2 = clean(t.status2), s3 = clean(t.status3);

    const list: ActionKind[] = [];
    if (isPc && s1 !== 'done') list.push('accept', 'reject');
    if (isSolver && s1 === 'done' && s2 !== 'solved') list.push('solve', 'revise');
    if (isPc && s2 === 'solved' && s3 !== 'verified') list.push('verify');
    if (isRaiser && s3 === 'verified') list.push('close', 'reraise');
    return list;
  };

  const openAction = (t: any, kind: ActionKind) => {
    if (kind === 'revise' && (parseInt(t.reviseCount, 10) || 0) >= 3) { showCustomAlert('Limit Reached', 'Maximum 3 revisions allowed.', 'error'); return; }
    setActionTicket(t); setActionKind(kind); setRemark(''); setActionDate(null); setRating(0); setFiles([]); submitLock.current = false;
  };
  const closeAction = () => { setActionTicket(null); setActionKind(null); };

  const pickProof = async () => {
    if (files.length >= 3) { showCustomAlert('Limit', 'Maximum 3 images allowed.', 'info'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 - files.length, base64: true, quality: 0.5 });
    if (result.canceled) return;
    const picked: AttachedFile[] = result.assets.filter((a) => !!a.base64).map((a, i) => ({ uri: a.uri, data: a.base64 as string, type: a.mimeType || 'image/jpeg', name: a.fileName || `proof_${Date.now()}_${i}.jpg` }));
    setFiles((prev) => [...prev, ...picked].slice(0, 3));
  };

  const fmtDate = (d: Date | null) => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';

  const submitAction = async () => {
    if (!actionTicket || !actionKind || submitLock.current) return;
    const ticketId = actionTicket.ticketId;
    let actionType: 'step2' | 'step3' | 'step4' | 'step5' = 'step2';
    let payload: any = { ticketId };

    switch (actionKind) {
      case 'accept': if (!actionDate) return showCustomAlert('Required', 'Please select planned date.', 'error'); actionType = 'step2'; payload = { ticketId, status: 'Done', remark: remark.trim(), nextDate: fmtDate(actionDate) }; break;
      case 'reject': if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark for rejection.', 'error'); actionType = 'step2'; payload = { ticketId, status: 'Reject', remark: remark.trim(), nextDate: '' }; break;
      case 'solve': actionType = 'step3'; payload = { ticketId, subAction: 'solve', remark: remark.trim(), files: files.map((f) => ({ data: f.data, type: f.type, name: f.name })) }; break;
      case 'revise': if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error'); if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark.', 'error'); actionType = 'step3'; payload = { ticketId, subAction: 'revise', remark: remark.trim(), reviseDate: fmtDate(actionDate) }; break;
      case 'verify': actionType = 'step4'; payload = { ticketId, remark: remark.trim() }; break;
      case 'close': if (!rating) return showCustomAlert('Required', 'Please give a rating.', 'error'); actionType = 'step5'; payload = { ticketId, subAction: 'close', rating }; break;
      case 'reraise': if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error'); actionType = 'step5'; payload = { ticketId, subAction: 'reraise', reraiseDate: fmtDate(actionDate) }; break;
      default: return;
    }

    submitLock.current = true; setSubmitting(true);
    try {
      const res = await api.submitAction(actionType, payload);
      if (res && res.success) {
        clearCache();
        showCustomAlert('Success!', `${ACTION_META[actionKind].label} completed successfully.`, 'success', () => { closeAction(); loadTickets(true); });
      } else { submitLock.current = false; showCustomAlert('Error', res?.message || 'Action failed', 'error'); }
    } catch (e) { submitLock.current = false; showCustomAlert('Error', 'Network error.', 'error'); } finally { setSubmitting(false); }
  };

  const renderTicket = (item: any) => {
    const actions = getActions(item);
    const isHighPriority = clean(item.priority) === 'high';
    const isExpanded = expandedIssues[item.ticketId];

    const attachedUrls = parseImageUrls(item.image);
    const proofUrls = parseImageUrls(item.proof);

    return (
      <View style={[styles.ticketCard, isHighPriority && styles.ticketCardHigh]}>
        <View style={styles.ticketHeader}>
          <View style={styles.idContainer}>
            <View style={styles.iconBox}><Ionicons name="ticket" size={14} color={Theme.colors.primary} /></View>
            <Text style={styles.ticketId}>{item.ticketId}</Text>
          </View>
        </View>

        <View style={styles.issueWrapper}>
          <Text style={styles.ticketIssue} numberOfLines={isExpanded ? undefined : 3}>
            {item.issue}
          </Text>
          {item.issue && item.issue.length > 100 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setExpandedIssues(p => ({ ...p, [item.ticketId]: !p[item.ticketId] }))}>
              <Text style={styles.readMoreText}>{isExpanded ? 'Show Less' : 'Read More...'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ VIEW FILE BUTTONS */}
        {attachedUrls.length > 0 && (
          <View style={styles.attachmentRow}>
            {attachedUrls.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.attachmentBtn}
                activeOpacity={0.7}
                onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url).catch(() => {})}
              >
                <Ionicons name="link-outline" size={14} color="#1D4ED8" />
                <Text style={styles.attachmentBtnText}>View File {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ✅ TIME LEFT BAR (Original Logic) */}
        {(() => {
          const tl = getTimeLeft(item.plannedDate, item.desiredDate, item.reviseDate);
          if (!tl) return null;
          return (
            <View style={[styles.timeLeftBar, tl.overdue && styles.timeLeftBarOverdue]}>
              <Ionicons name="time-outline" size={16} color={tl.overdue ? '#B91C1C' : '#0E7490'} style={{ marginRight: 6 }} />
              <Text style={[styles.timeLeftText, tl.overdue && styles.timeLeftTextOverdue]}>
                Time Left: {tl.text}
              </Text>
            </View>
          );
        })()}

        <View style={styles.metaRow}>
          <View style={[styles.chip, isHighPriority ? styles.chipHigh : styles.chipNormal]}>
            <Ionicons name="alert-circle" size={12} color={isHighPriority ? '#DC2626' : '#059669'} />
            <Text style={[styles.chipText, { color: isHighPriority ? '#DC2626' : '#059669' }]}> {item.priority || 'Normal'}</Text>
          </View>
          <View style={styles.chip}><Ionicons name="location" size={12} color={Theme.colors.textMuted} /><Text style={styles.chipText}> {item.location}</Text></View>
          {!!item.desiredDate && <View style={styles.chip}><Ionicons name="calendar" size={12} color={Theme.colors.textMuted} /><Text style={styles.chipText}> {item.desiredDate}</Text></View>}
        </View>

        <View style={styles.peopleGrid}>
          <View style={styles.personBox}><Text style={styles.personLabel}>Raiser</Text><Text style={styles.personName}>{item.raiser}</Text></View>
          <View style={styles.personDivider} />
          <View style={styles.personBox}><Text style={styles.personLabel}>PC</Text><Text style={styles.personName}>{item.pc}</Text></View>
          <View style={styles.personDivider} />
          <View style={styles.personBox}><Text style={styles.personLabel}>Solver</Text><Text style={styles.personName}>{item.solver}</Text></View>
        </View>

        <View style={styles.dateGrid}>
          <View style={styles.dateCol}><Text style={styles.dateLabel}>PLANNED</Text><Text style={styles.dateValue}>{item.plannedDate || '-'}</Text></View>
          <View style={styles.dateCol}><Text style={styles.dateLabel}>REVISED</Text><Text style={styles.dateValue}>{item.reviseDate || '-'}</Text></View>
        </View>
        <View style={[styles.dateGrid, { marginTop: 10, marginBottom: 16 }]}>
          <View style={styles.dateCol}><Text style={styles.dateLabel}>REV. COUNT</Text><Text style={styles.dateValue}>{item.reviseCount || '0'}</Text></View>
        </View>

        <View style={styles.statusRow}>
          {!!item.status1 && (
            <View style={[styles.statusChip, { backgroundColor: clean(item.status1) === 'done' ? '#ECFDF5' : clean(item.status1) === 'reject' ? '#FEF2F2' : '#F1F5F9' }]}>
              <Text style={[styles.statusChipText, { color: clean(item.status1) === 'done' ? '#059669' : clean(item.status1) === 'reject' ? '#DC2626' : Theme.colors.textMuted }]}>S1: {item.status1}</Text>
            </View>
          )}
          {!!item.status2 && (
            <View style={[styles.statusChip, { backgroundColor: clean(item.status2) === 'solved' ? '#ECFDF5' : clean(item.status2).includes('pending') || clean(item.status2).includes('revision') ? '#FFFBEB' : '#F1F5F9' }]}>
              <Text style={[styles.statusChipText, { color: clean(item.status2) === 'solved' ? '#059669' : clean(item.status2).includes('pending') || clean(item.status2).includes('revision') ? '#D97706' : Theme.colors.textMuted }]}>S2: {item.status2}</Text>
            </View>
          )}
          {!!item.status3 && (
            <View style={[styles.statusChip, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.statusChipText, { color: '#2563EB' }]}>S3: {item.status3}</Text></View>
          )}
          {!!item.status4 && (
            <View style={[styles.statusChip, { backgroundColor: clean(item.status4) === 'closed' ? '#ECFDF5' : '#FEF2F2' }]}><Text style={[styles.statusChipText, { color: clean(item.status4) === 'closed' ? '#059669' : '#DC2626' }]}>S4: {item.status4}</Text></View>
          )}
        </View>

        {!!item.remark1 && (
          <View style={[styles.remarkBox, { backgroundColor: '#F8FAFC', borderLeftColor: '#94A3B8' }]}>
            <Text style={styles.remarkLabel}>PC Remark (Accept/Reject)</Text><Text style={[styles.remarkText, { color: Theme.colors.text }]}>💬 {item.remark1}</Text>
          </View>
        )}

        {/* ✅ VIEW PROOF BUTTONS */}
        {proofUrls.length > 0 && (
          <View style={styles.attachmentRow}>
            {proofUrls.map((url, idx) => (
              <TouchableOpacity key={idx} style={styles.attachmentBtn} activeOpacity={0.7} onPress={() => Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url).catch(() => {})}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#1D4ED8" />
                <Text style={styles.attachmentBtnText}>View Proof {idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!item.remark2 && (
          <View style={[styles.remarkBox, { backgroundColor: clean(item.status2).includes('revision') || clean(item.status2).includes('pending') ? '#FFF7ED' : '#FFFBEB', borderLeftColor: '#F59E0B' }]}>
            <Text style={[styles.remarkLabel, { color: '#B45309' }]}>{(clean(item.status2).includes('revision') || clean(item.status2).includes('pending')) ? '⚠️ Solver Revision Remark' : 'Solver Remark (Solve)'}</Text>
            <Text style={[styles.remarkText, { color: '#92400E' }]}>💬 {item.remark2}</Text>
          </View>
        )}
        {!!item.remark3 && (
          <View style={[styles.remarkBox, { backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }]}>
            <Text style={[styles.remarkLabel, { color: '#1D4ED8' }]}>PC Verify Remark</Text><Text style={[styles.remarkText, { color: '#1E40AF' }]}>💬 {item.remark3}</Text>
          </View>
        )}

        {actions.length > 0 && (
          <View style={styles.actionRow}>
            {actions.map((a) => (
              <TouchableOpacity key={a} style={[styles.actionBtn, { backgroundColor: ACTION_META[a].color }]} onPress={() => openAction(item, a)} activeOpacity={0.8}>
                <Ionicons name={ACTION_META[a].icon} size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>{ACTION_META[a].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const kind = actionKind;
  const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
  const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
  const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <Ionicons name="construct" size={22} color={Theme.colors.primary} />
          <Text style={styles.appBarTitle}>Help Ticket</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.logoutBtn, { marginRight: 12 }]} onPress={() => loadTickets(true)}>
            <Ionicons name="refresh" size={22} color={Theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={Theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.webWrapper}>
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeText}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
            </View>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name ? user.name.charAt(0) : 'U'}</Text></View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderTopColor: '#F59E0B' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekRaised}</Text><Text style={styles.statLabel}>Week Raised</Text></View>
            <View style={[styles.statBox, { borderTopColor: '#3B82F6' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.monthRaised}</Text><Text style={styles.statLabel}>Month Raised</Text></View>
            <View style={[styles.statBox, { borderTopColor: '#10B981' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekSolved}</Text><Text style={styles.statLabel}>Week Solved</Text></View>
            <View style={[styles.statBox, { borderTopColor: '#8B5CF6' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.monthSolved}</Text><Text style={styles.statLabel}>Month Solved</Text></View>
            <View style={[styles.statBox, { borderTopColor: '#EC4899' }]}><Text style={styles.statNum} numberOfLines={1}>{stats.weekTarget ?? stats.weekTarget === 0 ? stats.weekTarget : '-'}</Text><Text style={styles.statLabel}>Week Target</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll} contentContainerStyle={styles.segmentScrollContent}>
            {(['action', 'raised', 'assigned', 'revised'] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.segmentTab, filter === f && styles.segmentActive]} onPress={() => { if (f === filter) return; setSearchQuery(''); setFilter(f); if (user?.name) fetchTickets(user.name, f, f === 'revised'); }}>
                <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]} numberOfLines={1}>
                  {f === 'action' ? 'My Actions' : f === 'raised' ? 'Raised' : f === 'assigned' ? 'Assigned' : 'Revised'} ({counts[f as keyof typeof counts] || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search by ID or Issue..." placeholderTextColor={Theme.colors.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
          ) : filteredTickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color={Theme.colors.borderDark} />
              <Text style={styles.emptyText}>No tickets found.</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredTickets.map((t) => (
                <View key={t.ticketId} style={[styles.gridItem, { width: getColumnWidth() }]}>{renderTicket(t)}</View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => { if (isLargeScreen) setShowRaiseModal(true); else router.push('/raise-ticket'); }} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {isLargeScreen && (
        <Modal visible={showRaiseModal} transparent animationType="fade" onRequestClose={() => setShowRaiseModal(false)}>
          <View style={styles.blurOverlay}>
            <View style={styles.raiseModalCard}>
              <TouchableOpacity style={styles.closeRaiseBtn} onPress={() => setShowRaiseModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <RaiseTicketScreen onClose={(shouldRefresh) => { setShowRaiseModal(false); if (shouldRefresh) loadTickets(true); }} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={!!kind} transparent animationType="fade" onRequestClose={closeAction}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {kind && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>{ACTION_META[kind].title}</Text>
                  <TouchableOpacity onPress={closeAction}><Ionicons name="close" size={24} color={Theme.colors.text} /></TouchableOpacity>
                </View>
                <Text style={styles.modalSub}>{actionTicket?.ticketId}</Text>

                {(kind === 'accept' || kind === 'revise' || kind === 'reraise') && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{kind === 'accept' ? 'PLANNED DATE *' : 'NEW DATE *'}</Text>
                    <DateField value={actionDate} onChange={setActionDate} minToday />
                  </View>
                )}

                {kind === 'close' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>RATING *</Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((n) => (<TouchableOpacity key={n} onPress={() => setRating(n)} style={{ marginRight: 8 }}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color="#F59E0B" /></TouchableOpacity>))}
                    </View>
                  </View>
                )}

                {kind !== 'close' && kind !== 'reraise' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>REMARK {kind === 'reject' || kind === 'revise' ? '*' : '(OPTIONAL)'}</Text>
                    <TextInput style={styles.remarkInput} placeholder="Write remark..." placeholderTextColor={Theme.colors.textMuted} multiline value={remark} onChangeText={setRemark} />
                  </View>
                )}

                {kind === 'solve' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>PROOF IMAGES (OPTIONAL, MAX 3)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {files.map((f, i) => (
                        <View key={i} style={styles.thumbWrap}>
                          <Image source={{ uri: f.uri }} style={styles.thumb} />
                          <TouchableOpacity style={styles.thumbRemove} onPress={() => setFiles((p) => p.filter((_, x) => x !== i))}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
                        </View>
                      ))}
                      {files.length < 3 && (<TouchableOpacity style={styles.addImgBtn} onPress={pickProof}><Ionicons name="image-outline" size={24} color={Theme.colors.primary} /><Text style={styles.addImgText}>Add</Text></TouchableOpacity>)}
                    </View>
                  </View>
                )}

                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: ACTION_META[kind].color }, submitting && { opacity: 0.7 }]} onPress={submitAction} disabled={submitting} activeOpacity={0.8}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>{ACTION_META[kind].label}</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconCircle, { backgroundColor: alertBg }]}><Ionicons name={alertIcon as any} size={42} color={alertColor} /></View>
            <Text style={styles.alertTitle}>{alertTitle}</Text><Text style={styles.alertMessage}>{alertMsg}</Text>
            <TouchableOpacity style={[styles.alertOkBtn, { backgroundColor: alertColor }]} onPress={closeCustomAlert} activeOpacity={0.85}><Text style={styles.alertOkText}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { flex: 1, backgroundColor: Theme.colors.background },
  webWrapper: { flex: 1, width: '100%', padding: Platform.OS === 'web' ? 24 : 16 },
  appBar: { backgroundColor: Theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, paddingTop: Platform.OS === 'android' ? 40 : 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  logoutBtn: { padding: 4 },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border },
  welcomeText: { flex: 1, paddingRight: 10 },
  greeting: { fontSize: 13, color: Theme.colors.textMuted, marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  avatar: { width: 44, height: 44, backgroundColor: Theme.colors.primaryLight, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: Theme.colors.primary },
  
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -4 },
  statBox: { width: Platform.OS !== 'web' ? '47%' : undefined, flex: Platform.OS === 'web' ? 1 : undefined, minWidth: Platform.OS === 'web' ? 0 : undefined, marginHorizontal: 4, marginBottom: Platform.OS !== 'web' ? 8 : 0, backgroundColor: Theme.colors.surface, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, borderTopWidth: 4, alignItems: 'center', elevation: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: Theme.colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Theme.colors.textMuted, textAlign: 'center' },
  
  segmentScroll: { marginBottom: 20 },
  segmentScrollContent: { flexDirection: 'row', backgroundColor: '#E2E8F0', padding: 4, borderRadius: 12, minWidth: '100%' },
  segmentTab: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderRadius: 10, marginRight: 4 },
  segmentActive: { backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  segmentText: { fontSize: 13, fontWeight: '600', color: Theme.colors.textMuted },
  segmentTextActive: { color: Theme.colors.primary, fontWeight: '700' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, height: 48, marginBottom: 20, paddingHorizontal: 14 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: Theme.colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as any,
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { paddingHorizontal: 6 },
  ticketCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: Theme.colors.primary, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  ticketCardHigh: { borderLeftColor: '#EF4444' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idContainer: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#F1F5F9', padding: 6, borderRadius: 8, marginRight: 8 },
  ticketId: { fontSize: 13, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  
  issueWrapper: { marginBottom: 12 },
  ticketIssue: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, lineHeight: 22 },
  readMoreText: { color: Theme.colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },

  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 8 },
  attachmentBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', marginRight: 8, marginBottom: 8 },
  attachmentBtnText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600', marginLeft: 6 },

  timeLeftBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#CFFAFE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: '#A5F3FC' },
  timeLeftBarOverdue: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  timeLeftText: { fontSize: 13, fontWeight: '700', color: '#0E7490' },
  timeLeftTextOverdue: { color: '#B91C1C' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  chipHigh: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  chipNormal: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  chipText: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginLeft: 2 },
  peopleGrid: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  personBox: { flex: 1, paddingHorizontal: 2 },
  personLabel: { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '600', marginBottom: 2 },
  personName: { fontSize: 12, color: Theme.colors.text, fontWeight: '700' },
  personDivider: { width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 6 },
  
  dateGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 10, color: Theme.colors.textMuted, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  dateValue: { fontSize: 13, color: Theme.colors.text, fontWeight: '700' },
  
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 6, marginBottom: 4 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  remarkLabel: { fontSize: 11, fontWeight: '800', color: Theme.colors.textMuted, marginBottom: 4, letterSpacing: 0.3 },
  remarkBox: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  remarkText: { fontSize: 13, color: '#92400E', fontWeight: '500', fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6, letterSpacing: 0.3 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 15, color: Theme.colors.textMuted, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 25, right: 20, backgroundColor: Theme.colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  modalSub: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginTop: 2, marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  remarkInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, height: 90, fontSize: 15, color: Theme.colors.text, textAlignVertical: 'top' },
  thumbWrap: { width: 70, height: 70, marginRight: 10, marginBottom: 10 },
  thumb: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border },
  thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 10 },
  addImgBtn: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  addImgText: { fontSize: 12, color: Theme.colors.primary, fontWeight: '600', marginTop: 2 },
  confirmBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  blurOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(5px)' } as any : {}) },
  raiseModalCard: { width: '100%', maxWidth: 650, height: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, position: 'relative' },
  closeRaiseBtn: { position: 'absolute', top: 15, right: 15, zIndex: 999, backgroundColor: '#F1F5F9', padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertCard: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
  alertIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, marginBottom: 8, textAlign: 'center' },
  alertMessage: { fontSize: 15, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  alertOkBtn: { width: '100%', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  alertOkText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }
});