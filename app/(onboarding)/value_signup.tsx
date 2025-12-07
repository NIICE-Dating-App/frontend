import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ===========================================
// UNIFIED VALUES - All value_enum options
// Organized by category for better UX
// ===========================================

const OPTIONS = [
  // Core Character
  { label: "Honesty", value: "honesty", category: "character", icon: "shield-checkmark" },
  { label: "Kindness", value: "kindness", category: "character", icon: "heart" },
  { label: "Loyalty", value: "loyalty", category: "character", icon: "ribbon" },
  { label: "Authenticity", value: "authenticity", category: "character", icon: "finger-print" },
  { label: "Trustworthy", value: "trustworthy", category: "character", icon: "lock-closed" },
  { label: "Reliable", value: "reliable", category: "character", icon: "checkmark-circle" },
  { label: "Confidence", value: "confidence", category: "character", icon: "trophy" },

  // Communication & Connection
  { label: "Good communication", value: "good_communication", category: "communication", icon: "chatbubbles" },
  { label: "Good listener", value: "good_listener", category: "communication", icon: "ear" },
  { label: "Deep conversations", value: "deep_conversations", category: "communication", icon: "bulb" },
  { label: "Understanding", value: "understanding", category: "communication", icon: "people" },
  { label: "Emotional intelligence", value: "emotional_intelligence", category: "communication", icon: "heart-half" },
  { label: "Non-judgmental", value: "non_judgmental", category: "communication", icon: "happy" },
  { label: "Respectful of boundaries", value: "respectful_of_boundaries", category: "communication", icon: "hand-left" },

  // Personality & Energy
  { label: "Sense of humor", value: "sense_of_humor", category: "personality", icon: "happy-outline" },
  { label: "Positive energy", value: "positive_energy", category: "personality", icon: "sunny" },
  { label: "Fun to be around", value: "fun_to_be_around", category: "personality", icon: "sparkles" },
  { label: "Adventurous spirit", value: "adventurous_spirit", category: "personality", icon: "compass" },
  { label: "Open-mindedness", value: "open_mindedness", category: "personality", icon: "globe" },
  { label: "Low maintenance", value: "low_maintenance", category: "personality", icon: "leaf" },

  // Support & Growth
  { label: "Supportive", value: "supportive", category: "support", icon: "hand-right" },
  { label: "Encouraging", value: "encouraging", category: "support", icon: "megaphone" },
  { label: "Makes time for me", value: "makes_time_for_me", category: "support", icon: "time" },
  { label: "Growth-minded", value: "growth_minded", category: "support", icon: "trending-up" },

  // Lifestyle & Interests
  { label: "Active lifestyle", value: "active_lifestyle", category: "lifestyle", icon: "fitness" },
  { label: "Shared interests", value: "shared_interests", category: "lifestyle", icon: "star" },
  { label: "Similar values", value: "similar_values", category: "lifestyle", icon: "git-compare" },
  { label: "Intelligence", value: "intelligence", category: "lifestyle", icon: "school" },
  { label: "Ambition", value: "ambition", category: "lifestyle", icon: "rocket" },

  // Relationship-Focused
  { label: "Affectionate", value: "affectionate", category: "relationship", icon: "heart-circle" },
  { label: "Romantic", value: "romantic", category: "relationship", icon: "rose" },
  { label: "Family-oriented", value: "family_oriented", category: "relationship", icon: "home" },
  { label: "Financial stability", value: "financial_stability", category: "relationship", icon: "wallet" },
];

const MAX_SELECTIONS = 7;

