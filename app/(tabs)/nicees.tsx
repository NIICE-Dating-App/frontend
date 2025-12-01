// app/(tabs)/(up_tab)/nicees.tsx

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

const BLUES = {
  b40: "#1840B8",
  b50: "#1B44CD",
  b60: "#2D58D6",
  b70: "#3E6BE0",
  b80: "#4E7DE9",
} as const;

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
  has_active_frame: boolean; // NEW: explicitly track if frame is currently active
  mode: string;
  approx_lat: number;
  approx_lng: number;
  last_seen: string | null;
  gender: string | null;
  // Extended profile data
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
  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
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
  return values.slice(0, 2).map(v => displayMap[v] || v.replace(/_/g, ' ')).join(' · ');
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

// ================== FILTER MODAL ==================
const FilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  defaults: UserPreferences;
}> = memo(({ visible, onClose, filters, onApply, defaults }) => {
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const [ageMinText, setAgeMinText] = useState(String(filters.ageMin));
  const [ageMaxText, setAgeMaxText] = useState(String(filters.ageMax));
  const scaleAnim = useRef(new RNAnimated.Value(0)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTempFilters(filters);
      setAgeMinText(String(filters.ageMin));
      setAgeMaxText(String(filters.ageMax));
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
    setAgeMinText(String(defaults.ageMin));
    setAgeMaxText(String(defaults.ageMax));
  }, [defaults]);

  const handleApply = useCallback(() => {
    Keyboard.dismiss();
    let finalAgeMin = parseInt(ageMinText) || 18;
    let finalAgeMax = parseInt(ageMaxText) || 99;
    finalAgeMin = Math.max(18, Math.min(99, finalAgeMin));
    finalAgeMax = Math.max(18, Math.min(99, finalAgeMax));
    if (finalAgeMin > finalAgeMax) [finalAgeMin, finalAgeMax] = [finalAgeMax, finalAgeMin];
    onApply({ ...tempFilters, ageMin: finalAgeMin, ageMax: finalAgeMax });
    onClose();
  }, [tempFilters, ageMinText, ageMaxText, onApply, onClose]);

  const toggleGender = useCallback((g: 'man' | 'woman' | 'nonbinary') => {
    Keyboard.dismiss();
    setTempFilters(prev => {
      const has = prev.genders.includes(g);
      const newGenders = has ? prev.genders.filter(x => x !== g) : [...prev.genders, g];
      if (newGenders.length === 0) return prev;
      return { ...prev, genders: newGenders };
    });
  }, []);

  const setDistance = useCallback((d: number) => {
    Keyboard.dismiss();
    setTempFilters(prev => ({ ...prev, distanceKm: d }));
  }, []);

  const GENDER_LABELS: Record<string, string> = { man: 'Men', woman: 'Women', nonbinary: 'Non-binary' };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.filterBackdrop} onPress={onClose}>
        <RNAnimated.View style={{ opacity: opacityAnim, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => Keyboard.dismiss()}>
            <RNAnimated.View style={[styles.filterContainer, { transform: [{ scale: scaleAnim }] }]}>
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
              <LinearGradient colors={["rgba(255,255,255,0.95)", "rgba(248,250,255,0.98)"]} style={StyleSheet.absoluteFillObject} />
              
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
                        {active && <LinearGradient colors={[BLUES.b60, BLUES.b80]} style={StyleSheet.absoluteFillObject} />}
                        <Text style={[styles.filterGenderText, active && styles.filterGenderTextActive]}>{GENDER_LABELS[g]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionLabel}>Age</Text>
                  <Text style={styles.filterSectionValue}>{parseInt(ageMinText) || tempFilters.ageMin} - {parseInt(ageMaxText) || tempFilters.ageMax}</Text>
                </View>
                <View style={styles.filterAgeRow}>
                  <View style={styles.filterAgeInputWrap}>
                    <TextInput style={styles.filterAgeInput} value={ageMinText} keyboardType="number-pad" maxLength={2}
                      onChangeText={(t) => setAgeMinText(t.replace(/[^0-9]/g, ''))}
                      onBlur={() => { let v = Math.max(18, Math.min(99, parseInt(ageMinText) || 18)); setAgeMinText(String(v)); setTempFilters(p => ({ ...p, ageMin: v })); }}
                    />
                    <Text style={styles.filterAgeLabel}>min</Text>
                  </View>
                  <View style={styles.filterAgeDash} />
                  <View style={styles.filterAgeInputWrap}>
                    <TextInput style={styles.filterAgeInput} value={ageMaxText} keyboardType="number-pad" maxLength={2}
                      onChangeText={(t) => setAgeMaxText(t.replace(/[^0-9]/g, ''))}
                      onBlur={() => { let v = Math.max(18, Math.min(99, parseInt(ageMaxText) || 99)); setAgeMaxText(String(v)); setTempFilters(p => ({ ...p, ageMax: v })); }}
                    />
                    <Text style={styles.filterAgeLabel}>max</Text>
                  </View>
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Text style={styles.filterSectionLabel}>Distance</Text>
                  <Text style={styles.filterSectionValue}>{tempFilters.distanceKm < 1 ? `${Math.round(tempFilters.distanceKm * 1000)}m` : `${tempFilters.distanceKm}km`}</Text>
                </View>
                <View style={styles.filterDistanceRow}>
                  {[0.5, 1, 2, 3, 4].map(d => {
                    const active = tempFilters.distanceKm === d;
                    return (
                      <Pressable key={d} onPress={() => setDistance(d)}
                        style={[styles.filterDistanceChip, active && styles.filterDistanceChipActive]}>
                        {active && <LinearGradient colors={[BLUES.b60, BLUES.b80]} style={StyleSheet.absoluteFillObject} />}
                        <Text style={[styles.filterDistanceText, active && styles.filterDistanceTextActive]}>{d < 1 ? `${d * 1000}m` : `${d}km`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterActions}>
                <Pressable onPress={handleReset} style={styles.filterResetBtn}>
                  <Text style={styles.filterResetText}>Reset</Text>
                </Pressable>
                <Pressable onPress={handleApply} style={styles.filterApplyBtn}>
                  <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.filterApplyGradient}>
                    <Text style={styles.filterApplyText}>Apply</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </RNAnimated.View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
});

// ================== TOP TAB TOGGLE ==================
interface TabToggleProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  nearbyCount: number;
  requestCount: number;
}

const TabToggle: React.FC<TabToggleProps> = ({ activeTab, onTabChange, nearbyCount, requestCount }) => (
  <View style={styles.tabToggleContainer}>
    <TouchableOpacity style={[styles.tabToggleBtn, activeTab === "nearby" && styles.tabToggleBtnActive]}
      onPress={() => onTabChange("nearby")} activeOpacity={0.8}>
      {activeTab === "nearby" ? (
        <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.tabToggleBtnGradient}>
          <Ionicons name="location" size={18} color="#FFFFFF" />
          <Text style={styles.tabToggleTextActive}>Nearby</Text>
        </LinearGradient>
      ) : (
        <View style={styles.tabToggleBtnInner}>
          <Ionicons name="location-outline" size={18} color="rgba(10,14,26,0.6)" />
          <Text style={styles.tabToggleText}>Nearby</Text>
        </View>
      )}
    </TouchableOpacity>

    <TouchableOpacity style={[styles.tabToggleBtn, activeTab === "niices_meet" && styles.tabToggleBtnActive]}
      onPress={() => onTabChange("niices_meet")} activeOpacity={0.8}>
      {activeTab === "niices_meet" ? (
        <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.tabToggleBtnGradient}>
          <Ionicons name="heart" size={18} color="#FFFFFF" />
          <Text style={styles.tabToggleTextActive}>Niices & Meet</Text>
          {requestCount > 0 && <View style={styles.tabToggleBadgeActive}><Text style={styles.tabToggleBadgeTextActive}>{requestCount}</Text></View>}
        </LinearGradient>
      ) : (
        <View style={styles.tabToggleBtnInner}>
          <Ionicons name="heart-outline" size={18} color="rgba(10,14,26,0.6)" />
          <Text style={styles.tabToggleText}>Niices & Meet</Text>
          {requestCount > 0 && <View style={[styles.tabToggleBadge, styles.tabToggleBadgeHighlight]}><Text style={[styles.tabToggleBadgeText, styles.tabToggleBadgeTextHighlight]}>{requestCount}</Text></View>}
        </View>
      )}
    </TouchableOpacity>
  </View>
);

