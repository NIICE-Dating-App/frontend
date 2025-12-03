// app/(tabs)/(up_tab)/nicees.tsx
// MERGED: Polished UI (no gradients) + Complete Supabase fetching

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import ActiveFramesModal from "../(frames)/active_frames";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Theme - NO GRADIENTS
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";

// ================== TYPES ==================
type MainTab = "nearby" | "niices_meet";
type MatchMode = "dating" | "friend";
type MatchStatus = "pending" | "accepted" | "denied" | "rejected";
type ConnectionVisibility = "full_profile" | "blind";
type PlaceRole = "none" | "requester" | "target";
type BlindDateStep = "place_role" | "details" | "message_only" | "accept_location" | "accept_simple" | null;

interface FilterState {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  genders: ('man' | 'woman' | 'nonbinary')[];
}

interface UserPreferences {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  interestedIn: string[];
}

interface NearbyUser {
  user_id: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  main_photo_url: string | null;
  frame_id: string | null;
  has_active_frame: boolean;
  mode: string;
  approx_lat: number;
  approx_lng: number;
  last_seen: string | null;
  gender: string | null;
  looking_for_friend?: string[] | null;
  value_friend?: string[] | null;
  sexual_orientation?: string | null;
}

interface MatchStatusInfo {
  status: "pending" | "accepted" | "denied" | "rejected" | null;
  connection_visibility: "full_profile" | "blind" | null;
  chat_allowed: boolean;
  is_requester: boolean;
  match_id: string | null;
  place_role?: "none" | "requester" | "target" | null;
  blind_meet_time?: string | null;
  blind_location_name?: string | null;
  sender_message?: string | null;
}

interface BlindMeeting {
  id: string;
  other_user_id: string;
  full_name: string | null;
  age: number | null;
  main_photo_url: string | null;
  match_mode: MatchMode;
  blind_meet_time: string | null;
  blind_location_name: string | null;
  requester_reveal_approved: boolean;
  target_reveal_approved: boolean;
  is_requester: boolean;
  created_at: string;
}

interface NiiceMatch {
  id: string;
  other_user_id: string;
  full_name: string;
  age: number | null;
  main_photo_url: string | null;
  match_mode: MatchMode;
  last_message_preview: string | null;
  last_message_at: string | null;
  from_blind_meet: boolean;
  connection_visibility: ConnectionVisibility;
  created_at: string;
}

interface MatchRequest {
  id: string;
  other_user_id: string;
  full_name: string | null;
  age: number | null;
  main_photo_url: string | null;
  match_mode: MatchMode;
  connection_visibility: ConnectionVisibility;
  status: MatchStatus;
  is_incoming: boolean;
  sender_message: string | null;
  place_role: PlaceRole | null;
  created_at: string;
}

interface BlindDateForm {
  placeRole: 'requester' | 'target' | null;
  locationName: string;
  locationCoords: { lat: number; lng: number } | null;
  meetTime: Date | null;
  message: string;
}

// ================== UTILITY FUNCTIONS ==================
const formatTimeUntil = (dateStr: string): string => {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "Now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const formatMeetingDate = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today - ${time}`;
  if (isTomorrow) return `Tomorrow - ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} - ${time}`;
};