// ===========================
// CHIP COMPONENT
// ===========================
const ValueChip = React.memo(
  ({
    option,
    selected,
    onToggle,
  }: {
    option: { label: string; value: string; icon: string };
    selected: boolean;
    onToggle: (value: string) => void;
  }) => {
    const anim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.06, duration: 95, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
      onToggle(option.value);
    }, [anim, option.value, onToggle]);

    return (
      <Pressable onPress={handlePress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Animated.View
          style={[
            { transform: [{ scale: anim }] },
            styles.shadowWrapper,
            Platform.OS === "ios" && { shadowOpacity: selected ? 0.35 : 0.15 },
          ]}
        >
          <LinearGradient
            colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F9FBFF", "#EEF3FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Ionicons
              name={option.icon as any}
              size={moderateScale(16)}
              color={selected ? "#FFFFFF" : "#1B44CD"}
              style={styles.chipIcon}
            />
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ===========================
// MAIN COMPONENT
// ===========================
export default function ValueSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleOption = useCallback((value: string) => {
    setSelected((prev) => {
      const has = prev.includes(value);
      if (has) return prev.filter((x) => x !== value);
      if (prev.length >= MAX_SELECTIONS) {
        Alert.alert("Limit reached", `You can select up to ${MAX_SELECTIONS} values.`);
        return prev;
      }
      return [...prev, value];
    });
  }, []);

  const handleSkip = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Session not found");

      // Update onboarding step without saving values
      await supabase
        .from("profiles")
        .update({ onboarding_step: 5 })
        .eq("id", session.user.id);

      router.push("/(onboarding)/who_to_meet_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNext = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Session not found");

      // ✅ Save to profiles.values (unified field)
      const { error } = await supabase
        .from("profiles")
        .update({
          values: selected,
          onboarding_step: 5,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      router.push("/(onboarding)/who_to_meet_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // Group options by category
  const characterOptions = OPTIONS.filter((o) => o.category === "character");
  const communicationOptions = OPTIONS.filter((o) => o.category === "communication");
  const personalityOptions = OPTIONS.filter((o) => o.category === "personality");
  const supportOptions = OPTIONS.filter((o) => o.category === "support");
  const lifestyleOptions = OPTIONS.filter((o) => o.category === "lifestyle");
  const relationshipOptions = OPTIONS.filter((o) => o.category === "relationship");

  const renderSection = (title: string, icon: string, options: typeof OPTIONS) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={moderateScale(18)} color={BLUE} />
        <Text style={styles.sectionLabel}>{title}</Text>
      </View>
      <View style={styles.wrapContainer}>
        {options.map((opt) => (
          <ValueChip
            key={opt.value}
            option={opt}
            selected={selected.includes(opt.value)}
            onToggle={toggleOption}
          />
        ))}
      </View>
    </View>
  );

  // ===========================
  // RENDER
  // ===========================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Skip Button */}
      <Pressable style={styles.skipButton} onPress={handleSkip} disabled={loading}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>What do you value in people?</Text>
        <Text style={styles.subtitle}>
          Select up to {MAX_SELECTIONS} qualities that matter most to you in connections.
        </Text>

        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {selected.length} / {MAX_SELECTIONS} selected
          </Text>
        </View>

        {renderSection("Core Character", "shield", characterOptions)}
        {renderSection("Communication", "chatbubble-ellipses", communicationOptions)}
        {renderSection("Personality & Energy", "sparkles", personalityOptions)}
        {renderSection("Support & Growth", "trending-up", supportOptions)}
        {renderSection("Lifestyle & Interests", "compass", lifestyleOptions)}
        {renderSection("Relationship", "heart", relationshipOptions)}

        <Text style={styles.note}>
          This helps us find better matches and suggest relevant connections for you.
        </Text>
      </ScrollView>

      {/* Next Button */}
      <Pressable
        onPress={handleNext}
        disabled={loading || selected.length === 0}
        style={[styles.nextButton, selected.length === 0 && { opacity: 0.5 }]}
      >
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

// ===========================
// STYLES
// ===========================
const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  skipButton: {
    position: "absolute",
    top: verticalScale(64),
    right: scale(24),
    zIndex: 10,
    backgroundColor: "transparent",
    padding: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(16),
  },

  progressWrapper: { marginTop: verticalScale(88), paddingHorizontal: scale(24) },
  progressTrack: { height: verticalScale(6), backgroundColor: "#C8CDD2", borderRadius: scale(3) },
  progressFill: { height: verticalScale(6), width: "52.92%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(28),
    paddingBottom: verticalScale(120),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(38),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#6C757D",
    marginBottom: verticalScale(12),
    lineHeight: verticalScale(22),
  },

  counterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: BLUE,
  },

  sectionContainer: {
    marginBottom: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: BLUE,
    marginLeft: scale(8),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  wrapContainer: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: scale(8),
  },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderRadius: scale(25),
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(25),
  },
  chipSelected: { transform: [{ scale: 1.02 }] },
  chipIcon: {
    marginRight: scale(6),
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: "#1B2B44",
  },
  chipTextSelected: { color: "#FFFFFF" },

  note: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: "#6C757D",
    marginTop: verticalScale(16),
    lineHeight: verticalScale(20),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(68),
    height: verticalScale(68),
    borderRadius: scale(34),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
});