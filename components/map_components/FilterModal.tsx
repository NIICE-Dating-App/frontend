// components/map_components/FilterModal.tsx
// EXACT copy of niices.tsx filter - with sliders, NO GRADIENTS
import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  Keyboard, 
  Animated as RNAnimated, 
  StyleSheet,
  Dimensions,
  Switch,
  ScrollView 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Slider from "@react-native-community/slider";
import { scale, verticalScale } from "@/utils/responsive";
import { Fonts } from "@/constants/theme";
import { FilterState, UserPreferences } from "./types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme colors matching niices.tsx - NO GRADIENTS
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  defaults: UserPreferences;
}

const GENDER_LABELS: Record<string, string> = { 
  man: 'Men', 
  woman: 'Women', 
  nonbinary: 'Non-binary' 
};

const INTENTION_OPTIONS = [
  { value: 'new_friends_nearby', label: 'New friends' },
  { value: 'workout_fitness_buddy', label: 'Workout buddy' },
  { value: 'travel_companions', label: 'Travel' },
  { value: 'activity_hobby_partners', label: 'Hobbies' },
  { value: 'casual_hangouts', label: 'Hangouts' },
  { value: 'professional_networking', label: 'Networking' },
  { value: 'close_friendships', label: 'Close friends' },
];

export const FilterModal: React.FC<FilterModalProps> = memo(({ 
  visible, 
  onClose, 
  filters, 
  onApply, 
  defaults 
}) => {
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
      intentions: undefined,
      activeToday: false,
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

  const toggleIntention = useCallback((intention: string) => {
    Keyboard.dismiss();
    setTempFilters(prev => {
      const currentIntentions = prev.intentions || [];
      const has = currentIntentions.includes(intention);
      const newIntentions = has 
        ? currentIntentions.filter(x => x !== intention)
        : [...currentIntentions, intention];
      return { ...prev, intentions: newIntentions.length > 0 ? newIntentions : undefined };
    });
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={filterStyles.filterBackdrop} onPress={handleClose}>
        <RNAnimated.View style={{ opacity: opacityAnim, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable onPress={() => Keyboard.dismiss()}>
            <RNAnimated.View style={[filterStyles.filterContainer, { transform: [{ scale: scaleAnim }] }]}>
              {/* Header */}
              <View style={filterStyles.filterHeader}>
                <View style={filterStyles.filterHeaderIcon}>
                  <Ionicons name="options-outline" size={20} color={BLUE} />
                </View>
                <Text style={filterStyles.filterTitle}>Filters</Text>
                <Pressable onPress={handleClose} style={filterStyles.filterCloseBtn} hitSlop={8}>
                  <Ionicons name="close" size={22} color="rgba(10,14,26,0.5)" />
                </Pressable>
              </View>

              {/* Scrollable Content */}
              <ScrollView 
                style={{ maxHeight: 500 }}
                showsVerticalScrollIndicator={false}
                bounces={true}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
              {/* Gender Section */}
              <View style={filterStyles.filterSection}>
                <Text style={filterStyles.filterSectionLabel}>Show me</Text>
                <View style={filterStyles.filterGenderRow}>
                  {(['woman', 'man', 'nonbinary'] as const).map(g => {
                    const active = tempFilters.genders.includes(g);
                    return (
                      <Pressable 
                        key={g} 
                        onPress={() => toggleGender(g)}
                        style={[
                          filterStyles.filterGenderChip, 
                          active && filterStyles.filterGenderChipActive
                        ]}
                      >
                        <Text style={[
                          filterStyles.filterGenderText, 
                          active && filterStyles.filterGenderTextActive
                        ]}>
                          {GENDER_LABELS[g]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Age Section with Sliders */}
              <View style={filterStyles.filterSection}>
                <View style={filterStyles.filterSectionHeader}>
                  <Text style={filterStyles.filterSectionLabel}>Age</Text>
                  <Text style={filterStyles.filterSectionValue}>{tempFilters.ageMin} - {tempFilters.ageMax}</Text>
                </View>
                <View style={filterStyles.filterAgeSliderContainer}>
                  <View style={filterStyles.filterAgeSliderRow}>
                    <Text style={filterStyles.filterAgeSliderLabel}>Min age</Text>
                    <Slider
                      style={filterStyles.filterAgeSlider}
                      minimumValue={18}
                      maximumValue={60}
                      step={1}
                      value={tempFilters.ageMin}
                      onValueChange={(v) => setTempFilters(p => ({ 
                        ...p, 
                        ageMin: Math.round(v), 
                        ageMax: Math.max(p.ageMax, Math.round(v)) 
                      }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={filterStyles.filterAgeSliderValue}>{tempFilters.ageMin}</Text>
                  </View>
                  <View style={filterStyles.filterAgeSliderRow}>
                    <Text style={filterStyles.filterAgeSliderLabel}>Max age</Text>
                    <Slider
                      style={filterStyles.filterAgeSlider}
                      minimumValue={tempFilters.ageMin}
                      maximumValue={99}
                      step={1}
                      value={tempFilters.ageMax}
                      onValueChange={(v) => setTempFilters(p => ({ ...p, ageMax: Math.round(v) }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={filterStyles.filterAgeSliderValue}>{tempFilters.ageMax}</Text>
                  </View>
                </View>
              </View>

              {/* Distance Section with Slider */}
              <View style={filterStyles.filterSection}>
                <View style={filterStyles.filterSectionHeader}>
                  <Text style={filterStyles.filterSectionLabel}>Distance</Text>
                  <Text style={filterStyles.filterSectionValue}>
                    {tempFilters.distanceKm < 1 
                      ? `${Math.round(tempFilters.distanceKm * 1000)}m` 
                      : `${tempFilters.distanceKm}km`
                    }
                  </Text>
                </View>
                <View style={filterStyles.filterDistanceSliderContainer}>
                  <Slider
                    style={filterStyles.filterDistanceSlider}
                    minimumValue={0.5}
                    maximumValue={4}
                    step={0.1}
                    value={tempFilters.distanceKm}
                    onValueChange={(v) => setTempFilters(p => ({ ...p, distanceKm: Math.round(v * 10) / 10 }))}
                    minimumTrackTintColor={BLUE}
                    maximumTrackTintColor="rgba(27,68,205,0.2)"
                    thumbTintColor={BLUE}
                  />
                  <View style={filterStyles.filterDistanceLabels}>
                    <Text style={filterStyles.filterDistanceMinLabel}>500m</Text>
                    <Text style={filterStyles.filterDistanceMaxLabel}>4km</Text>
                  </View>
                </View>
              </View>

              {/* Intentions Section */}
              <View style={filterStyles.filterSection}>
                <Text style={filterStyles.filterSectionLabel}>Looking for</Text>
                <View style={filterStyles.filterIntentionsGrid}>
                  {INTENTION_OPTIONS.map(option => {
                    const active = (tempFilters.intentions || []).includes(option.value);
                    return (
                      <Pressable 
                        key={option.value} 
                        onPress={() => toggleIntention(option.value)}
                        style={[
                          filterStyles.filterIntentionChip, 
                          active && filterStyles.filterIntentionChipActive
                        ]}
                      >
                        <Text style={[
                          filterStyles.filterIntentionText, 
                          active && filterStyles.filterIntentionTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Active Today Section */}
              <View style={filterStyles.filterSection}>
                <View style={filterStyles.filterToggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={filterStyles.filterSectionLabel}>Active today</Text>
                    <Text style={filterStyles.filterToggleSubtext}>
                      Show only users active in the last 24 hours
                    </Text>
                  </View>
                  <Switch
                    value={tempFilters.activeToday || false}
                    onValueChange={(value) => setTempFilters(p => ({ ...p, activeToday: value }))}
                    trackColor={{ false: "rgba(10,14,26,0.1)", true: "rgba(27,68,205,0.3)" }}
                    thumbColor={tempFilters.activeToday ? BLUE : "#f4f3f4"}
                  />
                </View>
              </View>

              </ScrollView>
              
              {/* Actions - NO GRADIENTS */}
              <View style={filterStyles.filterActions}>
                <Pressable onPress={handleReset} style={filterStyles.filterResetBtn}>
                  <Text style={filterStyles.filterResetText}>Reset</Text>
                </Pressable>
                <Pressable onPress={handleApply} style={filterStyles.filterApplyBtn}>
                  <Text style={filterStyles.filterApplyText}>Apply</Text>
                </Pressable>
              </View>
            </RNAnimated.View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
});

// Styles matching niices.tsx EXACTLY - NO GRADIENTS
const filterStyles = StyleSheet.create({
  filterBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  filterContainer: { 
    width: SCREEN_WIDTH - scale(48), 
    borderRadius: scale(24), 
    overflow: "hidden", 
    padding: scale(20),
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
  },
  filterHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: verticalScale(20) 
  },
  filterHeaderIcon: { 
    width: scale(36), 
    height: scale(36), 
    borderRadius: scale(18), 
    backgroundColor: "rgba(27,68,205,0.08)", 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: scale(12) 
  },
  filterTitle: { 
    flex: 1, 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: INK, 
    letterSpacing: 0.2 
  },
  filterCloseBtn: { 
    padding: scale(4) 
  },
  filterSection: { 
    marginBottom: verticalScale(20) 
  },
  filterSectionHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: verticalScale(12) 
  },
  filterSectionLabel: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: INK, 
    letterSpacing: 0.2, 
    marginBottom: verticalScale(8) 
  },
  filterSectionValue: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: BLUE 
  },
  filterGenderRow: { 
    flexDirection: "row", 
    gap: scale(8) 
  },
  filterGenderChip: { 
    flex: 1, 
    borderRadius: scale(20), 
    backgroundColor: "rgba(27,68,205,0.08)", 
    paddingVertical: verticalScale(10), 
    alignItems: "center" 
  },
  filterGenderChipActive: { 
    backgroundColor: BLUE 
  },
  filterGenderText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(13), 
    color: "rgba(10,14,26,0.6)" 
  },
  filterGenderTextActive: { 
    color: "#FFFFFF" 
  },
  filterAgeSliderContainer: { 
    gap: verticalScale(12) 
  },
  filterAgeSliderRow: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  filterAgeSliderLabel: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(12), 
    color: "rgba(10,14,26,0.5)", 
    width: scale(60) 
  },
  filterAgeSlider: { 
    flex: 1, 
    height: verticalScale(40) 
  },
  filterAgeSliderValue: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: BLUE, 
    width: scale(30), 
    textAlign: "right" 
  },
  filterDistanceSliderContainer: {},
  filterDistanceSlider: { 
    width: "100%", 
    height: verticalScale(40) 
  },
  filterDistanceLabels: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  filterDistanceMinLabel: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.4)" 
  },
  filterDistanceMaxLabel: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.4)" 
  },
  filterIntentionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  filterIntentionChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
  },
  filterIntentionChipActive: {
    backgroundColor: BLUE,
  },
  filterIntentionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.6)",
  },
  filterIntentionTextActive: {
    color: "#FFFFFF",
  },
  filterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterToggleSubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(4),
  },
  filterActions: { 
    flexDirection: "row", 
    gap: scale(12), 
    marginTop: verticalScale(8) 
  },
  filterResetBtn: { 
    flex: 1, 
    borderRadius: scale(20), 
    backgroundColor: "rgba(10,14,26,0.06)", 
    paddingVertical: verticalScale(12), 
    alignItems: "center" 
  },
  filterResetText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.6)" 
  },
  filterApplyBtn: { 
    flex: 1, 
    borderRadius: scale(20), 
    backgroundColor: BLUE, 
    paddingVertical: verticalScale(12), 
    alignItems: "center" 
  },
  filterApplyText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: "#FFFFFF" 
  },
});