const formatDateTime = (date: Date | null) => {
  if (!date) return 'Select date & time';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatLookingForFriend = (values: string[] | null): string | null => {
  if (!values || values.length === 0) return null;
  const displayMap: Record<string, string> = {
    'new_friends_nearby': 'New friends nearby',
    'workout_fitness_buddy': 'Workout buddy',
    'travel_companions': 'Travel companions',
    'activity_hobby_partners': 'Hobby partners',
    'casual_hangouts': 'Casual hangouts',
    'professional_networking': 'Networking',
    'close_friendships': 'Close friendships',
  };
  return values.slice(0, 2).map(v => displayMap[v] || v.replace(/_/g, ' ')).join(' - ');
};

const formatValueFriend = (values: string[] | null): string | null => {
  if (!values || values.length === 0) return null;
  const displayMap: Record<string, string> = {
    'loyalty': 'Loyalty',
    'trustworthy': 'Trustworthy',
    'good_listener': 'Good listener',
    'sense_of_humor': 'Sense of humor',
    'supportive': 'Supportive',
    'non_judgmental': 'Non-judgmental',
    'honest': 'Honest',
    'reliable': 'Reliable',
    'fun_to_be_around': 'Fun to be around',
    'authentic': 'Authentic',
    'understanding': 'Understanding',
    'shared_interests': 'Shared interests',
    'deep_conversations': 'Deep conversations',
    'adventurous': 'Adventurous',
    'positive_energy': 'Positive energy',
  };
  return values.slice(0, 3).map(v => displayMap[v] || v.replace(/_/g, ' ')).join(', ');
};

const formatOrientation = (value: string | null): string | null => {
  if (!value) return null;
  const displayMap: Record<string, string> = {
    'straight': 'Straight', 'gay': 'Gay', 'lesbian': 'Lesbian', 'bisexual': 'Bisexual',
    'pansexual': 'Pansexual', 'queer': 'Queer', 'asexual': 'Asexual', 'demisexual': 'Demisexual', 'questioning': 'Questioning',
  };
  return displayMap[value] || null;
};

// ================== FILTER MODAL (POLISHED UI WITH SLIDERS) ==================
const FilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  defaults: UserPreferences;
}> = memo(({ visible, onClose, filters, onApply, defaults }) => {
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const scaleAnim = useRef(new RNAnimated.Value(0)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTempFilters(filters);
      RNAnimated.parallel([
        RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }),
        RNAnimated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, filters]);

  const handleReset = useCallback(() => {
    Keyboard.dismiss();
    setTempFilters({
      ageMin: defaults.ageMin,
      ageMax: defaults.ageMax,
      distanceKm: defaults.distanceKm,
      genders: defaults.interestedIn as ('man' | 'woman' | 'nonbinary')[],
    });
  }, [defaults]);

  const handleApply = useCallback(() => {
    Keyboard.dismiss();
    onApply(tempFilters);
    onClose();
  }, [tempFilters, onApply, onClose]);

  const toggleGender = useCallback((g: 'man' | 'woman' | 'nonbinary') => {
    Keyboard.dismiss();
    setTempFilters(prev => {
      const has = prev.genders.includes(g);
      const newGenders = has ? prev.genders.filter(x => x !== g) : [...prev.genders, g];
      if (newGenders.length === 0) return prev;
      return { ...prev, genders: newGenders };
    });
  }, []);

  const GENDER_LABELS: Record<string, string> = { man: 'Men', woman: 'Women', nonbinary: 'Non-binary' };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.filterBackdrop} onPress={onClose}>
        <RNAnimated.View style={{ opacity: opacityAnim, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => Keyboard.dismiss()}>
            <RNAnimated.View style={[styles.filterContainer, { transform: [{ scale: scaleAnim }] }]}>
              <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.98)' }]} />
              
              <View style={styles.filterHeader}>
                <View style={styles.filterHeaderIcon}>
                  <Ionicons name="options-outline" size={20} color={BLUE} />
                </View>
                <Text style={styles.filterTitle}>Filters</Text>
                <Pressable onPress={onClose} style={styles.filterCloseBtn} hitSlop={8}>
                  <Ionicons name="close" size={22} color="rgba(10,14,26,0.5)" />
                </Pressable>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionLabel}>Show me</Text>
                <View style={styles.filterGenderRow}>
                  {(['woman', 'man', 'nonbinary'] as const).map(g => {
                    const active = tempFilters.genders.includes(g);
                    return (
                      <Pressable key={g} onPress={() => toggleGender(g)}
                        style={[styles.filterGenderChip, active && styles.filterGenderChipActive]}>
                        <Text style={[styles.filterGenderText, active && styles.filterGenderTextActive]}>{GENDER_LABELS[g]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionLabel}>Age</Text>
                  <Text style={styles.filterSectionValue}>{tempFilters.ageMin} - {tempFilters.ageMax}</Text>
                </View>
                <View style={styles.filterAgeSliderContainer}>
                  <View style={styles.filterAgeSliderRow}>
                    <Text style={styles.filterAgeSliderLabel}>Min age</Text>
                    <Slider
                      style={styles.filterAgeSlider}
                      minimumValue={18}
                      maximumValue={60}
                      step={1}
                      value={tempFilters.ageMin}
                      onValueChange={(v) => setTempFilters(p => ({ ...p, ageMin: Math.round(v), ageMax: Math.max(p.ageMax, Math.round(v)) }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={styles.filterAgeSliderValue}>{tempFilters.ageMin}</Text>
                  </View>
                  <View style={styles.filterAgeSliderRow}>
                    <Text style={styles.filterAgeSliderLabel}>Max age</Text>
                    <Slider
                      style={styles.filterAgeSlider}
                      minimumValue={tempFilters.ageMin}
                      maximumValue={99}
                      step={1}
                      value={tempFilters.ageMax}
                      onValueChange={(v) => setTempFilters(p => ({ ...p, ageMax: Math.round(v) }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={styles.filterAgeSliderValue}>{tempFilters.ageMax}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionLabel}>Distance</Text>
                  <Text style={styles.filterSectionValue}>{tempFilters.distanceKm < 1 ? `${Math.round(tempFilters.distanceKm * 1000)}m` : `${tempFilters.distanceKm}km`}</Text>
                </View>
                <View style={styles.filterDistanceSliderContainer}>
                  <Slider
                    style={styles.filterDistanceSlider}
                    minimumValue={0.5}
                    maximumValue={4}
                    step={0.1}
                    value={tempFilters.distanceKm}
                    onValueChange={(v) => setTempFilters(p => ({ ...p, distanceKm: Math.round(v * 10) / 10 }))}
                    minimumTrackTintColor={BLUE}
                    maximumTrackTintColor="rgba(27,68,205,0.2)"
                    thumbTintColor={BLUE}
                  />
                  <View style={styles.filterDistanceLabels}>
                    <Text style={styles.filterDistanceMinLabel}>500m</Text>
                    <Text style={styles.filterDistanceMaxLabel}>4km</Text>
                  </View>
                </View>
              </View>

              <View style={styles.filterActions}>
                <Pressable onPress={handleReset} style={styles.filterResetBtn}>
                  <Text style={styles.filterResetText}>Reset</Text>
                </Pressable>
                <Pressable onPress={handleApply} style={styles.filterApplyBtn}>
                  <Text style={styles.filterApplyText}>Apply</Text>
                </Pressable>
              </View>
            </RNAnimated.View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
});

// ================== TOP TAB TOGGLE (NO GRADIENTS) ==================
interface TabToggleProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  nearbyCount: number;
  niiceCount: number;
}

const TabToggle: React.FC<TabToggleProps> = ({ activeTab, onTabChange, nearbyCount, niiceCount }) => (
  <View style={styles.tabToggleContainer}>
    <TouchableOpacity style={[styles.tabToggleBtn, activeTab === "nearby" && styles.tabToggleBtnActive]}
      onPress={() => onTabChange("nearby")} activeOpacity={0.8}>
      <View style={styles.tabToggleBtnInner}>
        <Ionicons name={activeTab === "nearby" ? "location" : "location-outline"} size={18} color={activeTab === "nearby" ? "#FFFFFF" : "rgba(10,14,26,0.6)"} />
        <Text style={activeTab === "nearby" ? styles.tabToggleTextActive : styles.tabToggleText}>Nearby</Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.tabToggleBtn, activeTab === "niices_meet" && styles.tabToggleBtnActive]}
      onPress={() => onTabChange("niices_meet")} activeOpacity={0.8}>
      <View style={styles.tabToggleBtnInner}>
        <Ionicons name={activeTab === "niices_meet" ? "heart" : "heart-outline"} size={18} color={activeTab === "niices_meet" ? "#FFFFFF" : "rgba(10,14,26,0.6)"} />
        <Text style={activeTab === "niices_meet" ? styles.tabToggleTextActive : styles.tabToggleText}>Niices & Meet</Text>
        {niiceCount > 0 && (
          <View style={[
            styles.tabBadge, 
            activeTab === "niices_meet" && styles.tabBadgeActive
          ]}>
            <Text style={activeTab === "niices_meet" ? styles.tabBadgeTextActive : styles.tabBadgeText}>
              {niiceCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  </View>
);

// ================== FILTER BAR (MINIMAL) ==================
interface FilterBarProps {
  filters: FilterState;
  hasActiveFilters: boolean;
  onOpenFilter: () => void;
  resultCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, hasActiveFilters, onOpenFilter, resultCount }) => (
  <View style={styles.filterBar}>
    <View style={styles.filterBarContent}>
      <View style={styles.countRow}>
        <Ionicons name="checkmark-circle" size={14} color="rgba(10,14,26,0.5)" />
        <Text style={styles.countText}>
          {resultCount} {resultCount === 1 ? 'person' : 'people'} nearby
        </Text>
      </View>

      <TouchableOpacity style={styles.iconButton} onPress={onOpenFilter}>
        <Ionicons name="options-outline" size={20} color={BLUE} />
        {hasActiveFilters && <View style={styles.filterDotSmall} />}
      </TouchableOpacity>
    </View>
  </View>
);


// ================== NEARBY USER CARD (MINIMAL COMPACT) ==================
interface NearbyUserCardProps {
  user: NearbyUser;
  currentUserId: string | null;
  userPosition: { lat: number; lng: number } | null;
  onSendRequest: (user: NearbyUser, isBlind: boolean, placeRole?: 'requester' | 'target', form?: BlindDateForm) => Promise<void>;
  onViewProfile: (userId: string) => void;
  onOpenFrames: (userId: string) => void;
}

const NearbyUserCard: React.FC<NearbyUserCardProps> = ({
  user, currentUserId, userPosition, onSendRequest, onViewProfile, onOpenFrames,
}) => {
  const [loading, setLoading] = useState(false);
  const [matchStatus, setMatchStatus] = useState<MatchStatusInfo | null>(null);
  const [blindDateStep, setBlindDateStep] = useState<BlindDateStep>(null);
  const [blindDateForm, setBlindDateForm] = useState<BlindDateForm>({ placeRole: null, locationName: '', locationCoords: null, meetTime: null, message: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempPickedLocation, setTempPickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const distance = useMemo(() => {
    if (!userPosition) return null;
    const R = 6371;
    const dLat = ((user.approx_lat - userPosition.lat) * Math.PI) / 180;
    const dLon = ((user.approx_lng - userPosition.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((userPosition.lat * Math.PI) / 180) * Math.cos((user.approx_lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  }, [user, userPosition]);

  const fetchMatchStatus = useCallback(async () => {
    if (!currentUserId) return;
    const { data } = await supabase.from('match_requests').select('*')
      .or(`and(requester_id.eq.${currentUserId},target_id.eq.${user.user_id}),and(requester_id.eq.${user.user_id},target_id.eq.${currentUserId})`)
      .neq('status', 'denied').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setMatchStatus({
        status: data.status, connection_visibility: data.connection_visibility, chat_allowed: data.chat_allowed ?? false,
        is_requester: data.requester_id === currentUserId, match_id: data.id, place_role: data.place_role,
        blind_meet_time: data.blind_meet_time, blind_location_name: data.blind_location_name, sender_message: data.sender_message,
      });
    } else setMatchStatus(null);
  }, [currentUserId, user.user_id]);

  useEffect(() => { fetchMatchStatus(); }, [fetchMatchStatus]);

  const handleBlindMeetingStart = () => setBlindDateStep('place_role');
  const handlePlaceRoleSelect = (role: 'requester' | 'target') => {
    setBlindDateForm(prev => ({ ...prev, placeRole: role }));
    setBlindDateStep(role === 'requester' ? 'details' : 'message_only');
  };

  const handleSendBlindRequest = async () => {
    if (!blindDateForm.placeRole) return;
    setLoading(true);
    try {
      await onSendRequest(user, true, blindDateForm.placeRole, blindDateForm);
      setBlindDateStep(null);
      setBlindDateForm({ placeRole: null, locationName: '', locationCoords: null, meetTime: null, message: '' });
      await fetchMatchStatus();
    } finally { setLoading(false); }
  };

  const handleSendFriendRequest = async () => {
    setLoading(true);
    try { await onSendRequest(user, false); await fetchMatchStatus(); }
    finally { setLoading(false); }
  };

  const handleAcceptRequest = async () => {
    if (!matchStatus?.match_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'accepted' })
        .eq('id', matchStatus.match_id);
      if (error) throw error;
      Alert.alert("Success", "Request accepted!");
      await fetchMatchStatus();
    } catch (error) {
      Alert.alert("Error", "Failed to accept request");
    } finally { setLoading(false); }
  };

  const handleDenyRequest = async () => {
    if (!matchStatus?.match_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'denied' })
        .eq('id', matchStatus.match_id);
      if (error) throw error;
      await fetchMatchStatus();
    } catch (error) {
      Alert.alert("Error", "Failed to deny request");
    } finally { setLoading(false); }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setBlindDateForm(prev => ({ ...prev, meetTime: selectedDate }));
  };

  const isMatched = matchStatus?.status === 'accepted';
  const isPending = matchStatus?.status === 'pending';
  const isRequester = matchStatus?.is_requester;
  const hasActiveFrame = user.has_active_frame;

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity 
        style={styles.rowContent}
        onPress={() => onViewProfile(user.user_id)}
        activeOpacity={0.7}
        disabled={!!blindDateStep}
      >
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={(e) => { if (hasActiveFrame) { e.stopPropagation(); onOpenFrames(user.user_id); } }} activeOpacity={hasActiveFrame ? 0.7 : 1} disabled={!hasActiveFrame}>
          {hasActiveFrame && <View style={styles.avatarRing} />}
          {user.main_photo_url ? (
            <Image source={{ uri: user.main_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="rgba(27,68,205,0.3)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Name, Age, Distance */}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.full_name}{user.age ? `, ${user.age}` : ''}
          </Text>
          {distance && (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={12} color={BLUE} />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          )}
        </View>

        {/* Status Badges */}
        {isPending && isRequester && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Sent</Text>
          </View>
        )}

        {/* Accept/Deny buttons for incoming requests */}
        {isPending && !isRequester && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.acceptBtn]} 
              onPress={(e) => { e.stopPropagation(); handleAcceptRequest(); }} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.denyBtn]} 
              onPress={(e) => { e.stopPropagation(); handleDenyRequest(); }} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={14} color="#FFFFFF" />
              <Text style={styles.denyBtnText}>Deny</Text>
            </TouchableOpacity>
          </View>
        )}
        {isMatched && (
          <View style={[styles.statusBadge, styles.matchedBadge]}>
            <Text style={styles.matchedBadgeText}>Niice</Text>
          </View>
        )}

        {/* Action Buttons */}
        {!blindDateStep && !isMatched && !isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={(e) => { e.stopPropagation(); handleSendFriendRequest(); }} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={14} color={BLUE} />
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={(e) => { e.stopPropagation(); handleBlindMeetingStart(); }} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="cafe-outline" size={14} color={BLUE} />
              <Text style={styles.actionBtnText}>Blind</Text>
            </TouchableOpacity>
          </View>
        )}

        {isMatched && (
          <View style={styles.actionButtons}>
            {matchStatus?.chat_allowed && (
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={(e) => { 
                  e.stopPropagation(); 
                  router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: matchStatus.match_id } }); 
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubbles-outline" size={14} color={BLUE} />
                <Text style={styles.actionBtnText}>Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Blind Date Flow */}
      {blindDateStep === 'place_role' && (
        <View style={styles.blindFlowCard}>
          <Text style={styles.blindFlowTitle}>Who picks the place?</Text>
          <View style={styles.blindFlowOptions}>
            <TouchableOpacity style={styles.blindFlowOption} onPress={() => handlePlaceRoleSelect('requester')} activeOpacity={0.7}>
              <Ionicons name="location" size={20} color={BLUE} />
              <Text style={styles.blindFlowOptionText}>I'll pick</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowOption} onPress={() => handlePlaceRoleSelect('target')} activeOpacity={0.7}>
              <Ionicons name="person" size={20} color={BLUE} />
              <Text style={styles.blindFlowOptionText}>They pick</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}>
            <Text style={styles.blindFlowCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {blindDateStep === 'details' && (
        <View style={styles.blindFlowCard}>
          <Text style={styles.blindFlowTitle}>Suggest a spot</Text>
          <View style={styles.blindFlowInputs}>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="business-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.blindFlowInput} 
                placeholder="Place name" 
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.locationName} 
                onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, locationName: text }))} 
              />
            </View>
            <TouchableOpacity 
              style={styles.blindFlowInputWrap} 
              onPress={() => { 
                setTempPickedLocation(blindDateForm.locationCoords || userPosition); 
                setShowLocationPicker(true); 
              }}
            >
              <Ionicons name="location-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <Text style={[styles.blindFlowInputText, !blindDateForm.locationCoords && { color: "rgba(10,14,26,0.4)" }]}>
                {blindDateForm.locationCoords ? 'Location set' : 'Pick location'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(10,14,26,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowInputWrap} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <Text style={[styles.blindFlowInputText, !blindDateForm.meetTime && { color: "rgba(10,14,26,0.4)" }]}>
                {formatDateTime(blindDateForm.meetTime)}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(10,14,26,0.3)" />
            </TouchableOpacity>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput 
                style={[styles.blindFlowInput, { flex: 1 }]} 
                placeholder="Message (optional)" 
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.message} 
                onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, message: text }))} 
                maxLength={200} 
              />
            </View>
          </View>
          <View style={styles.blindFlowActions}>
            <TouchableOpacity style={styles.blindFlowBackBtn} onPress={() => setBlindDateStep('place_role')}>
              <Text style={styles.blindFlowBackText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.blindFlowSendBtn, (!blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime) && { opacity: 0.5 }]}
              onPress={handleSendBlindRequest} 
              disabled={loading || !blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime}
            >
              <Text style={styles.blindFlowSendText}>{loading ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}>
            <Text style={styles.blindFlowCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {blindDateStep === 'message_only' && (
        <View style={styles.blindFlowCard}>
          <Text style={styles.blindFlowTitle}>Add a message</Text>
          <View style={styles.blindFlowInputs}>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput 
                style={[styles.blindFlowInput, { flex: 1 }]} 
                placeholder="Message (optional)" 
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.message} 
                onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, message: text }))} 
                maxLength={200} 
              />
            </View>
          </View>
          <View style={styles.blindFlowActions}>
            <TouchableOpacity style={styles.blindFlowBackBtn} onPress={() => setBlindDateStep('place_role')}>
              <Text style={styles.blindFlowBackText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowSendBtn} onPress={handleSendBlindRequest} disabled={loading}>
              <Text style={styles.blindFlowSendText}>{loading ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}>
            <Text style={styles.blindFlowCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <TouchableOpacity style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)} />
            <View style={styles.datePickerContainer}>
              <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.98)' }]} />
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker 
                value={blindDateForm.meetTime || new Date()} 
                mode="datetime" 
                display="spinner" 
                onChange={handleDateChange} 
                minimumDate={new Date()} 
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <View style={styles.locationPickerHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Ionicons name="close" size={24} color={INK} />
            </TouchableOpacity>
            <Text style={styles.locationPickerTitle}>Pick Location</Text>
            <TouchableOpacity 
              onPress={() => { 
                if (tempPickedLocation) 
                  setBlindDateForm(prev => ({ ...prev, locationCoords: tempPickedLocation })); 
                setShowLocationPicker(false); 
              }}
            >
              <Text style={styles.locationPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <MapView 
            style={{ flex: 1 }} 
            provider={PROVIDER_GOOGLE}
            initialRegion={{ 
              latitude: tempPickedLocation?.lat || userPosition?.lat || 41.9028, 
              longitude: tempPickedLocation?.lng || userPosition?.lng || 12.4964, 
              latitudeDelta: 0.01, 
              longitudeDelta: 0.01 
            }}
            onPress={(e) => setTempPickedLocation({ 
              lat: e.nativeEvent.coordinate.latitude, 
              lng: e.nativeEvent.coordinate.longitude 
            })}
          >
            {tempPickedLocation && (
              <Marker 
                coordinate={{ 
                  latitude: tempPickedLocation.lat, 
                  longitude: tempPickedLocation.lng 
                }} 
                pinColor={BLUE} 
              />
            )}
          </MapView>
          <Text style={styles.locationPickerHint}>Tap on the map to select a location</Text>
        </SafeAreaView>
      </Modal>

      <View style={styles.separator} />
    </View>
  );
};


