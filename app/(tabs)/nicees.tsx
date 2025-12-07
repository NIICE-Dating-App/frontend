// app/(tabs)/(up_tab)/nicees.tsx
// MERGED: Polished UI (no gradients) + Complete Supabase fetching
// REFACTORED: Removed blind date/meeting functionality
// UPDATED: Integrated niices search directly, removed See All navigation to niices_view

import { Ionicons } from "@expo/vector-icons";
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
type MatchStatus = "pending" | "accepted" | "denied" | "rejected";

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
  approx_lat: number;
  approx_lng: number;
  last_seen: string | null;
  gender: string | null;
  looking_for?: string[] | null;
  values?: string[] | null;
  sexual_orientation?: string | null;
}

interface MatchStatusInfo {
  status: "pending" | "accepted" | "denied" | "rejected" | null;
  is_requester: boolean;
  match_id: string | null;
  sender_message?: string | null;
}

interface NiiceMatch {
  id: string;
  other_user_id: string;
  full_name: string;
  age: number | null;
  main_photo_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
}

interface MatchRequest {
  id: string;
  other_user_id: string;
  full_name: string | null;
  age: number | null;
  main_photo_url: string | null;
  status: MatchStatus;
  is_incoming: boolean;
  sender_message: string | null;
  created_at: string;
}

// ================== UTILITY FUNCTIONS ==================
const capitalizeName = (name: string | null): string => {
  if (!name) return "Unknown";
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

const formatLookingFor = (values: string[] | null | undefined): string | null => {
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

const formatValues = (values: string[] | null | undefined): string | null => {
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

const formatOrientation = (value: string | null | undefined): string | null => {
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
        <Text style={activeTab === "niices_meet" ? styles.tabToggleTextActive : styles.tabToggleText}>Niices</Text>
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
          {resultCount === 0 ? 'No one' : resultCount === 1 ? '1 person' : `${resultCount} people`} nearby
        </Text>
      </View>
      <TouchableOpacity onPress={onOpenFilter} style={styles.iconButton} activeOpacity={0.7}>
        <Ionicons name="options-outline" size={20} color="rgba(10,14,26,0.6)" />
        {hasActiveFilters && <View style={styles.filterDotSmall} />}
      </TouchableOpacity>
    </View>
  </View>
);

// ================== NIICES SEARCH BAR ==================
interface NiicesSearchBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  resultCount: number;
}

const NiicesSearchBar: React.FC<NiicesSearchBarProps> = ({ searchQuery, onSearchChange, resultCount }) => (
  <View style={styles.niicesSearchContainer}>
    <View style={styles.niicesSearchBar}>
      <Ionicons name="search" size={18} color="rgba(10,14,26,0.4)" />
      <TextInput
        style={styles.niicesSearchInput}
        placeholder="Search niices..."
        placeholderTextColor="rgba(10,14,26,0.4)"
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => onSearchChange("")} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color="rgba(10,14,26,0.3)" />
        </TouchableOpacity>
      )}
    </View>
    {searchQuery.length > 0 && (
      <Text style={styles.niicesSearchCount}>
        {resultCount === 0 ? 'No results' : resultCount === 1 ? '1 niice found' : `${resultCount} niices found`}
      </Text>
    )}
  </View>
);

