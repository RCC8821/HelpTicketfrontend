
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView,
  Platform, TextInput, ScrollView, useWindowDimensions, Modal, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../constants/theme';
import { api } from '../services/api';
import { useTickets } from '../context/TicketContext'; // Context added
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

function DateField({ value, onChange, minToday }: { value: Date | null; onChange: (d: Date | null) => void; minToday?: boolean }) {
  const [show, setShow] = useState(false);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const toInput = (d: Date | null) =>
    d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.inputBox}>
        <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
        <input
          type="date"
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontWeight: '600',
            backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer',
            color: value ? Theme.colors.text : Theme.colors.textMuted,
          }}
          value={toInput(value)}
          onChange={(e) => {
            if (e.target.value) {
              const [y, m, d] = e.target.value.split('-').map(Number);
              onChange(new Date(y, m - 1, d));
            } else onChange(null);
          }}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.inputBox} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={{ fontSize: 15, fontWeight: value ? '600' : '400', color: value ? Theme.colors.text : Theme.colors.textMuted }}>
          {value ? fmt(value) : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minToday ? new Date() : undefined}
          onChange={(e: any, d?: Date) => {
            if (Platform.OS === 'android') setShow(false);
            if (d) onChange(d);
          }}
        />
      )}
    </>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const getColumnWidth = () => {
    if (width >= 1200) return '25%';
    if (width >= 768) return '33.33%';
    return '100%';
  };
  const isLargeScreen = width >= 768;

  const [user, setUser] = useState<any>(null);
  
  // States consumed from TicketContext
  const { tickets, counts, stats, loading, fetchTickets, clearCache } = useTickets();
  const [filter, setFilter] = useState('action');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  // Action modal
  const [actionTicket, setActionTicket] = useState<any>(null);
  const [actionKind, setActionKind] = useState<ActionKind | null>(null);
  const [remark, setRemark] = useState('');
  const [actionDate, setActionDate] = useState<Date | null>(null);
  const [rating, setRating] = useState(0);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  // ========== CUSTOM SWEET ALERT STATE ==========
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

  // ========== LOAD TICKETS ==========
  const loadTickets = useCallback(async (forceRefresh = false) => {
    try {
      const stored = await AsyncStorage.getItem('fms_user');
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
        // Using Ticket Context with Caching (No loader if caching is active)
        await fetchTickets(userData.name, filter, forceRefresh);
      } else {
        router.replace('/login');
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    }
  }, [filter, fetchTickets]);

  useFocusEffect(
    useCallback(() => {
      loadTickets(false); // loads using Context Cache
      setShowRaiseModal(false);
    }, [loadTickets])
  );

  const handleLogout = async () => {
    clearCache(); // Logout sets cache empty
    await AsyncStorage.removeItem('fms_user');
    router.replace('/login');
  };

  const filteredTickets = tickets.filter(
    (t) =>
      String(t.ticketId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.issue).toLowerCase().includes(searchQuery.toLowerCase())
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
    if (kind === 'revise' && (parseInt(t.reviseCount, 10) || 0) >= 3) {
      showCustomAlert('Limit Reached', 'Maximum 3 revisions allowed.', 'error');
      return;
    }
    setActionTicket(t);
    setActionKind(kind);
    setRemark('');
    setActionDate(null);
    setRating(0);
    setFiles([]);
    submitLock.current = false;
  };

  const closeAction = () => {
    setActionTicket(null);
    setActionKind(null);
  };

  const pickProof = async () => {
    if (files.length >= 3) {
      showCustomAlert('Limit', 'Maximum 3 images allowed.', 'info');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - files.length,
      base64: true,
      quality: 0.5,
    });
    if (result.canceled) return;
    const picked: AttachedFile[] = result.assets
      .filter((a) => !!a.base64)
      .map((a, i) => ({
        uri: a.uri,
        data: a.base64 as string,
        type: a.mimeType || 'image/jpeg',
        name: a.fileName || `proof_${Date.now()}_${i}.jpg`,
      }));
    setFiles((prev) => [...prev, ...picked].slice(0, 3));
  };

  const fmtDate = (d: Date | null) =>
    d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '';

  const submitAction = async () => {
    if (!actionTicket || !actionKind || submitLock.current) return;
    const ticketId = actionTicket.ticketId;

    let actionType: 'step2' | 'step3' | 'step4' | 'step5' = 'step2';
    let payload: any = { ticketId };

    switch (actionKind) {
      case 'accept':
        if (!actionDate) return showCustomAlert('Required', 'Please select planned date.', 'error');
        actionType = 'step2';
        payload = { ticketId, status: 'Done', remark: remark.trim(), nextDate: fmtDate(actionDate) };
        break;
      case 'reject':
        if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark for rejection.', 'error');
        actionType = 'step2';
        payload = { ticketId, status: 'Reject', remark: remark.trim(), nextDate: '' };
        break;
      case 'solve':
        actionType = 'step3';
        payload = {
          ticketId, subAction: 'solve', remark: remark.trim(),
          files: files.map((f) => ({ data: f.data, type: f.type, name: f.name })),
        };
        break;
      case 'revise':
        if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error');
        if (!remark.trim()) return showCustomAlert('Required', 'Please enter remark.', 'error');
        actionType = 'step3';
        payload = { ticketId, subAction: 'revise', remark: remark.trim(), reviseDate: fmtDate(actionDate) };
        break;
      case 'verify':
        actionType = 'step4';
        payload = { ticketId, remark: remark.trim() };
        break;
      case 'close':
        if (!rating) return showCustomAlert('Required', 'Please give a rating.', 'error');
        actionType = 'step5';
        payload = { ticketId, subAction: 'close', rating };
        break;
      case 'reraise':
        if (!actionDate) return showCustomAlert('Required', 'Please select new date.', 'error');
        actionType = 'step5';
        payload = { ticketId, subAction: 'reraise', reraiseDate: fmtDate(actionDate) };
        break;
      default:
        return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      // @ts-ignore
      const res = await api.submitAction(actionType, payload);
      if (res && res.success) {
        clearCache(); // Invalidate old cache on successful action
        showCustomAlert(
          'Success!',
          `${ACTION_META[actionKind].label} completed successfully.`,
          'success',
          () => {
            closeAction();
            loadTickets(true); // forceRefreshes freshly deleted context cache
          }
        );
      } else {
        submitLock.current = false;
        showCustomAlert('Error', res?.message || 'Action failed', 'error');
      }
    } catch (e) {
      submitLock.current = false;
      showCustomAlert('Error', 'Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTicket = (item: any) => {
    const actions = getActions(item);
    const prio = clean(item.priority);
    const isHighPriority = prio === 'high';

    return (
      <View style={[styles.ticketCard, isHighPriority && styles.ticketCardHigh]}>
        <View style={styles.ticketHeader}>
          <View style={styles.idContainer}>
            <View style={styles.iconBox}>
              <Ionicons name="ticket" size={14} color={Theme.colors.primary} />
            </View>
            <Text style={styles.ticketId}>{item.ticketId}</Text>
          </View>
        </View>

        <Text style={styles.ticketIssue}>{item.issue}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.chip, isHighPriority ? styles.chipHigh : styles.chipNormal]}>
            <Ionicons name="alert-circle" size={12} color={isHighPriority ? '#DC2626' : '#059669'} />
            <Text style={[styles.chipText, { color: isHighPriority ? '#DC2626' : '#059669' }]}> {item.priority || 'Normal'}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="location" size={12} color={Theme.colors.textMuted} />
            <Text style={styles.chipText}> {item.location}</Text>
          </View>
          {!!item.desiredDate && (
            <View style={styles.chip}>
              <Ionicons name="calendar" size={12} color={Theme.colors.textMuted} />
              <Text style={styles.chipText}> {item.desiredDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.peopleGrid}>
          <View style={styles.personBox}>
            <Text style={styles.personLabel}>Raiser</Text>
            <Text style={styles.personName}>{item.raiser}</Text>
          </View>
          <View style={styles.personDivider} />
          <View style={styles.personBox}>
            <Text style={styles.personLabel}>PC</Text>
            <Text style={styles.personName}>{item.pc}</Text>
          </View>
          <View style={styles.personDivider} />
          <View style={styles.personBox}>
            <Text style={styles.personLabel}>Solver</Text>
            <Text style={styles.personName}>{item.solver}</Text>
          </View>
        </View>

        {(!!item.plannedDate || (parseInt(item.reviseCount, 10) || 0) > 0) && (
          <View style={styles.extraInfoRow}>
            {!!item.plannedDate && (
              <Text style={styles.extraInfoText}>
                <Ionicons name="time" size={12} color={Theme.colors.primary} /> Planned: <Text style={{ fontWeight: '700', color: Theme.colors.text }}>{item.plannedDate}</Text>
              </Text>
            )}
            {(parseInt(item.reviseCount, 10) || 0) > 0 && (
              <Text style={[styles.extraInfoText, { color: '#D97706' }]}>
                <Ionicons name="repeat" size={12} color="#D97706" /> Revisions: <Text style={{ fontWeight: '700' }}>{item.reviseCount}/3</Text>
              </Text>
            )}
          </View>
        )}

        {!!(item.remark3 || item.remark2 || item.remark1) && (
          <View style={styles.remarkBox}>
            <Text style={styles.remarkText}>
              💬 {item.remark3 || item.remark2 || item.remark1}
            </Text>
          </View>
        )}

        {actions.length > 0 && (
          <View style={styles.actionRow}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.actionBtn, { backgroundColor: ACTION_META[a].color }]}
                onPress={() => openAction(item, a)}
                activeOpacity={0.8}
              >
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

  // ========== CUSTOM ALERT COLORS ==========
  const alertIcon = alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'information-circle';
  const alertColor = alertType === 'success' ? '#10B981' : alertType === 'error' ? '#EF4444' : Theme.colors.primary;
  const alertBg = alertType === 'success' ? '#ECFDF5' : alertType === 'error' ? '#FEF2F2' : '#EFF6FF';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* APP BAR with Refresh */}
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name ? user.name.charAt(0) : 'U'}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderTopColor: '#F59E0B' }]}>
              <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{stats.weekRaised}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>Week Raised</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: '#3B82F6' }]}>
              <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{stats.monthRaised}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>Month Raised</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: '#10B981' }]}>
              <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{stats.weekSolved}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>Week Solved</Text>
            </View>
            <View style={[styles.statBox, { borderTopColor: '#8B5CF6' }]}>
              <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{stats.monthSolved}</Text>
              <Text style={styles.statLabel} numberOfLines={2}>Month Solved</Text>
            </View>
          </View>

          <View style={styles.segmentContainer}>
            {(['action', 'raised', 'assigned'] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.segmentTab, filter === f && styles.segmentActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.segmentText, filter === f && styles.segmentTextActive]}>
                  {f === 'action' ? 'My Actions' : f === 'raised' ? 'Raised' : 'Assigned'} ({counts[f as 'action' | 'raised' | 'assigned']})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID or Issue..."
              placeholderTextColor={Theme.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
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
                <View key={t.ticketId} style={[styles.gridItem, { width: getColumnWidth() }]}>
                  {renderTicket(t)}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (isLargeScreen) setShowRaiseModal(true);
          else router.push('/raise-ticket');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Raise Ticket Modal */}
      {isLargeScreen && (
        <Modal visible={showRaiseModal} transparent animationType="fade" onRequestClose={() => setShowRaiseModal(false)}>
          <View style={styles.blurOverlay}>
            <View style={styles.raiseModalCard}>
              <TouchableOpacity style={styles.closeRaiseBtn} onPress={() => setShowRaiseModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <RaiseTicketScreen
                  onClose={(shouldRefresh) => {
                    setShowRaiseModal(false);
                    if (shouldRefresh) loadTickets(true);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Action Form Modal */}
      <Modal visible={!!kind} transparent animationType="fade" onRequestClose={closeAction}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {kind && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>{ACTION_META[kind].title}</Text>
                  <TouchableOpacity onPress={closeAction}>
                    <Ionicons name="close" size={24} color={Theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSub}>{actionTicket?.ticketId}</Text>

                {(kind === 'accept' || kind === 'revise' || kind === 'reraise') && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {kind === 'accept' ? 'PLANNED DATE *' : 'NEW DATE *'}
                    </Text>
                    <DateField value={actionDate} onChange={setActionDate} minToday />
                  </View>
                )}

                {kind === 'close' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>RATING *</Text>
                    <View style={{ flexDirection: 'row' }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <TouchableOpacity key={n} onPress={() => setRating(n)} style={{ marginRight: 8 }}>
                          <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color="#F59E0B" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {kind !== 'close' && kind !== 'reraise' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      REMARK {kind === 'reject' || kind === 'revise' ? '*' : '(OPTIONAL)'}
                    </Text>
                    <TextInput
                      style={styles.remarkInput}
                      placeholder="Write remark..."
                      placeholderTextColor={Theme.colors.textMuted}
                      multiline
                      value={remark}
                      onChangeText={setRemark}
                    />
                  </View>
                )}

                {kind === 'solve' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>PROOF IMAGES (OPTIONAL, MAX 3)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {files.map((f, i) => (
                        <View key={i} style={styles.thumbWrap}>
                          <Image source={{ uri: f.uri }} style={styles.thumb} />
                          <TouchableOpacity
                            style={styles.thumbRemove}
                            onPress={() => setFiles((p) => p.filter((_, x) => x !== i))}
                          >
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {files.length < 3 && (
                        <TouchableOpacity style={styles.addImgBtn} onPress={pickProof}>
                          <Ionicons name="image-outline" size={24} color={Theme.colors.primary} />
                          <Text style={styles.addImgText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: ACTION_META[kind].color }, submitting && { opacity: 0.7 }]}
                  onPress={submitAction}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{ACTION_META[kind].label}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ==================== CUSTOM SWEET ALERT MODAL ==================== */}
      <Modal visible={alertVisible} transparent animationType="fade" onRequestClose={closeCustomAlert}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            {/* Icon Circle */}
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

// ... Stylings remain identical to preserve CSS exactly as provided ...
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { flex: 1, backgroundColor: Theme.colors.background },
  webWrapper: { flex: 1, width: '100%', padding: Platform.OS === 'web' ? 24 : 16 },

  appBar: {
    backgroundColor: Theme.colors.surface, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 40 : 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  logoutBtn: { padding: 4 },

  welcomeSection: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  welcomeText: { flex: 1, paddingRight: 10 },
  greeting: { fontSize: 13, color: Theme.colors.textMuted, marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  avatar: {
    width: 44, height: 44, backgroundColor: Theme.colors.primaryLight, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Theme.colors.primary },

  statsRow: { flexDirection: 'row', marginBottom: 20, marginHorizontal: -4 },
  statBox: {
    flex: 1, minWidth: 0, marginHorizontal: 4, backgroundColor: Theme.colors.surface,
    paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1,
    borderColor: Theme.colors.border, borderTopWidth: 4, alignItems: 'center', elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Theme.colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Theme.colors.textMuted, textAlign: 'center' },

  segmentContainer: {
    flexDirection: 'row', backgroundColor: '#E2E8F0', padding: 4, borderRadius: 12, marginBottom: 20,
  },
  segmentTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: {
    backgroundColor: '#FFFFFF', elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: Theme.colors.textMuted },
  segmentTextActive: { color: Theme.colors.primary, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface,
    borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, height: 48,
    marginBottom: 20, paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: Theme.colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) } as any,

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridItem: { paddingHorizontal: 6 },

  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: Theme.colors.primary,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
  },
  ticketCardHigh: { borderLeftColor: '#EF4444' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idContainer: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { backgroundColor: '#F1F5F9', padding: 6, borderRadius: 8, marginRight: 8 },
  ticketId: { fontSize: 13, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  ticketIssue: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, marginBottom: 12, lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 8, marginBottom: 6,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  chipHigh: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
  chipNormal: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  chipText: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginLeft: 2 },
  peopleGrid: {
    flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  personBox: { flex: 1 },
  personLabel: { fontSize: 11, color: Theme.colors.textMuted, fontWeight: '600', marginBottom: 2 },
  personName: { fontSize: 13, color: Theme.colors.text, fontWeight: '700' },
  personDivider: { width: 1, height: '100%', backgroundColor: '#E2E8F0', marginHorizontal: 10 },
  extraInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  extraInfoText: { fontSize: 12, color: Theme.colors.textMuted, fontWeight: '500' },
  remarkBox: { backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  remarkText: { fontSize: 13, color: '#92400E', fontWeight: '500', fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, marginRight: 10, marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6, letterSpacing: 0.3 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 15, color: Theme.colors.textMuted, fontWeight: '500' },

  fab: {
    position: 'absolute', bottom: 25, right: 20, backgroundColor: Theme.colors.primary,
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  modalSub: { fontSize: 12, fontWeight: '600', color: Theme.colors.textMuted, marginTop: 2, marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: Theme.colors.border, borderRadius: 12, paddingHorizontal: 14, height: 50,
  },
  remarkInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, height: 90, fontSize: 15, color: Theme.colors.text, textAlignVertical: 'top',
  },
  thumbWrap: { width: 70, height: 70, marginRight: 10, marginBottom: 10 },
  thumb: { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.border },
  thumbRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFFFFF', borderRadius: 10 },
  addImgBtn: {
    width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    borderColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  addImgText: { fontSize: 12, color: Theme.colors.primary, fontWeight: '600', marginTop: 2 },
  confirmBtn: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  blurOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(5px)' } as any : {})
  },
  raiseModalCard: {
    width: '100%', maxWidth: 650, height: '90%', backgroundColor: '#FFFFFF', borderRadius: 16,
    overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, position: 'relative'
  },
  closeRaiseBtn: {
    position: 'absolute', top: 15, right: 15, zIndex: 999, backgroundColor: '#F1F5F9',
    padding: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0',
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  alertIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertOkBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertOkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});