// ================== EMPTY STATE ==================
const EmptyState: React.FC<{ icon: string; title: string; subtitle: string; ctaLabel?: string; onCta?: () => void }> = ({ icon, title, subtitle, ctaLabel, onCta }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}><Ionicons name={icon as any} size={32} color={BLUE} /></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {ctaLabel && onCta && (
      <TouchableOpacity style={styles.emptyCta} onPress={onCta} activeOpacity={0.85}>
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ================== SECTION HEADER ==================
const SectionHeader: React.FC<{ title: string; onSeeAll?: () => void; showArrow?: boolean }> = ({ title, onSeeAll, showArrow }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
        <Text style={styles.seeAllText}>See all</Text>
        {showArrow && <Ionicons name="chevron-forward" size={16} color={BLUE} />}
      </TouchableOpacity>
    )}
  </View>
);

// ================== BLIND MEETING CARD (NO GRADIENTS) ==================
const BlindMeetingCard: React.FC<{ meeting: BlindMeeting; onPress: () => void }> = ({ meeting, onPress }) => {
  const isHappening = meeting.blind_meet_time && new Date(meeting.blind_meet_time) <= new Date();
  const isPast = meeting.blind_meet_time && new Date(meeting.blind_meet_time).getTime() + 3600000 < Date.now();

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.blindCard}>
      {/* Profile Circle */}
      <View style={styles.blindCircle}>
        <View style={styles.blindCircleInner}>
          {meeting.main_photo_url ? (
            <Image source={{ uri: meeting.main_photo_url }} style={styles.blindProfileImage} />
          ) : (
            <Ionicons name="person" size={48} color="#FFFFFF" />
          )}
        </View>
      </View>

      {/* Name */}
      <Text style={styles.blindName} numberOfLines={1}>
        {meeting.full_name || 'Mystery Person'}{meeting.age ? `, ${meeting.age}` : ''}
      </Text>

      {/* Location */}
      <Text 
        style={styles.blindLocation} 
        numberOfLines={2}
      >
        {meeting.blind_location_name || 'Location TBD'}
      </Text>

      {/* Time Info */}
      <View style={styles.blindTimeContainer}>
        {isPast ? (
          <View style={[styles.blindTimeBadge, { backgroundColor: '#22C55E' }]}>
            <Text style={styles.blindTimeBadgeText}>Tap to Review</Text>
          </View>
        ) : isHappening ? (
          <View style={[styles.blindTimeBadge, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="radio-button-on" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.blindTimeBadgeText}>Happening Now</Text>
          </View>
        ) : (
          <>
            <Text style={styles.blindTimeMain}>
              {meeting.blind_meet_time ? formatTimeUntil(meeting.blind_meet_time) : 'Soon'}
            </Text>
            <Text style={styles.blindTimeDetail}>
              {formatMeetingDate(meeting.blind_meet_time)}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};



// ================== NIICE MATCH CARD (NO GRADIENTS) ==================
const NiiceMatchCard: React.FC<{ 
  match: NiiceMatch; 
  onViewProfile: () => void;
  onOpenChat: () => void;
  onOpenFrames: (userId: string) => void;
}> = ({ match, onViewProfile, onOpenChat, onOpenFrames }) => {
  return (
    <TouchableOpacity 
      onPress={onOpenChat}
      activeOpacity={0.7}
      style={styles.niiceRowWrapper}
    >
      <View style={styles.niiceRowContent}>
        {/* Avatar - Goes to Profile */}
        <TouchableOpacity 
          style={styles.niiceAvatarContainer}
          onPress={(e) => { e.stopPropagation(); onOpenFrames(match.other_user_id); }}
          activeOpacity={0.8}
        >
          {match.from_blind_meet && <View style={styles.niiceAvatarRing} />}
          {match.main_photo_url ? (
            <Image source={{ uri: match.main_photo_url }} style={styles.niiceAvatar} />
          ) : (
            <View style={[styles.niiceAvatar, styles.niiceAvatarPlaceholder]}>
              <Ionicons name="person" size={24} color="rgba(27,68,205,0.3)" />
            </View>
          )}
          {match.from_blind_meet && (
            <View style={styles.niiceBlindBadge}>
              <Ionicons name="eye-off" size={10} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.niiceInfoSection}>
          <View style={styles.niiceNameRow}>
            <Text style={styles.niiceName} numberOfLines={1}>
              {match.full_name}{match.age ? `, ${match.age}` : ""}
            </Text>
            {!match.last_message_at && (
              <View style={styles.niiceMatchedBadge}>
                <Text style={styles.niiceMatchedText}>New Niice</Text>
              </View>
            )}
          </View>
          {match.last_message_preview ? (
            <Text style={styles.niiceLastMessage} numberOfLines={1}>{match.last_message_preview}</Text>
          ) : (
            <View style={styles.niiceLastMessageRow}>
              <Text style={styles.niiceLastMessageMuted}>Say hi and break the ice</Text>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="rgba(10,14,26,0.4)" />
            </View>
          )}
        </View>

        {/* Time & Arrow */}
        <View style={styles.niiceRightSection}>
          <Text style={styles.niiceTime}>
            {match.last_message_at ? formatRelativeTime(match.last_message_at) : formatRelativeTime(match.created_at)}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(10,14,26,0.3)" />
        </View>
      </View>
      <View style={styles.niiceSeparator} />
    </TouchableOpacity>
  );
};


// ================== MAIN SCREEN (WITH COMPLETE SUPABASE FETCHING) ==================
function NiicesScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<MainTab>("nearby");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({ ageMin: 18, ageMax: 99, distanceKm: 4, interestedIn: ['man', 'woman', 'nonbinary'] });
  const [filters, setFilters] = useState<FilterState>({ ageMin: 18, ageMax: 99, distanceKm: 4, genders: ['man', 'woman', 'nonbinary'] });

  const [showFramesModal, setShowFramesModal] = useState(false);
  const [framesData, setFramesData] = useState<any[]>([]);

  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [blindMeetings, setBlindMeetings] = useState<BlindMeeting[]>([]);
  const [niiceMatches, setNiiceMatches] = useState<NiiceMatch[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);

  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingBlind, setLoadingBlind] = useState(false);
  const [loadingNiices, setLoadingNiices] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredNearbyUsers = useMemo(() => {
    return nearbyUsers.filter(user => {
      if (user.age && (user.age < filters.ageMin || user.age > filters.ageMax)) return false;
      if (user.gender && !filters.genders.includes(user.gender as any)) return false;
      return true;
    });
  }, [nearbyUsers, filters]);

  const hasActiveFilters = useMemo(() => {
    return filters.ageMin !== userPrefs.ageMin || filters.ageMax !== userPrefs.ageMax ||
      filters.distanceKm !== userPrefs.distanceKm || filters.genders.length !== userPrefs.interestedIn.length ||
      !filters.genders.every(g => userPrefs.interestedIn.includes(g));
  }, [filters, userPrefs]);

  const niiceCount = niiceMatches.length;

  // ================== DATA LOADING (FROM SUPABASE) ==================
  const loadUserId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data?.user?.id ?? null);
    return data?.user?.id;
  }, []);

  const loadUserPrefsAndPosition = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('lat, lng, age_pref_min, age_pref_max, distance_km, interested_in').eq('id', uid).single();
    if (data) {
      if (data.lat && data.lng) setUserPosition({ lat: Number(data.lat), lng: Number(data.lng) });
      const prefs: UserPreferences = {
        ageMin: data.age_pref_min || 18, ageMax: data.age_pref_max || 99,
        distanceKm: data.distance_km || 4, interestedIn: data.interested_in || ['man', 'woman', 'nonbinary'],
      };
      setUserPrefs(prefs);
      setFilters({ ageMin: prefs.ageMin, ageMax: prefs.ageMax, distanceKm: prefs.distanceKm, genders: prefs.interestedIn as any });
    }
  }, []);

  const loadNearbyUsers = useCallback(async (uid: string) => {
  try {
    setLoadingNearby(true);
    const { data, error } = await supabase.rpc('get_map_cards', { p_mode: 'friend' });
    
    
    if (error || !data) { 
      setNearbyUsers([]); 
      return; 
    }

    const userIds = data.map((u: any) => u.user_id);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, gender, sexual_orientation')
      .in('id', userIds);
    
    
    const profileMap: Record<string, any> = {};
    profileData?.forEach((p: any) => { profileMap[p.id] = p; });
    

    const friendModePromises = data.map(async (u: any) => {
      try {
        const { data: fmData } = await supabase.rpc('get_user_friend_mode', { target_user_id: u.user_id });
        return { userId: u.user_id, data: fmData?.[0] || null };
      } catch { return { userId: u.user_id, data: null }; }
    });
    const friendModeResults = await Promise.all(friendModePromises);
    const friendModeMap: Record<string, any> = {};
    friendModeResults.forEach(r => { friendModeMap[r.userId] = r.data; });

    // Ã¢Å“â€¦ REMOVE THE FILTER TEMPORARILY
    const users: NearbyUser[] = await Promise.all(
      data.map(async (row: any) => {  // Ã¢â€ Â NO FILTER YET
        let photoUrl = row.main_photo_url;
        if (photoUrl && !photoUrl.startsWith('http')) {
          const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
          photoUrl = signedData?.signedUrl || null;
        }
        const profile = profileMap[row.user_id] || {};
        const friendMode = friendModeMap[row.user_id] || {};
        
        
        return {
          user_id: row.user_id, full_name: row.full_name ?? "Unknown", age: row.age ?? null, bio: row.bio ?? null,
          main_photo_url: photoUrl, frame_id: row.frame_id ?? null, 
          has_active_frame: !!row.frame_id,
          mode: row.mode ?? 'friend',
          approx_lat: row.approx_lat ?? 0, approx_lng: row.approx_lng ?? 0, last_seen: null,
          gender: profile.gender?.toLowerCase() || null, sexual_orientation: profile.sexual_orientation || null,
          looking_for_friend: friendMode.looking_for_friend || null, value_friend: friendMode.value_friend || null,
        };
      })
    );
    
    setNearbyUsers(users);
  } catch (err) { setNearbyUsers([]); }
  finally { setLoadingNearby(false); }
}, []);

  const getUserPreview = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await supabase.rpc('get_matched_user_profile', { target_user_id: targetUserId });
      const row = Array.isArray(data) ? data[0] : data;
      let photoUrl = row?.main_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
        photoUrl = signedData?.signedUrl || null;
      }
      return { full_name: row?.full_name ?? null, age: row?.age ?? null, main_photo_url: photoUrl };
    } catch { return { full_name: null, age: null, main_photo_url: null }; }
  }, []);

  const loadBlindMeetings = useCallback(async (uid: string) => {
    try {
      setLoadingBlind(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, requester_id, target_id, match_mode, blind_meet_time, blind_location_name, requester_reveal_approved, target_reveal_approved, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`).eq("connection_visibility", "blind").eq("status", "accepted").order("blind_meet_time", { ascending: true });
      if (error) { setBlindMeetings([]); return; }
      
      // Fetch user data for each blind meeting
      const meetings = await Promise.all((data || []).map(async (row: any) => {
        const otherId = row.requester_id === uid ? row.target_id : row.requester_id;
        const preview = await getUserPreview(otherId);
        return {
          id: row.id, 
          other_user_id: otherId,
          full_name: preview.full_name, 
          age: preview.age, 
          main_photo_url: preview.main_photo_url, 
          match_mode: row.match_mode,
          blind_meet_time: row.blind_meet_time, 
          blind_location_name: row.blind_location_name,
          requester_reveal_approved: row.requester_reveal_approved ?? false, 
          target_reveal_approved: row.target_reveal_approved ?? false,
          is_requester: row.requester_id === uid, 
          created_at: row.created_at,
        };
      }));
      
      // Filter out meetings where both parties have revealed
      const filteredMeetings = meetings.filter((m: any) => !(m.requester_reveal_approved && m.target_reveal_approved));
      setBlindMeetings(filteredMeetings);
    } catch (err) { setBlindMeetings([]); }
    finally { setLoadingBlind(false); }
  }, [getUserPreview]);


  const loadNiiceMatches = useCallback(async (uid: string) => {
    try {
      setLoadingNiices(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, requester_id, target_id, match_mode, connection_visibility, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`).eq("status", "accepted").eq("connection_visibility", "full_profile").order("created_at", { ascending: false });
      if (error) { setNiiceMatches([]); return; }
      const matches = await Promise.all((data || []).map(async (row: any) => {
        const otherId = row.requester_id === uid ? row.target_id : row.requester_id;
        const preview = await getUserPreview(otherId);
        const { data: conv } = await supabase.from("conversations").select("id").eq("match_request_id", row.id).maybeSingle();
        let lastMsg: any = null;
        if (conv) { const { data: msg } = await supabase.from("messages").select("content, created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(); lastMsg = msg; }
        return { id: row.id, other_user_id: otherId, full_name: preview.full_name ?? "Unknown", age: preview.age, main_photo_url: preview.main_photo_url, match_mode: row.match_mode, last_message_preview: lastMsg?.content ?? null, last_message_at: lastMsg?.created_at ?? null, from_blind_meet: false, connection_visibility: row.connection_visibility, created_at: row.created_at };
      }));
      setNiiceMatches(matches);
    } catch (err) { setNiiceMatches([]); }
    finally { setLoadingNiices(false); }
  }, [getUserPreview]);

  const loadRequests = useCallback(async (uid: string) => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, status")
        .eq("target_id", uid)
        .eq("status", "pending");
      if (error) { setIncomingRequests([]); return; }
      const incoming: MatchRequest[] = (data || []).map((row: any) => ({
        id: row.id, other_user_id: "", full_name: null, age: null, main_photo_url: null,
        match_mode: "friend", connection_visibility: "full_profile", status: row.status,
        is_incoming: true, sender_message: null, place_role: null, created_at: ""
      }));
      setIncomingRequests(incoming);
    } catch (err) { setIncomingRequests([]); }
    finally { setLoadingRequests(false); }
  }, []);

  const loadAllData = useCallback(async () => {
    const uid = await loadUserId();
    if (!uid) return;
    await loadUserPrefsAndPosition(uid);
    await Promise.all([loadNearbyUsers(uid), loadBlindMeetings(uid), loadNiiceMatches(uid), loadRequests(uid)]);
  }, [loadUserId, loadUserPrefsAndPosition, loadNearbyUsers, loadBlindMeetings, loadNiiceMatches, loadRequests]);

  useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData]));

  const handleRefresh = async () => { setRefreshing(true); await loadAllData(); setRefreshing(false); };

  // ================== FILTER APPLY ==================
  const handleApplyFilters = useCallback(async (newFilters: FilterState) => {
    setFilters(newFilters);
    if (userId) {
      await supabase.from('profiles').update({
        age_pref_min: newFilters.ageMin, age_pref_max: newFilters.ageMax,
        distance_km: newFilters.distanceKm, interested_in: newFilters.genders,
      }).eq('id', userId);
      loadNearbyUsers(userId);
    }
  }, [userId, loadNearbyUsers]);

  // ================== FRAMES ==================
  const handleOpenFrames = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await supabase.rpc('get_user_active_frames', { target_user_id: targetUserId });
      if (data && data.length > 0) {
        const processed = await Promise.all(data.map(async (frame: any) => {
          if (frame.media_url && !frame.media_url.startsWith('http')) {
            const { data: signedData } = await supabase.storage.from("frames").createSignedUrl(frame.media_url, 3600);
            return { ...frame, media_url: signedData?.signedUrl || frame.media_url };
          }
          return frame;
        }));
        setFramesData(processed);
        setShowFramesModal(true);
      }
    } catch (err) { }
  }, []);

  // ================== ACTIONS ==================
  const handleSendRequest = async (user: NearbyUser, isBlind: boolean, placeRole?: 'requester' | 'target', form?: BlindDateForm) => {
    if (!userId) return;
    try {
      if (isBlind && placeRole) {
        const { error: rpcError } = await supabase.rpc('send_blind_date_request', {
          p_target_id: user.user_id, p_match_mode: user.mode === 'friend' ? 'friend' : 'dating', p_place_role: placeRole,
          p_location_name: form?.locationName || null, p_latitude: form?.locationCoords?.lat || null,
          p_longitude: form?.locationCoords?.lng || null, p_meet_time: form?.meetTime?.toISOString() || null, p_sender_message: form?.message || null,
        });
        if (rpcError) {
          const insertData: any = { requester_id: userId, target_id: user.user_id, match_mode: user.mode === 'friend' ? 'friend' : 'dating', connection_visibility: 'blind', status: 'pending', place_role: placeRole, chat_allowed: false, sender_message: form?.message || null };
          if (placeRole === 'requester' && form) { if (form.locationName) insertData.blind_location_name = form.locationName; if (form.meetTime) insertData.blind_meet_time = form.meetTime.toISOString(); }
          const { error } = await supabase.from('match_requests').insert(insertData);
          if (error) throw error;
        }
        Alert.alert("Success", "Blind meeting request sent!");
      } else {
        const { error } = await supabase.from('match_requests').insert({ requester_id: userId, target_id: user.user_id, match_mode: user.mode === 'friend' ? 'friend' : 'dating', connection_visibility: 'full_profile', status: 'pending' });
        if (error) { if (error.code === '23505') Alert.alert("Already sent", "You've already sent a request to this person"); else throw error; }
        else Alert.alert("Success", "Friend request sent!");
      }
      if (userId) await loadRequests(userId);
    } catch (error) { Alert.alert("Error", "Failed to send request"); }
  };

  const handleViewProfile = (targetUserId: string, matchId?: string) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId || "" } });
  const handleMatchPress = (match: NiiceMatch) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: match.other_user_id, matchId: match.id } });
  const handleBlindMeetPress = (meeting: BlindMeeting) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: meeting.other_user_id, matchId: meeting.id } });

  // ================== RENDER ==================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TabToggle activeTab={activeTab} onTabChange={setActiveTab} nearbyCount={filteredNearbyUsers.length} niiceCount={niiceCount} />
      </View>

      {activeTab === "nearby" ? (
        <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.nearbyScrollContent}
          showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />}>
          
          <FilterBar filters={filters} hasActiveFilters={hasActiveFilters} onOpenFilter={() => setShowFilterModal(true)} resultCount={filteredNearbyUsers.length} />

          {loadingNearby ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={styles.loadingText}>Finding nearby people...</Text>
            </View>
          ) : filteredNearbyUsers.length === 0 ? (
            <EmptyState icon="location-outline" title="No one nearby" subtitle="Try adjusting your filters or check back later" ctaLabel="Adjust Filters" onCta={() => setShowFilterModal(true)} />
          ) : (
            filteredNearbyUsers.map((user) => (
              <NearbyUserCard key={user.user_id} user={user} currentUserId={userId} userPosition={userPosition}
                onSendRequest={handleSendRequest} onViewProfile={handleViewProfile} onOpenFrames={handleOpenFrames} />
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.niicesMeetScrollContent}
          showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />}>
          
          <View style={styles.section}>
            <SectionHeader 
              title="Your Niices" 
              onSeeAll={() => router.push("/(tabs_support)/niices_view")} 
              showArrow={true} 
            />
            {loadingNiices ? <View style={styles.loadingContainerSmall}><ActivityIndicator size="small" color={BLUE} /></View> :
              niiceMatches.length === 0 ? <View style={styles.emptyInlineState}><Text style={styles.emptyInlineText}>No Niices yet</Text></View> :
                <View style={styles.niicesList}>{niiceMatches.slice(0, 3).map((m) => <NiiceMatchCard key={m.id} match={m} onViewProfile={() => handleMatchPress(m)} onOpenChat={() => router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: m.id } })} onOpenFrames={handleOpenFrames} />)}</View>}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Upcoming Blind Meets" />
            {loadingBlind ? <View style={styles.loadingContainerSmall}><ActivityIndicator size="small" color={BLUE} /></View> :
              blindMeetings.length === 0 ? <View style={styles.emptyInlineState}><Text style={styles.emptyInlineText}>No blind meets yet</Text></View> :
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.blindMeetsScroll}>
                  {blindMeetings.map((m) => <BlindMeetingCard key={m.id} meeting={m} onPress={() => handleBlindMeetPress(m)} />)}
                </ScrollView>}
          </View>
        </ScrollView>
      )}

      <FilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} filters={filters} onApply={handleApplyFilters} defaults={userPrefs} />
      <ActiveFramesModal visible={showFramesModal} onClose={() => setShowFramesModal(false)} frames={framesData} isOwnProfile={false} />
    </SafeAreaView>
  );
}