// ================== FILTER BAR ==================
interface FilterBarProps {
  filters: FilterState;
  hasActiveFilters: boolean;
  onOpenFilter: () => void;
  resultCount: number;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, hasActiveFilters, onOpenFilter, resultCount }) => (
  <View style={styles.filterBar}>
    <TouchableOpacity style={[styles.filterBarBtn, hasActiveFilters && styles.filterBarBtnActive]} onPress={onOpenFilter} activeOpacity={0.8}>
      {hasActiveFilters ? (
        <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.filterBarBtnGradient}>
          <Ionicons name="options" size={18} color="#FFFFFF" />
          <Text style={styles.filterBarBtnTextActive}>Filters</Text>
          <View style={styles.filterBarDot} />
        </LinearGradient>
      ) : (
        <>
          <Ionicons name="options-outline" size={18} color={BLUE} />
          <Text style={styles.filterBarBtnText}>Filters</Text>
        </>
      )}
    </TouchableOpacity>
    
    <View style={styles.filterBarInfo}>
      <Text style={styles.filterBarInfoText}>
        {resultCount} {resultCount === 1 ? 'person' : 'people'} nearby
      </Text>
    </View>
  </View>
);

// ================== NEARBY USER CARD (NEW HORIZONTAL LAYOUT) ==================
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

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setBlindDateForm(prev => ({ ...prev, meetTime: selectedDate }));
  };

  const isMatched = matchStatus?.status === 'accepted';
  const isPending = matchStatus?.status === 'pending';
  const isRequester = matchStatus?.is_requester;
  const hasActiveFrame = user.has_active_frame; // Use the explicit flag

  const lookingForDisplay = formatLookingForFriend(user.looking_for_friend || null);
  const valueDisplay = formatValueFriend(user.value_friend || null);
  const orientationDisplay = formatOrientation(user.sexual_orientation || null);

  return (
    <View style={styles.nearbyCard}>
      {/* Main Card Content - Horizontal Layout */}
      <View style={styles.nearbyCardMain}>
        {/* Circular Profile Photo on Left */}
        <TouchableOpacity 
          style={styles.nearbyAvatarContainer}
          onPress={() => hasActiveFrame ? onOpenFrames(user.user_id) : onViewProfile(user.user_id)} 
          activeOpacity={0.9}
        >
          {/* Active Frame Ring */}
          {hasActiveFrame && (
            <LinearGradient 
              colors={[BLUE, "#678CFF", BLUES.b50]} 
              style={styles.nearbyAvatarRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={[styles.nearbyAvatarInner, hasActiveFrame && styles.nearbyAvatarInnerWithRing]}>
            {user.main_photo_url ? (
              <Image source={{ uri: user.main_photo_url }} style={styles.nearbyAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.nearbyAvatarPlaceholder}>
                <Ionicons name="person" size={32} color="rgba(27,68,205,0.3)" />
              </View>
            )}
          </View>
          {/* Active Frame Badge */}
          {hasActiveFrame && (
            <View style={styles.nearbyFrameBadge}>
              <Ionicons name="play-circle" size={16} color={BLUE} />
            </View>
          )}
        </TouchableOpacity>

        {/* Info Section on Right */}
        <View style={styles.nearbyCardContent}>
          {/* Name, Age, Distance Row */}
          <View style={styles.nearbyHeaderRow}>
            <View style={styles.nearbyNameContainer}>
              <Text style={styles.nearbyName} numberOfLines={1}>{user.full_name}</Text>
              {user.age && <Text style={styles.nearbyAge}>, {user.age}</Text>}
            </View>
            {distance && (
              <View style={styles.nearbyDistanceBadge}>
                <Ionicons name="location" size={11} color={BLUE} />
                <Text style={styles.nearbyDistanceText}>{distance}</Text>
              </View>
            )}
          </View>

          {/* Profile chips */}
          {(lookingForDisplay || orientationDisplay || valueDisplay) && (
            <View style={styles.nearbyChipsRow}>
              {orientationDisplay && (
                <View style={styles.nearbyChip}>
                  <Ionicons name="sparkles-outline" size={10} color={BLUE} style={{ marginRight: 3 }} />
                  <Text style={styles.nearbyChipText}>{orientationDisplay}</Text>
                </View>
              )}
              {lookingForDisplay && (
                <View style={styles.nearbyChip}>
                  <Ionicons name="search-outline" size={10} color={BLUE} style={{ marginRight: 3 }} />
                  <Text style={styles.nearbyChipText} numberOfLines={1}>{lookingForDisplay}</Text>
                </View>
              )}
              {valueDisplay && (
                <View style={styles.nearbyChip}>
                  <Ionicons name="heart-outline" size={10} color={BLUE} style={{ marginRight: 3 }} />
                  <Text style={styles.nearbyChipText} numberOfLines={1}>{valueDisplay}</Text>
                </View>
              )}
            </View>
          )}

          {/* Bio */}
          {user.bio && <Text style={styles.nearbyBio} numberOfLines={2}>{user.bio}</Text>}

          {/* Status Badge */}
          {isMatched && (
            <View style={[styles.nearbyStatusBadge, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={[styles.nearbyStatusText, { color: "#4CAF50" }]}>Connected</Text>
            </View>
          )}
          {isPending && isRequester && (
            <View style={[styles.nearbyStatusBadge, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="time-outline" size={12} color="#FF9800" />
              <Text style={[styles.nearbyStatusText, { color: "#FF9800" }]}>Request sent</Text>
            </View>
          )}
          {isPending && !isRequester && (
            <View style={[styles.nearbyStatusBadge, { backgroundColor: "rgba(27,68,205,0.08)" }]}>
              <Ionicons name="mail-outline" size={12} color={BLUE} />
              <Text style={[styles.nearbyStatusText, { color: BLUE }]}>Wants to connect!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {!blindDateStep && !isMatched && !isPending && (
        <View style={styles.nearbyActions}>
          <TouchableOpacity style={styles.nearbyPrimaryBtn} onPress={handleBlindMeetingStart} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.nearbyPrimaryBtnGradient}>
              <Ionicons name="eye-off-outline" size={16} color="#FFFFFF" />
              <Text style={styles.nearbyPrimaryBtnText}>Blind Meeting</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nearbySecondaryBtn} onPress={handleSendFriendRequest} disabled={loading} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={16} color={BLUE} />
            <Text style={styles.nearbySecondaryBtnText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      )}

      {isMatched && (
        <View style={styles.nearbyActions}>
          <TouchableOpacity style={styles.nearbySecondaryBtn} onPress={() => onViewProfile(user.user_id)} activeOpacity={0.85}>
            <Ionicons name="person-outline" size={16} color={BLUE} />
            <Text style={styles.nearbySecondaryBtnText}>View Profile</Text>
          </TouchableOpacity>
          {matchStatus?.chat_allowed && (
            <TouchableOpacity style={styles.nearbyPrimaryBtn}
              onPress={() => router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: matchStatus.match_id } })} activeOpacity={0.85}>
              <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.nearbyPrimaryBtnGradient}>
                <Ionicons name="chatbubbles-outline" size={16} color="#FFFFFF" />
                <Text style={styles.nearbyPrimaryBtnText}>Chat</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Blind Meeting Flow: Step 1 */}
      {blindDateStep === 'place_role' && (
        <View style={styles.blindFlow}>
          <Text style={styles.blindFlowTitle}>Who picks the place?</Text>
          <Text style={styles.blindFlowDesc}>Profiles stay hidden until after meetup</Text>
          <View style={styles.blindFlowOptions}>
            <TouchableOpacity style={styles.blindFlowOption} onPress={() => handlePlaceRoleSelect('requester')} activeOpacity={0.8}>
              <View style={styles.blindFlowOptionIcon}><Ionicons name="location" size={20} color={BLUE} /></View>
              <Text style={styles.blindFlowOptionText}>I'll pick</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowOption} onPress={() => handlePlaceRoleSelect('target')} activeOpacity={0.8}>
              <View style={styles.blindFlowOptionIcon}><Ionicons name="person" size={20} color={BLUE} /></View>
              <Text style={styles.blindFlowOptionText}>They pick</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}><Text style={styles.blindFlowCancelText}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      {/* Blind Meeting Flow: Step 2 - Details */}
      {blindDateStep === 'details' && (
        <View style={styles.blindFlow}>
          <Text style={styles.blindFlowTitle}>Suggest a spot</Text>
          <View style={styles.blindFlowInputs}>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="business-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput style={styles.blindFlowInput} placeholder="Place name (e.g., Coffee Shop)" placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.locationName} onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, locationName: text }))} />
            </View>
            <TouchableOpacity style={styles.blindFlowInputWrap} onPress={() => { setTempPickedLocation(blindDateForm.locationCoords || userPosition); setShowLocationPicker(true); }}>
              <Ionicons name="location-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <Text style={[styles.blindFlowInputText, !blindDateForm.locationCoords && { color: "rgba(10,14,26,0.4)" }]}>
                {blindDateForm.locationCoords ? '📍 Location set' : 'Pick location on map'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(10,14,26,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowInputWrap} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <Text style={[styles.blindFlowInputText, !blindDateForm.meetTime && { color: "rgba(10,14,26,0.4)" }]}>{formatDateTime(blindDateForm.meetTime)}</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(10,14,26,0.3)" />
            </TouchableOpacity>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput style={[styles.blindFlowInput, { flex: 1 }]} placeholder="Say something... (optional)" placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.message} onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, message: text }))} maxLength={200} />
            </View>
          </View>
          <View style={styles.blindFlowActions}>
            <TouchableOpacity style={styles.blindFlowBackBtn} onPress={() => setBlindDateStep('place_role')}><Text style={styles.blindFlowBackText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.blindFlowSendBtn, (!blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime) && { opacity: 0.5 }]}
              onPress={handleSendBlindRequest} disabled={loading || !blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime}>
              <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.blindFlowSendGradient}>
                <Text style={styles.blindFlowSendText}>{loading ? 'Sending...' : 'Send Request'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}><Text style={styles.blindFlowCancelText}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      {/* Blind Meeting Flow: Message only */}
      {blindDateStep === 'message_only' && (
        <View style={styles.blindFlow}>
          <Text style={styles.blindFlowTitle}>Add a message</Text>
          <Text style={styles.blindFlowDesc}>Let them pick the spot</Text>
          <View style={styles.blindFlowInputs}>
            <View style={styles.blindFlowInputWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
              <TextInput style={[styles.blindFlowInput, { flex: 1 }]} placeholder="Say something... (optional)" placeholderTextColor="rgba(10,14,26,0.4)"
                value={blindDateForm.message} onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, message: text }))} maxLength={200} />
            </View>
          </View>
          <View style={styles.blindFlowActions}>
            <TouchableOpacity style={styles.blindFlowBackBtn} onPress={() => setBlindDateStep('place_role')}><Text style={styles.blindFlowBackText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.blindFlowSendBtn} onPress={handleSendBlindRequest} disabled={loading}>
              <LinearGradient colors={[BLUES.b50, BLUES.b70]} style={styles.blindFlowSendGradient}>
                <Text style={styles.blindFlowSendText}>{loading ? 'Sending...' : 'Send Request'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.blindFlowCancel} onPress={() => setBlindDateStep(null)}><Text style={styles.blindFlowCancelText}>Cancel</Text></TouchableOpacity>
        </View>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <TouchableOpacity style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)} />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.datePickerCancel}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.datePickerDone}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={blindDateForm.meetTime || new Date()} mode="datetime" display="spinner" onChange={handleDateChange} minimumDate={new Date()} />
            </View>
          </View>
        </Modal>
      )}

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <View style={styles.locationPickerHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}><Ionicons name="close" size={24} color={INK} /></TouchableOpacity>
            <Text style={styles.locationPickerTitle}>Pick Location</Text>
            <TouchableOpacity onPress={() => { if (tempPickedLocation) setBlindDateForm(prev => ({ ...prev, locationCoords: tempPickedLocation })); setShowLocationPicker(false); }}>
              <Text style={styles.locationPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <MapView style={{ flex: 1 }} provider={PROVIDER_GOOGLE}
            initialRegion={{ latitude: tempPickedLocation?.lat || userPosition?.lat || 41.9028, longitude: tempPickedLocation?.lng || userPosition?.lng || 12.4964, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
            onPress={(e) => setTempPickedLocation({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}>
            {tempPickedLocation && <Marker coordinate={{ latitude: tempPickedLocation.lat, longitude: tempPickedLocation.lng }} pinColor={BLUE} />}
          </MapView>
          <Text style={styles.locationPickerHint}>Tap on the map to select a location</Text>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// ================== EMPTY STATE ==================
const EmptyState: React.FC<{ icon: string; title: string; subtitle: string; ctaLabel?: string; onCta?: () => void }> = ({ icon, title, subtitle, ctaLabel, onCta }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}><Ionicons name={icon as any} size={32} color={BLUE} /></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {ctaLabel && onCta && <TouchableOpacity style={styles.emptyCta} onPress={onCta} activeOpacity={0.85}><Text style={styles.emptyCtaText}>{ctaLabel}</Text></TouchableOpacity>}
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

// ================== BLIND MEETING CARD ==================
const BlindMeetingCard: React.FC<{ meeting: BlindMeeting; onPress: () => void }> = ({ meeting, onPress }) => {
  const isHappening = meeting.blind_meet_time && new Date(meeting.blind_meet_time) <= new Date();
  const isPast = meeting.blind_meet_time && new Date(meeting.blind_meet_time).getTime() + 3600000 < Date.now();

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.blindMeetCard}>
      <LinearGradient colors={["rgba(27,68,205,0.08)", "rgba(27,68,205,0.02)"]} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.blindMeetStatus, isHappening && !isPast && styles.blindMeetStatusActive]}>
        <Ionicons name={isPast ? "checkmark-circle" : isHappening ? "radio-button-on" : "time-outline"} size={12} color={isPast ? "#22C55E" : isHappening ? "#F59E0B" : BLUE} />
        <Text style={[styles.blindMeetStatusText, isHappening && !isPast && styles.blindMeetStatusTextActive, isPast && { color: "#22C55E" }]}>
          {isPast ? "Review now" : isHappening ? "Happening now" : formatMeetingDate(meeting.blind_meet_time)}
        </Text>
      </View>
      <View style={styles.blindMeetAvatarContainer}>
        <LinearGradient colors={[BLUE, "#4E7DE9"]} style={styles.blindMeetAvatarGradient}><Ionicons name="help" size={32} color="#FFFFFF" /></LinearGradient>
      </View>
      <View style={styles.blindMeetModeBadge}>
        <Text style={styles.blindMeetModeText}>{meeting.match_mode === "dating" ? "☕ Blind Date" : "🤝 Blind Meet"}</Text>
      </View>
      {meeting.blind_location_name && (
        <View style={styles.blindMeetLocation}><Ionicons name="location-outline" size={14} color="rgba(10,14,26,0.6)" /><Text style={styles.blindMeetLocationText} numberOfLines={1}>{meeting.blind_location_name}</Text></View>
      )}
    </TouchableOpacity>
  );
};

// ================== NIICE MATCH CARD ==================
const NiiceMatchCard: React.FC<{ match: NiiceMatch; onPress: () => void }> = ({ match, onPress }) => (
  <TouchableOpacity style={styles.niiceCard} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.niiceCardBody}>
      <View style={styles.niiceAvatarContainer}>
        {match.main_photo_url ? <Image source={{ uri: match.main_photo_url }} style={styles.niiceAvatar} /> :
          <View style={styles.niiceAvatarPlaceholder}><Ionicons name="person" size={28} color="rgba(10,14,26,0.4)" /></View>}
        {match.from_blind_meet && <View style={styles.niiceBlindBadge}><Ionicons name="eye-off" size={10} color="#FFFFFF" /></View>}
      </View>
      <View style={styles.niiceInfo}>
        <Text style={styles.niiceName} numberOfLines={1}>{match.full_name}{match.age ? `, ${match.age}` : ""}</Text>
        {match.last_message_preview ? <Text style={styles.niiceLastMessage} numberOfLines={1}>{match.last_message_preview}</Text> :
          <Text style={styles.niiceLastMessageMuted}>Say hi and break the ice 👋</Text>}
        <Text style={styles.niiceMeta}>{match.last_message_at ? `Last talked ${formatRelativeTime(match.last_message_at)}` : `Matched ${formatRelativeTime(match.created_at)}`}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
    </View>
  </TouchableOpacity>
);