// ================== NEARBY USER CARD (MINIMAL) ==================
const NearbyUserCard: React.FC<{
  user: NearbyUser;
  currentUserId: string | null;
  userPosition: { lat: number; lng: number } | null;
  onSendRequest: (user: NearbyUser, message?: string) => void;
  onViewProfile: (userId: string) => void;
  onOpenFrames: (userId: string) => void;
}> = ({ user, currentUserId, userPosition, onSendRequest, onViewProfile, onOpenFrames }) => {
  const [matchStatus, setMatchStatus] = useState<MatchStatusInfo>({ status: null, is_requester: false, match_id: null });
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMatchStatus = async () => {
      if (!currentUserId) return;
      const { data } = await supabase
        .from('match_requests')
        .select('id, status, requester_id, sender_message')
        .or(`and(requester_id.eq.${currentUserId},target_id.eq.${user.user_id}),and(requester_id.eq.${user.user_id},target_id.eq.${currentUserId})`)
        .maybeSingle();
      if (data) {
        setMatchStatus({
          status: data.status as any,
          is_requester: data.requester_id === currentUserId,
          match_id: data.id,
          sender_message: data.sender_message,
        });
      }
    };
    checkMatchStatus();
  }, [currentUserId, user.user_id]);

  const handleSendRequest = async () => {
    setLoading(true);
    await onSendRequest(user, message.trim() || undefined);
    setShowMessageInput(false);
    setMessage('');
    setLoading(false);
    setMatchStatus({ status: 'pending', is_requester: true, match_id: null });
  };

  const isPending = matchStatus.status === 'pending';
  const isMatched = matchStatus.status === 'accepted';

  const lookingForText = formatLookingFor(user.looking_for);
  const valuesText = formatValues(user.values);
  const orientationText = formatOrientation(user.sexual_orientation);

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity
        style={styles.rowContent}
        onPress={() => onViewProfile(user.user_id)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={(e) => { e.stopPropagation(); user.has_active_frame ? onOpenFrames(user.user_id) : onViewProfile(user.user_id); }}
          activeOpacity={0.8}
        >
          {user.has_active_frame && <View style={styles.avatarRing} />}
          {user.main_photo_url ? (
            <Image source={{ uri: user.main_photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color="rgba(27,68,205,0.3)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {capitalizeName(user.full_name)}{user.age ? `, ${user.age}` : ""}
            </Text>
          </View>
          {lookingForText && (
            <Text style={styles.userBio} numberOfLines={1}>{lookingForText}</Text>
          )}
        </View>

        {/* Status / Actions */}
        {isPending && (
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Ionicons name={matchStatus.is_requester ? "paper-plane" : "mail"} size={12} color="rgba(10,14,26,0.5)" />
            <Text style={styles.pendingBadgeText}>{matchStatus.is_requester ? 'Sent' : 'Incoming'}</Text>
          </View>
        )}

        {isMatched && (
          <View style={[styles.statusBadge, styles.matchedBadge]}>
            <Text style={styles.matchedBadgeText}>Niice</Text>
          </View>
        )}

        {/* Action Buttons */}
        {!showMessageInput && !isMatched && !isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={(e) => { e.stopPropagation(); setShowMessageInput(true); }} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={14} color={BLUE} />
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {isMatched && (
          <View style={styles.actionButtons}>
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
          </View>
        )}
      </TouchableOpacity>

      {/* Message Input for sending request */}
      {showMessageInput && (
        <View style={styles.messageInputCard}>
          <Text style={styles.messageInputTitle}>Send a request</Text>
          <View style={styles.messageInputWrap}>
            <Ionicons name="chatbubble-outline" size={16} color={BLUE} style={{ marginRight: 8 }} />
            <TextInput 
              style={[styles.messageInput, { flex: 1 }]} 
              placeholder="Message (optional)" 
              placeholderTextColor="rgba(10,14,26,0.4)"
              value={message} 
              onChangeText={setMessage} 
              maxLength={200} 
            />
          </View>
          <View style={styles.messageInputActions}>
            <TouchableOpacity style={styles.messageInputBackBtn} onPress={() => { setShowMessageInput(false); setMessage(''); }}>
              <Text style={styles.messageInputBackText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.messageInputSendBtn}
              onPress={handleSendRequest} 
              disabled={loading}
            >
              <Text style={styles.messageInputSendText}>{loading ? 'Sending...' : 'Send Request'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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


// ================== NIICE MATCH CARD (UPDATED: Message button on right, row click goes to profile) ==================
const NiiceMatchCard: React.FC<{ 
  match: NiiceMatch; 
  onViewProfile: () => void;
  onOpenChat: () => void;
  onOpenFrames: (userId: string) => void;
}> = ({ match, onViewProfile, onOpenChat, onOpenFrames }) => {
  return (
    <TouchableOpacity 
      onPress={onViewProfile}
      activeOpacity={0.7}
      style={styles.niiceRowWrapper}
    >
      <View style={styles.niiceRowContent}>
        {/* Avatar - Goes to Frames/Profile */}
        <TouchableOpacity 
          style={styles.niiceAvatarContainer}
          onPress={(e) => { e.stopPropagation(); onOpenFrames(match.other_user_id); }}
          activeOpacity={0.8}
        >
          {match.main_photo_url ? (
            <Image source={{ uri: match.main_photo_url }} style={styles.niiceAvatar} />
          ) : (
            <View style={[styles.niiceAvatar, styles.niiceAvatarPlaceholder]}>
              <Ionicons name="person" size={24} color="rgba(27,68,205,0.3)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.niiceInfoSection}>
          <View style={styles.niiceNameRow}>
            <Text style={styles.niiceName} numberOfLines={1}>
              {capitalizeName(match.full_name)}{match.age ? `, ${match.age}` : ""}
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
            </View>
          )}
          <Text style={styles.niiceTime}>
            {match.last_message_at ? formatRelativeTime(match.last_message_at) : formatRelativeTime(match.created_at)}
          </Text>
        </View>

        {/* Message Button on Right */}
        <TouchableOpacity 
          style={styles.niiceMessageBtn}
          onPress={(e) => { e.stopPropagation(); onOpenChat(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color={BLUE} />
        </TouchableOpacity>
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
  const [niiceMatches, setNiiceMatches] = useState<NiiceMatch[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);

  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingNiices, setLoadingNiices] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Niices search state
  const [niicesSearchQuery, setNiicesSearchQuery] = useState("");

  const filteredNearbyUsers = useMemo(() => {
    return nearbyUsers.filter(user => {
      if (user.age && (user.age < filters.ageMin || user.age > filters.ageMax)) return false;
      if (user.gender && !filters.genders.includes(user.gender as any)) return false;
      return true;
    });
  }, [nearbyUsers, filters]);

  // Filter niices based on search query
  const filteredNiiceMatches = useMemo(() => {
    if (!niicesSearchQuery.trim()) return niiceMatches;
    const query = niicesSearchQuery.toLowerCase().trim();
    return niiceMatches.filter(match => 
      match.full_name.toLowerCase().includes(query)
    );
  }, [niiceMatches, niicesSearchQuery]);

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
      const { data, error } = await supabase.rpc('get_map_cards', {});
      
      if (error || !data) { 
        setNearbyUsers([]); 
        return; 
      }

      const userIds = data.map((u: any) => u.user_id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, gender, sexual_orientation, looking_for, values')
        .in('id', userIds);
      
      const profileMap: Record<string, any> = {};
      profileData?.forEach((p: any) => { profileMap[p.id] = p; });

      const users: NearbyUser[] = await Promise.all(
        data.map(async (row: any) => {
          let photoUrl = row.main_photo_url;
          if (photoUrl && !photoUrl.startsWith('http')) {
            const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
            photoUrl = signedData?.signedUrl || null;
          }
          const profile = profileMap[row.user_id] || {};
          
          return {
            user_id: row.user_id,
            full_name: row.full_name ?? "Unknown",
            age: row.age ?? null,
            bio: row.bio ?? null,
            main_photo_url: photoUrl,
            frame_id: row.frame_id ?? null, 
            has_active_frame: !!row.frame_id,
            approx_lat: row.approx_lat ?? 0,
            approx_lng: row.approx_lng ?? 0,
            last_seen: null,
            gender: profile.gender?.toLowerCase() || null,
            sexual_orientation: profile.sexual_orientation || null,
            looking_for: profile.looking_for || null,
            values: profile.values || null,
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

  const loadNiiceMatches = useCallback(async (uid: string) => {
    try {
      setLoadingNiices(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, requester_id, target_id, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`).eq("status", "accepted").order("created_at", { ascending: false });
      if (error) { setNiiceMatches([]); return; }
      const matches = await Promise.all((data || []).map(async (row: any) => {
        const otherId = row.requester_id === uid ? row.target_id : row.requester_id;
        const preview = await getUserPreview(otherId);
        const { data: conv } = await supabase.from("conversations").select("id").eq("match_request_id", row.id).maybeSingle();
        let lastMsg: any = null;
        if (conv) { const { data: msg } = await supabase.from("messages").select("content, created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(); lastMsg = msg; }
        return {
          id: row.id,
          other_user_id: otherId,
          full_name: preview.full_name ?? "Unknown",
          age: preview.age,
          main_photo_url: preview.main_photo_url,
          last_message_preview: lastMsg?.content ?? null,
          last_message_at: lastMsg?.created_at ?? null,
          created_at: row.created_at
        };
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
      setIncomingRequests(data as any || []);
    } catch (err) { setIncomingRequests([]); }
    finally { setLoadingRequests(false); }
  }, []);

  // Initial Load
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const uid = await loadUserId();
        if (uid) {
          await loadUserPrefsAndPosition(uid);
          await Promise.all([loadNearbyUsers(uid), loadNiiceMatches(uid), loadRequests(uid)]);
        }
      };
      init();
    }, [loadUserId, loadUserPrefsAndPosition, loadNearbyUsers, loadNiiceMatches, loadRequests])
  );

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await Promise.all([loadNearbyUsers(userId), loadNiiceMatches(userId), loadRequests(userId)]);
    }
    setRefreshing(false);
  }, [userId, loadNearbyUsers, loadNiiceMatches, loadRequests]);

  // Apply Filters
  const handleApplyFilters = useCallback((newFilters: FilterState) => setFilters(newFilters), []);

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
  const handleSendRequest = async (user: NearbyUser, message?: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from('match_requests').insert({
        requester_id: userId,
        target_id: user.user_id,
        status: 'pending',
        sender_message: message || null
      });
      if (error) {
        if (error.code === '23505') Alert.alert("Already sent", "You've already sent a request to this person");
        else throw error;
      } else {
        Alert.alert("Success", "Request sent!");
      }
      if (userId) await loadRequests(userId);
    } catch (error) {
      Alert.alert("Error", "Failed to send request");
    }
  };

  const handleViewProfile = (targetUserId: string, matchId?: string) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId || "" } });
  const handleMatchPress = (match: NiiceMatch) => router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: match.other_user_id, matchId: match.id } });

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
          
          {/* Search Bar for Niices */}
          <NiicesSearchBar 
            searchQuery={niicesSearchQuery} 
            onSearchChange={setNiicesSearchQuery} 
            resultCount={filteredNiiceMatches.length}
          />

          {/* Niices List (no header, no "See All") */}
          {loadingNiices ? (
            <View style={styles.loadingContainerSmall}>
              <ActivityIndicator size="small" color={BLUE} />
            </View>
          ) : filteredNiiceMatches.length === 0 ? (
            <View style={styles.emptyInlineState}>
              <View style={styles.emptyInlineIconContainer}>
                <Ionicons name="heart-outline" size={28} color={BLUE} />
              </View>
              <Text style={styles.emptyInlineText}>
                {niicesSearchQuery.trim() ? "No niices match your search" : "No niices yet"}
              </Text>
              {!niicesSearchQuery.trim() && (
                <Text style={styles.emptyInlineSubtext}>Connect with people nearby to add them as niices</Text>
              )}
            </View>
          ) : (
            <View style={styles.niicesList}>
              {filteredNiiceMatches.map((m) => (
                <NiiceMatchCard 
                  key={m.id} 
                  match={m} 
                  onViewProfile={() => handleMatchPress(m)} 
                  onOpenChat={() => router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: m.id } })} 
                  onOpenFrames={handleOpenFrames} 
                />
              ))}
            </View>
          )}
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

  // Niices Search Bar
  niicesSearchContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  niicesSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    gap: scale(10),
    borderWidth: 1,
    borderColor: BORDER,
  },
  niicesSearchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    padding: 0,
    fontWeight: "500",
  },
  niicesSearchCount: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(8),
    textAlign: "center",
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
  },
  avatarPlaceholder: {
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Info Section
  infoSection: {
    flex: 1,
    marginRight: scale(8),
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(2),
  },
  userName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  userBio: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
  },

  // Status Badges
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    gap: scale(4),
  },
  pendingBadge: {
    backgroundColor: "rgba(10,14,26,0.06)",
  },
  pendingBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "rgba(10,14,26,0.5)",
    letterSpacing: 0.2,
  },
  matchedBadge: {
    backgroundColor: BLUE,
  },
  matchedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    gap: scale(4),
  },
  actionBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: BLUE,
    letterSpacing: 0.2,
  },
  acceptBtn: {
    backgroundColor: BLUE,
  },
  acceptBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  denyBtn: {
    backgroundColor: "#EF4444",
  },
  denyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(76),
  },

  // Message Input Card (for sending request with optional message)
  messageInputCard: {
    backgroundColor: "rgba(27,68,205,0.04)",
    borderRadius: scale(16),
    padding: scale(16),
    marginHorizontal: scale(20),
    marginBottom: verticalScale(12),
  },
  messageInputTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    marginBottom: verticalScale(12),
    letterSpacing: 0.2,
  },
  messageInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: verticalScale(12),
  },
  messageInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
  },
  messageInputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: scale(12),
  },
  messageInputBackBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  messageInputBackText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
  messageInputSendBtn: {
    backgroundColor: BLUE,
    borderRadius: scale(20),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
  },
  messageInputSendText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Filter Modal
  filterBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  filterContainer: { width: SCREEN_WIDTH - scale(48), borderRadius: scale(24), overflow: "hidden", padding: scale(20) },
  filterHeader: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(20) },
  filterHeaderIcon: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginRight: scale(12) },
  filterTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: scale(18), color: INK, letterSpacing: 0.2 },
  filterCloseBtn: { padding: scale(4) },
  filterSection: { marginBottom: verticalScale(20) },
  filterSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(12) },
  filterSectionLabel: { fontFamily: Fonts.bold, fontSize: scale(14), color: INK, letterSpacing: 0.2, marginBottom: verticalScale(8) },
  filterSectionValue: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE },
  filterGenderRow: { flexDirection: "row", gap: scale(8) },
  filterGenderChip: { flex: 1, borderRadius: scale(20), backgroundColor: "rgba(27,68,205,0.08)", paddingVertical: verticalScale(10), alignItems: "center" },
  filterGenderChipActive: { backgroundColor: BLUE },
  filterGenderText: { fontFamily: Fonts.bold, fontSize: scale(13), color: "rgba(10,14,26,0.6)" },
  filterGenderTextActive: { color: "#FFFFFF" },
  filterAgeSliderContainer: { gap: verticalScale(12) },
  filterAgeSliderRow: { flexDirection: "row", alignItems: "center" },
  filterAgeSliderLabel: { fontFamily: Fonts.primary, fontSize: scale(12), color: "rgba(10,14,26,0.5)", width: scale(60) },
  filterAgeSlider: { flex: 1, height: verticalScale(40) },
  filterAgeSliderValue: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE, width: scale(30), textAlign: "right" },
  filterDistanceSliderContainer: {},
  filterDistanceSlider: { width: "100%", height: verticalScale(40) },
  filterDistanceLabels: { flexDirection: "row", justifyContent: "space-between" },
  filterDistanceMinLabel: { fontFamily: Fonts.primary, fontSize: scale(11), color: "rgba(10,14,26,0.4)" },
  filterDistanceMaxLabel: { fontFamily: Fonts.primary, fontSize: scale(11), color: "rgba(10,14,26,0.4)" },
  filterActions: { flexDirection: "row", gap: scale(12), marginTop: verticalScale(8) },
  filterResetBtn: { flex: 1, borderRadius: scale(20), backgroundColor: "rgba(10,14,26,0.06)", paddingVertical: verticalScale(12), alignItems: "center" },
  filterResetText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "rgba(10,14,26,0.6)" },
  filterApplyBtn: { flex: 1, borderRadius: scale(20), backgroundColor: BLUE, paddingVertical: verticalScale(12), alignItems: "center" },
  filterApplyText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFFFFF" },

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
  emptyInlineState: { alignItems: "center", paddingVertical: verticalScale(60), paddingHorizontal: scale(20) },
  emptyInlineIconContainer: { 
    width: scale(56), 
    height: scale(56), 
    borderRadius: scale(28), 
    backgroundColor: "rgba(27,68,205,0.08)", 
    alignItems: "center", 
    justifyContent: "center",
    marginBottom: verticalScale(12),
  },
  emptyInlineText: { fontFamily: Fonts.bold, fontSize: scale(16), color: "rgba(10,14,26,0.6)", letterSpacing: 0.2, textAlign: "center" },
  emptyInlineSubtext: { fontFamily: Fonts.primary, fontSize: scale(14), color: "rgba(10,14,26,0.4)", textAlign: "center", marginTop: verticalScale(8) },

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
  niiceTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(2),
  },
  niiceMessageBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  niiceSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(76),
  },
});