// frontend/app/%28onboarding%29/value_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

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
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={selected ? (["#1B44CD", "#3C6FFF"] as const) : (["#FFFFFF", "#F8FAFF"] as const)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Ionicons
              name={option.icon as any}
              size={16}
              color={selected ? "#FFFFFF" : Colors.BLUE}
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
        <Ionicons name={icon as any} size={18} color={Colors.BLUE} />
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </View>
      </TouchableOpacity>

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
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {selected.length} / {MAX_SELECTIONS}
            </Text>
          </View>
          <Text style={styles.counterLabel}>selected</Text>
        </View>

        {renderSection("Core Character", "", characterOptions)}
        {renderSection("Communication", "", communicationOptions)}
        {renderSection("Personality & Energy", "", personalityOptions)}
        {renderSection("Support & Growth", "", supportOptions)}
        {renderSection("Lifestyle & Interests", "", lifestyleOptions)}
        {renderSection("Relationship", "", relationshipOptions)}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            This helps us find better matches and suggest relevant connections for you.
          </Text>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleNext}
        disabled={loading || selected.length === 0}
        style={[styles.nextButton, selected.length === 0 && { opacity: 0.5 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ===========================
// STYLES
// ===========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },

  backButton: {
    position: "absolute",
    top: verticalScale(16),
    left: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  skipButton: {
    position: "absolute",
    top: verticalScale(16),
    right: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    fontSize: scale(16),
  },

  progressWrapper: {
    marginTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  progressTrack: {
    height: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressFill: {
    height: verticalScale(8),
    width: "52.92%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    marginBottom: verticalScale(6),
    paddingTop: verticalScale(6.5),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(16),
    lineHeight: verticalScale(22),
  },

  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  counterBadge: {
    backgroundColor: Colors.BLUE,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },
  counterLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
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
    fontSize: scale(18),
    color: Colors.INK,
    
    paddingRight: scale(12),
    
    letterSpacing: 0.5,
  },

  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(24),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipIcon: {
    marginRight: scale(6),
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: Colors.INK,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
    paddingTop: verticalScale(0.5),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});