// ================== MAIN SCREEN ==================
function NiicesScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<MainTab>("nearby");
  const [userId, setUserId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Filter state (synced with profile preferences)
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({ ageMin: 18, ageMax: 99, distanceKm: 4, interestedIn: ['man', 'woman', 'nonbinary'] });
  const [filters, setFilters] = useState<FilterState>({ ageMin: 18, ageMax: 99, distanceKm: 4, genders: ['man', 'woman', 'nonbinary'] });

  // Frames modal
  const [showFramesModal, setShowFramesModal] = useState(false);
  const [framesData, setFramesData] = useState<any[]>([]);

  // Data states
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [blindMeetings, setBlindMeetings] = useState<BlindMeeting[]>([]);
  const [niiceMatches, setNiiceMatches] = useState<NiiceMatch[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);

  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingBlind, setLoadingBlind] = useState(false);
  const [loadingNiices, setLoadingNiices] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter nearby users based on filters
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

  const requestCount = incomingRequests.filter(r => r.status === "pending").length;

  // ================== DATA LOADING ==================
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
      if (error || !data) { setNearbyUsers([]); return; }

      // Fetch gender + extended data for all users
      const userIds = data.map((u: any) => u.user_id);
      const { data: profileData } = await supabase.from('profiles').select('id, gender, sexual_orientation').in('id', userIds);
      const profileMap: Record<string, any> = {};
      profileData?.forEach((p: any) => { profileMap[p.id] = p; });

      // Fetch friend mode data
      const friendModePromises = data.map(async (u: any) => {
        try {
          const { data: fmData } = await supabase.rpc('get_user_friend_mode', { target_user_id: u.user_id });
          return { userId: u.user_id, data: fmData?.[0] || null };
        } catch { return { userId: u.user_id, data: null }; }
      });
      const friendModeResults = await Promise.all(friendModePromises);
      const friendModeMap: Record<string, any> = {};
      friendModeResults.forEach(r => { friendModeMap[r.userId] = r.data; });

      const users: NearbyUser[] = await Promise.all(
        data.map(async (row: any) => {
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
            has_active_frame: !!row.frame_id, // Trust profile.frame_id like map.tsx does
            mode: row.mode ?? 'friend',
            approx_lat: row.approx_lat ?? 0, approx_lng: row.approx_lng ?? 0, last_seen: null,
            gender: profile.gender?.toLowerCase() || null, sexual_orientation: profile.sexual_orientation || null,
            looking_for_friend: friendMode.looking_for_friend || null, value_friend: friendMode.value_friend || null,
          };
        })
      );
      setNearbyUsers(users);
    } catch (err) { console.log("Error loading nearby:", err); setNearbyUsers([]); }
    finally { setLoadingNearby(false); }
  }, []);

  const loadBlindMeetings = useCallback(async (uid: string) => {
    try {
      setLoadingBlind(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, requester_id, target_id, match_mode, blind_meet_time, blind_location_name, requester_reveal_approved, target_reveal_approved, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`).eq("connection_visibility", "blind").eq("status", "accepted").order("blind_meet_time", { ascending: true });
      if (error) { setBlindMeetings([]); return; }
      const meetings = (data || []).map((row: any) => ({
        id: row.id, other_user_id: row.requester_id === uid ? row.target_id : row.requester_id,
        full_name: null, age: null, main_photo_url: null, match_mode: row.match_mode,
        blind_meet_time: row.blind_meet_time, blind_location_name: row.blind_location_name,
        requester_reveal_approved: row.requester_reveal_approved ?? false, target_reveal_approved: row.target_reveal_approved ?? false,
        is_requester: row.requester_id === uid, created_at: row.created_at,
      })).filter((m: any) => !(m.requester_reveal_approved && m.target_reveal_approved));
      setBlindMeetings(meetings);
    } catch (err) { setBlindMeetings([]); }
    finally { setLoadingBlind(false); }
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
      // Only load incoming pending requests for the badge count
      const { data, error } = await supabase.from("match_requests")
        .select("id, status")
        .eq("target_id", uid)
        .eq("status", "pending");
      if (error) { setIncomingRequests([]); return; }
      // Map to minimal MatchRequest objects for the count
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
    } catch (err) { console.log("Error loading frames:", err); }
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
    } catch (error) { console.error("Error sending request:", error); Alert.alert("Error", "Failed to send request"); }
  };

  const handleViewProfile = (targetUserId: string, matchId?: string) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId || "" } });
  const handleMatchPress = (match: NiiceMatch) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: match.other_user_id, matchId: match.id } });
  const handleBlindMeetPress = (meeting: BlindMeeting) => router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: meeting.id } });

  // ================== RENDER ==================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TabToggle activeTab={activeTab} onTabChange={setActiveTab} nearbyCount={filteredNearbyUsers.length} requestCount={requestCount} />
      </View>

      {activeTab === "nearby" ? (
        <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.nearbyScrollContent}
          showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />}>
          
          {/* Filter Bar */}
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
          
          {/* Your Niices - Now at top with latest 3 and arrow to view all */}
          <View style={styles.section}>
            <SectionHeader 
              title="Your Niices" 
              onSeeAll={() => router.push("/(tabs_support)/niices_view")} 
              showArrow={true} 
            />
            {loadingNiices ? <View style={styles.loadingContainerSmall}><ActivityIndicator size="small" color={BLUE} /></View> :
              niiceMatches.length === 0 ? <View style={styles.emptyInlineState}><Text style={styles.emptyInlineText}>No Niices yet</Text></View> :
                <View style={styles.niicesList}>{niiceMatches.slice(0, 3).map((m) => <NiiceMatchCard key={m.id} match={m} onPress={() => handleMatchPress(m)} />)}</View>}
          </View>

          {/* Upcoming Blind Meetings - Now below Your Niices */}
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

      {/* Filter Modal */}
      <FilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} filters={filters} onApply={handleApplyFilters} defaults={userPrefs} />

      {/* Frames Modal */}
      <ActiveFramesModal visible={showFramesModal} onClose={() => setShowFramesModal(false)} frames={framesData} isOwnProfile={false} />
    </SafeAreaView>
  );
}

export default NiicesScreen;

// ================== STYLES ==================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "rgba(27,68,205,0.06)" },
  scrollView: { flex: 1 },
  nearbyScrollContent: { paddingHorizontal: scale(16), paddingTop: verticalScale(8), paddingBottom: verticalScale(100) },
  niicesMeetScrollContent: { paddingBottom: verticalScale(100) },

  // Tab Toggle
  tabToggleContainer: { flexDirection: "row", backgroundColor: "rgba(27,68,205,0.04)", borderRadius: scale(16), padding: scale(4) },
  tabToggleBtn: { flex: 1, borderRadius: scale(12), overflow: "hidden" },
  tabToggleBtnActive: {},
  tabToggleBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(12), gap: scale(6) },
  tabToggleBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(12), gap: scale(6) },
  tabToggleText: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.6)" },
  tabToggleTextActive: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFFFFF" },
  tabToggleBadge: { backgroundColor: "rgba(10,14,26,0.08)", borderRadius: scale(10), paddingHorizontal: scale(6), paddingVertical: verticalScale(2), minWidth: scale(20), alignItems: "center" },
  tabToggleBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabToggleBadgeHighlight: { backgroundColor: BLUE },
  tabToggleBadgeText: { fontFamily: Fonts.bold, fontSize: scale(11), color: "rgba(10,14,26,0.5)" },
  tabToggleBadgeTextActive: { color: "#FFFFFF" },
  tabToggleBadgeTextHighlight: { color: "#FFFFFF" },

  // Filter Bar
  filterBar: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(12), gap: scale(12) },
  filterBarBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(27,68,205,0.06)", borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: verticalScale(10), gap: scale(6), borderWidth: 1, borderColor: "rgba(27,68,205,0.12)" },
  filterBarBtnActive: { borderColor: "transparent", overflow: "hidden" },
  filterBarBtnGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(14), paddingVertical: verticalScale(10), gap: scale(6), marginHorizontal: scale(-14), marginVertical: verticalScale(-10) },
  filterBarBtnText: { fontFamily: Fonts.bold, fontSize: scale(13), color: BLUE },
  filterBarBtnTextActive: { fontFamily: Fonts.bold, fontSize: scale(13), color: "#FFFFFF" },
  filterBarDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: "#FF4757" },
  filterBarInfo: { flex: 1 },
  filterBarInfoText: { fontFamily: Fonts.primary, fontSize: scale(13), color: "rgba(10,14,26,0.5)" },

  // Filter Modal
  filterBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  filterContainer: { width: SCREEN_WIDTH - scale(48), maxWidth: scale(380), borderRadius: scale(24), overflow: "hidden" },
  filterHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(20), paddingTop: verticalScale(20), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: "rgba(27,68,205,0.08)" },
  filterHeaderIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginRight: scale(12) },
  filterTitle: { flex: 1, fontSize: scale(20), fontFamily: Fonts.bold, color: "#0A0E1A" },
  filterCloseBtn: { width: scale(36), height: scale(36), borderRadius: scale(18), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,26,0.05)" },
  filterSection: { paddingHorizontal: scale(20), paddingTop: verticalScale(20) },
  filterSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: verticalScale(12) },
  filterSectionLabel: { fontSize: scale(14), fontFamily: Fonts.bold, color: "#0A0E1A", marginBottom: verticalScale(12) },
  filterSectionValue: { fontSize: scale(14), fontFamily: Fonts.bold, color: BLUE },
  filterGenderRow: { flexDirection: "row", gap: scale(10) },
  filterGenderChip: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(14), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(27,68,205,0.06)", borderWidth: 1.5, borderColor: "rgba(27,68,205,0.15)", overflow: "hidden" },
  filterGenderChipActive: { borderColor: "transparent" },
  filterGenderText: { fontSize: scale(14), fontFamily: Fonts.bold, color: BLUES.b40 },
  filterGenderTextActive: { color: "#FFFFFF" },
  filterAgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scale(16) },
  filterAgeInputWrap: { alignItems: "center", gap: verticalScale(6) },
  filterAgeInput: { width: scale(72), height: verticalScale(48), borderRadius: scale(14), backgroundColor: "rgba(27,68,205,0.06)", borderWidth: 1.5, borderColor: "rgba(27,68,205,0.15)", textAlign: "center", fontSize: scale(18), fontFamily: Fonts.bold, color: "#0A0E1A" },
  filterAgeLabel: { fontSize: scale(12), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)" },
  filterAgeDash: { width: scale(20), height: 2, backgroundColor: "rgba(27,68,205,0.2)", borderRadius: 1 },
  filterDistanceRow: { flexDirection: "row", gap: scale(8) },
  filterDistanceChip: { flex: 1, paddingVertical: verticalScale(12), borderRadius: scale(12), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(27,68,205,0.06)", borderWidth: 1.5, borderColor: "rgba(27,68,205,0.15)", overflow: "hidden" },
  filterDistanceChipActive: { borderColor: "transparent" },
  filterDistanceText: { fontSize: scale(13), fontFamily: Fonts.bold, color: BLUES.b40 },
  filterDistanceTextActive: { color: "#FFFFFF" },
  filterActions: { flexDirection: "row", paddingHorizontal: scale(20), paddingTop: verticalScale(24), paddingBottom: verticalScale(20), gap: scale(12) },
  filterResetBtn: { flex: 1, paddingVertical: verticalScale(14), borderRadius: scale(14), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,26,0.05)" },
  filterResetText: { fontSize: scale(15), fontFamily: Fonts.bold, color: "rgba(10,14,26,0.5)" },
  filterApplyBtn: { flex: 1, borderRadius: scale(14), overflow: "hidden" },
  filterApplyGradient: { paddingVertical: verticalScale(14), alignItems: "center", justifyContent: "center" },
  filterApplyText: { fontSize: scale(15), fontFamily: Fonts.bold, color: "#FFFFFF" },

  // NEW Nearby Card - Horizontal Layout
  nearbyCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: scale(16), 
    marginBottom: verticalScale(12), 
    padding: scale(14),
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.06)",
  },
  nearbyCardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  // Circular Avatar
  nearbyAvatarContainer: {
    position: "relative",
    marginRight: scale(14),
    width: scale(76),
    height: scale(76),
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyAvatarRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scale(38),
  },
  nearbyAvatarInner: {
    width: scale(68),
    height: scale(68),
    borderRadius: scale(34),
    overflow: "hidden",
    backgroundColor: "#E8F4FF",
  },
  nearbyAvatarInnerWithRing: {
    // Ring is visible around the inner avatar
  },
  nearbyAvatar: {
    width: "100%",
    height: "100%",
  },
  nearbyAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F4FF",
  },
  nearbyFrameBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Content on Right
  nearbyCardContent: {
    flex: 1,
  },
  nearbyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(6),
  },
  nearbyNameContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
    marginRight: scale(8),
  },
  nearbyName: {
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: INK,
  },
  nearbyAge: {
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    color: "rgba(10,14,26,0.7)",
  },
  nearbyDistanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    gap: scale(3),
  },
  nearbyDistanceText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: BLUE,
  },
  nearbyChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(6),
    marginBottom: verticalScale(6),
  },
  nearbyChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  nearbyChipText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: BLUE,
  },
  nearbyBio: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.7)",
    lineHeight: scale(18),
    marginBottom: verticalScale(6),
  },
  nearbyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    gap: scale(5),
  },
  nearbyStatusText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
  },
  // Action Buttons
  nearbyActions: {
    flexDirection: "row",
    gap: scale(10),
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(27,68,205,0.06)",
  },
  nearbyPrimaryBtn: {
    flex: 1,
    borderRadius: scale(12),
    overflow: "hidden",
  },
  nearbyPrimaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    gap: scale(6),
  },
  nearbyPrimaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#FFFFFF",
  },
  nearbySecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.2)",
    paddingVertical: verticalScale(12),
    gap: scale(6),
  },
  nearbySecondaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: BLUE,
  },

  // Blind Flow
  blindFlow: { paddingTop: verticalScale(12), marginTop: verticalScale(12), borderTopWidth: 1, borderTopColor: "rgba(27,68,205,0.06)" },
  blindFlowTitle: { fontFamily: Fonts.bold, fontSize: scale(15), color: INK, marginBottom: verticalScale(4) },
  blindFlowDesc: { fontFamily: Fonts.primary, fontSize: scale(12), color: "rgba(10,14,26,0.6)", marginBottom: verticalScale(12) },
  blindFlowOptions: { flexDirection: "row", gap: scale(10), marginBottom: verticalScale(12) },
  blindFlowOption: { flex: 1, alignItems: "center", padding: scale(12), backgroundColor: "rgba(27,68,205,0.04)", borderRadius: scale(12), borderWidth: 1.5, borderColor: "rgba(27,68,205,0.12)" },
  blindFlowOptionIcon: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginBottom: verticalScale(6) },
  blindFlowOptionText: { fontFamily: Fonts.bold, fontSize: scale(13), color: INK },
  blindFlowInputs: { gap: verticalScale(8), marginBottom: verticalScale(12) },
  blindFlowInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(27,68,205,0.04)", borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: verticalScale(10), borderWidth: 1, borderColor: "rgba(27,68,205,0.08)" },
  blindFlowInput: { flex: 1, fontFamily: Fonts.primary, fontSize: scale(13), color: INK, padding: 0 },
  blindFlowInputText: { flex: 1, fontFamily: Fonts.primary, fontSize: scale(13), color: INK },
  blindFlowActions: { flexDirection: "row", gap: scale(10), marginBottom: verticalScale(8) },
  blindFlowBackBtn: { paddingVertical: verticalScale(10), paddingHorizontal: scale(16), borderRadius: scale(10), backgroundColor: "rgba(10,14,26,0.05)" },
  blindFlowBackText: { fontFamily: Fonts.bold, fontSize: scale(13), color: "rgba(10,14,26,0.5)" },
  blindFlowSendBtn: { flex: 1, borderRadius: scale(10), overflow: "hidden" },
  blindFlowSendGradient: { paddingVertical: verticalScale(10), alignItems: "center", justifyContent: "center" },
  blindFlowSendText: { fontFamily: Fonts.bold, fontSize: scale(13), color: "#FFFFFF" },
  blindFlowCancel: { alignItems: "center", paddingVertical: verticalScale(6) },
  blindFlowCancelText: { fontFamily: Fonts.primary, fontSize: scale(12), color: "rgba(10,14,26,0.4)" },

  // Date Picker
  datePickerModal: { flex: 1, justifyContent: "flex-end" },
  datePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  datePickerContainer: { backgroundColor: "#FFFFFF", borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), paddingBottom: verticalScale(34) },
  datePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingVertical: verticalScale(14), borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
  datePickerCancel: { fontFamily: Fonts.primary, fontSize: scale(16), color: "#9E9E9E" },
  datePickerDone: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },

  // Location Picker
  locationPickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
  locationPickerTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK },
  locationPickerDone: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },
  locationPickerHint: { fontFamily: Fonts.primary, fontSize: scale(13), color: "rgba(10,14,26,0.5)", textAlign: "center", paddingVertical: verticalScale(12), backgroundColor: "#FFFFFF" },

  // Loading
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(100) },
  loadingContainerSmall: { alignItems: "center", paddingVertical: verticalScale(40) },
  loadingText: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.5)", marginTop: verticalScale(12) },

  // Empty State
  emptyState: { alignItems: "center", paddingVertical: verticalScale(60), paddingHorizontal: scale(32) },
  emptyIconContainer: { width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginBottom: verticalScale(16) },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK, marginBottom: verticalScale(8), textAlign: "center" },
  emptySubtitle: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.6)", textAlign: "center", marginBottom: verticalScale(20) },
  emptyCta: { backgroundColor: BLUE, borderRadius: scale(12), paddingHorizontal: scale(24), paddingVertical: verticalScale(12) },
  emptyCtaText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFFFFF" },
  emptyInlineState: { alignItems: "center", paddingVertical: verticalScale(24), paddingHorizontal: scale(20) },
  emptyInlineText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "rgba(10,14,26,0.6)" },

  // Section
  section: { paddingTop: verticalScale(20) },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(20), marginBottom: verticalScale(12) },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  seeAllText: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE },

  // Blind Meets
  blindMeetsScroll: { paddingHorizontal: scale(20), gap: scale(12) },
  blindMeetCard: { width: scale(160), backgroundColor: "#FFFFFF", borderRadius: scale(16), padding: scale(14), borderWidth: 1, borderColor: "rgba(27,68,205,0.08)", overflow: "hidden" },
  blindMeetStatus: { flexDirection: "row", alignItems: "center", gap: scale(4), marginBottom: verticalScale(12) },
  blindMeetStatusActive: {},
  blindMeetStatusText: { fontFamily: Fonts.primary, fontSize: scale(11), color: BLUE },
  blindMeetStatusTextActive: { color: "#F59E0B" },
  blindMeetAvatarContainer: { width: scale(60), height: scale(60), borderRadius: scale(30), marginBottom: verticalScale(12), alignSelf: "center", overflow: "hidden" },
  blindMeetAvatarGradient: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  blindMeetModeBadge: { alignSelf: "center", marginBottom: verticalScale(8) },
  blindMeetModeText: { fontFamily: Fonts.bold, fontSize: scale(12), color: INK },
  blindMeetLocation: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  blindMeetLocationText: { fontFamily: Fonts.primary, fontSize: scale(12), color: "rgba(10,14,26,0.6)", flex: 1 },

  // Niices List
  niicesList: { paddingHorizontal: scale(20) },
  niiceCard: { backgroundColor: "#FFFFFF", borderRadius: scale(16), padding: scale(14), marginBottom: verticalScale(10), borderWidth: 1, borderColor: "rgba(27,68,205,0.06)" },
  niiceCardBody: { flexDirection: "row", alignItems: "center" },
  niiceAvatarContainer: { position: "relative", marginRight: scale(12) },
  niiceAvatar: { width: scale(56), height: scale(56), borderRadius: scale(28) },
  niiceAvatarPlaceholder: { width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: "#E8F4FF", alignItems: "center", justifyContent: "center" },
  niiceBlindBadge: { position: "absolute", bottom: -4, right: -4, width: scale(20), height: scale(20), borderRadius: scale(10), backgroundColor: BLUE, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  niiceInfo: { flex: 1 },
  niiceName: { fontFamily: Fonts.bold, fontSize: scale(16), color: INK, marginBottom: verticalScale(4) },
  niiceLastMessage: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.8)", marginBottom: verticalScale(4) },
  niiceLastMessageMuted: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.5)", marginBottom: verticalScale(4) },
  niiceMeta: { fontFamily: Fonts.primary, fontSize: scale(12), color: "rgba(10,14,26,0.4)" },

  // Requests
});