export default NiicesScreen;

// ================== STYLES (POLISHED, NO GRADIENTS) ==================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: scale(20), paddingVertical: verticalScale(14), backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  scrollView: { flex: 1 },
  nearbyScrollContent: { paddingHorizontal: scale(20), paddingTop: verticalScale(16), paddingBottom: verticalScale(100) },
  niicesMeetScrollContent: { paddingBottom: verticalScale(100) },

  // Tab Toggle - scale(28) buttons, NO GRADIENTS
  tabToggleContainer: { flexDirection: "row", backgroundColor: "rgba(27,68,205,0.06)", borderRadius: scale(100), padding: scale(4) },
  tabToggleBtn: { flex: 1, borderRadius: scale(28), overflow: "visible", position: "relative" },
  tabToggleBtnActive: { backgroundColor: BLUE },
  tabToggleBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(10), gap: scale(6) },
  tabToggleText: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.6)", fontWeight: "500" },
  tabToggleTextActive: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFFFFF", letterSpacing: 0.2 },
  tabBadge: { 
    marginLeft: scale(6),
    backgroundColor: "rgba(10,14,26,0.1)", 
    borderRadius: scale(12), 
    paddingHorizontal: scale(8), 
    paddingVertical: verticalScale(2), 
    minWidth: scale(20), 
    alignItems: "center" 
  },
  tabBadgeActive: { 
    backgroundColor: "rgba(255,255,255,0.25)", 
  },
  tabBadgeText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.6)" 
  },
  tabBadgeTextActive: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(11), 
    color: "#FFFFFF" 
  },

    // ===== MINIMAL COMPACT NEARBY SECTION =====

  // Filter Bar
  filterBar: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20), 
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countText: {
    marginLeft: scale(6),
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    fontFamily: Fonts.primary,
  },
  iconButton: {
    padding: scale(4),
    position: "relative",
  },
  filterDotSmall: {
    position: "absolute",
    top: 2,
    right: 2,
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#1E293B",
  },

  // Compact User Row (full width, minimal height)
  rowWrapper: {
    backgroundColor: CARD_BG,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    minHeight: verticalScale(64),
  },
  
  // Avatar
  avatarContainer: {
    position: "relative",
    width: scale(44),
    height: scale(44),
    marginRight: scale(12),
  },
  avatarRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: scale(24),
    borderWidth: 2,
    borderColor: BLUE,
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "#E8F4FF",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  // User Info
  userInfo: {
    flex: 1,
    marginRight: scale(12),
  },
  userName: {
    fontSize: scale(16),
    fontWeight: "600",
    color: INK,
    fontFamily: Fonts.bold,
    marginBottom: verticalScale(2),
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    fontSize: scale(13),
    color: BLUE,
    marginLeft: scale(4),
    fontFamily: Fonts.primary,
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    backgroundColor: "rgba(139,92,246,0.1)",
    marginRight: scale(8),
  },
  statusBadgeText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: "#8B5CF6",
    fontFamily: Fonts.bold,
  },
  matchedBadge: {
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  matchedBadgeText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: Fonts.bold,
  },

  // Action Buttons (with text)
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
    gap: scale(4),
  },
  actionBtnText: {
    fontSize: scale(12),
    fontWeight: "600",
    color: BLUE,
    fontFamily: Fonts.bold,
  },

  acceptBtn: {
    backgroundColor: "#22C55E",
  },
  acceptBtnText: {
    fontSize: scale(12),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
  },
  denyBtn: {
    backgroundColor: "#EF4444",
  },
  denyBtnText: {
    fontSize: scale(12),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(76),
  },

  // Blind Flow (compact version)
  blindFlowCard: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  blindFlowTitle: {
    fontSize: scale(15),
    fontWeight: "600",
    color: INK,
    marginBottom: verticalScale(12),
    fontFamily: Fonts.bold,
  },
  blindFlowOptions: {
    flexDirection: "row",
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  blindFlowOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(12),
    backgroundColor: CARD_BG,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: BORDER,
  },
  blindFlowOptionText: {
    fontSize: scale(13),
    fontWeight: "600",
    color: BLUE,
    marginTop: verticalScale(4),
    fontFamily: Fonts.bold,
  },
  blindFlowInputs: {
    gap: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  blindFlowInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: BORDER,
  },
  blindFlowInput: {
    flex: 1,
    fontSize: scale(14),
    color: INK,
    padding: 0,
    fontFamily: Fonts.primary,
  },
  blindFlowInputText: {
    flex: 1,
    fontSize: scale(14),
    color: INK,
    fontFamily: Fonts.primary,
  },
  blindFlowActions: {
    flexDirection: "row",
    gap: scale(10),
    marginBottom: verticalScale(8),
  },
  blindFlowBackBtn: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.08)",
  },
  blindFlowBackText: {
    fontSize: scale(14),
    fontWeight: "600",
    color: BLUE,
    fontFamily: Fonts.bold,
  },
  blindFlowSendBtn: {
    flex: 1,
    borderRadius: scale(20),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  blindFlowSendText: {
    fontSize: scale(14),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
  },
  blindFlowCancel: {
    alignItems: "center",
    paddingVertical: verticalScale(6),
  },
  blindFlowCancelText: {
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    fontFamily: Fonts.primary,
  },

  // Filter Modal
  filterBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  filterContainer: { width: SCREEN_WIDTH - scale(48), maxWidth: scale(380), borderRadius: scale(20), overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  filterHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(20), paddingTop: verticalScale(20), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: BORDER },
  filterHeaderIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginRight: scale(12) },
  filterTitle: { flex: 1, fontSize: scale(20), fontFamily: Fonts.bold, color: INK, letterSpacing: 0.2 },
  filterCloseBtn: { width: scale(36), height: scale(36), borderRadius: scale(18), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,26,0.05)" },
  filterSection: { paddingHorizontal: scale(20), paddingTop: verticalScale(20) },
  filterSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: verticalScale(12) },
  filterSectionLabel: { fontSize: scale(15), fontFamily: Fonts.bold, color: INK, marginBottom: verticalScale(12) },
  filterSectionValue: { fontSize: scale(14), fontFamily: Fonts.bold, color: BLUE, marginTop: verticalScale(-11), marginLeft: scale(8) },
  filterGenderRow: { flexDirection: "row", gap: scale(10) },
  filterGenderChip: { flex: 1, paddingVertical: verticalScale(10), borderRadius: scale(28), alignItems: "center", justifyContent: "center", backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER },
  filterGenderChipActive: { borderColor: "transparent", backgroundColor: BLUE },
  filterGenderText: { fontSize: scale(14), fontFamily: Fonts.bold, color: INK, letterSpacing: 0.2 },
  filterGenderTextActive: { color: "#FFFFFF" },
  filterAgeSliderContainer: { paddingTop: verticalScale(8) },
  filterAgeSliderRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(12) },
  filterAgeSliderLabel: { fontSize: scale(14), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.6)", width: scale(70) },
  filterAgeSlider: { flex: 1, height: verticalScale(30) },
  filterAgeSliderValue: { fontSize: scale(14), fontFamily: Fonts.bold, color: INK, width: scale(35), textAlign: "right" },
  filterDistanceSliderContainer: { paddingTop: verticalScale(8), paddingBottom: verticalScale(8) },
  filterDistanceSlider: { flex: 1, height: verticalScale(30), marginBottom: verticalScale(8) },
  filterDistanceLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: scale(4) },
  filterDistanceMinLabel: { fontSize: scale(12), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)" },
  filterDistanceMaxLabel: { fontSize: scale(12), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)" },
  filterActions: { flexDirection: "row", paddingHorizontal: scale(20), paddingTop: verticalScale(24), paddingBottom: verticalScale(20), gap: scale(12) },
  filterResetBtn: { flex: 1, paddingVertical: verticalScale(14), borderRadius: scale(28), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(27,68,205,0.08)" },
  filterResetText: { fontSize: scale(15), fontFamily: Fonts.bold, color: BLUE, letterSpacing: 0.2 },
  filterApplyBtn: { flex: 1, borderRadius: scale(28), backgroundColor: BLUE, paddingVertical: verticalScale(14), alignItems: "center", justifyContent: "center" },
  filterApplyText: { fontSize: scale(15), fontFamily: Fonts.bold, color: "#FFFFFF", letterSpacing: 0.2 },



// Date Picker - NO GRADIENTS
  datePickerModal: { flex: 1, justifyContent: "flex-end" },
  datePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  datePickerContainer: { borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(20), paddingVertical: verticalScale(16), borderBottomWidth: 1, borderBottomColor: BORDER },
  datePickerCancel: { fontFamily: Fonts.primary, fontSize: scale(16), color: "rgba(10,14,26,0.5)" },
  datePickerDone: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },

  // Location Picker
  locationPickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(20), paddingVertical: verticalScale(14), borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD_BG },
  locationPickerTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK, letterSpacing: 0.2 },
  locationPickerDone: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },
  locationPickerHint: { fontFamily: Fonts.primary, fontSize: scale(13), color: "rgba(10,14,26,0.5)", textAlign: "center", paddingVertical: verticalScale(12), backgroundColor: CARD_BG },

  // Loading
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(100) },
  loadingContainerSmall: { alignItems: "center", paddingVertical: verticalScale(40) },
  loadingText: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.5)", marginTop: verticalScale(12) },

  // Empty State
  emptyState: { alignItems: "center", paddingVertical: verticalScale(60), paddingHorizontal: scale(32) },
  emptyIconContainer: { width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginBottom: verticalScale(16) },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK, marginBottom: verticalScale(8), textAlign: "center", letterSpacing: 0.2 },
  emptySubtitle: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.6)", textAlign: "center", marginBottom: verticalScale(20) },
  emptyCta: { borderRadius: scale(28), backgroundColor: BLUE, paddingHorizontal: scale(24), paddingVertical: verticalScale(12) },
  emptyCtaText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFFFFF", letterSpacing: 0.2 },
  emptyInlineState: { alignItems: "center", paddingVertical: verticalScale(24), paddingHorizontal: scale(20) },
  emptyInlineText: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.5)" },

  // Section
  section: { paddingTop: verticalScale(20) },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(20), marginBottom: verticalScale(14) },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK, letterSpacing: 0.2 },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  seeAllText: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE, letterSpacing: 0.2 },

  // Blind Meets - Clean Horizontal Scroll (Compact)
  blindMeetsScroll: { paddingHorizontal: scale(20), gap: scale(10) },
  blindCard: {
    width: scale(160),
    backgroundColor: CARD_BG,
    borderRadius: scale(20),
    padding: scale(14),
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  blindCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(12),
    borderWidth: 2,
    borderColor: "rgba(27,68,205,0.12)",
    borderStyle: "dashed",
  },
  blindCircleInner: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  blindProfileImage: {
    width: "100%",
    height: "100%",
  },
  blindName: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(6),
    letterSpacing: 0.2,
  },
  blindLocation: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(10),
    lineHeight: scale(20),
    width: "100%",
    paddingVertical: verticalScale(2),
  },
  blindTimeContainer: {
    alignItems: "center",
    width: "100%",
  },
  blindTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(16),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  blindTimeBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  blindTimeMain: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: BLUE,
    marginBottom: verticalScale(4),
  },
  blindTimeDetail: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
  },

  // Niices List - Minimal Compact Rows
  niicesList: { paddingHorizontal: 0 },
  niiceRowWrapper: {
    backgroundColor: CARD_BG,
  },
  niiceRowContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    minHeight: verticalScale(64),
  },
  niiceAvatarContainer: {
    position: "relative",
    marginRight: scale(12),
  },
  niiceAvatarRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: scale(24),
    borderWidth: 2,
    borderColor: BLUE,
  },
  niiceAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
  },
  niiceAvatarPlaceholder: {
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  niiceBlindBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: scale(20),
    height: scale(20),
    paddingHorizontal: scale(6),
    borderRadius: scale(10),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  niiceInfoSection: {
    flex: 1,
    marginRight: scale(8),
  },
  niiceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(2),
  },
  niiceName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: 0.2,
  },
  niiceMatchedBadge: {
    backgroundColor: BLUE,
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  niiceMatchedText: {
    fontFamily: Fonts.bold,
    fontSize: scale(10),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  niiceLastMessage: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
  },
  niiceLastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  niiceLastMessageMuted: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.4)",
    fontStyle: "italic",
  },
  niiceRightSection: {
    alignItems: "flex-end",
    gap: verticalScale(4),
  },
  niiceTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
  },
  niiceSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(76),
  },
});