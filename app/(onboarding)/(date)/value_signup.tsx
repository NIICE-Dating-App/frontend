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

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";

const OPTIONS = [
  "Honesty",
  "Kindness",
  "Sense of humor",
  "Good communication",
  "Ambition",
  "Loyalty",
  "Emotional intelligence",
  "Adventurous spirit",
  "Intelligence",
  "Affectionate",
  "Family-oriented",
  "Open-mindedness",
  "Active lifestyle",
  "Supportive",
  "Authenticity",
  "Similar values",
  "Confidence",
  "Romantic",
  "Financial stability",
  "Shared interests",
];

// ===========================
// CHIP COMPONENT
// ===========================
const ValueChip = React.memo(
  ({
    label,
    selected,
    onToggle,
  }: {
    label: string;
    selected: boolean;
    onToggle: (l: string) => void;
  }) => {
    const anim = useRef(new Animated.Value(1)).current;
    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.06, duration: 95, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
      onToggle(label);
    }, [anim, label, onToggle]);

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
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ===========================
// MAIN COMPONENT
// ===========================
export default function ValuePartnerSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleOption = useCallback((opt: string) => {
    setSelected((prev) => {
      const has = prev.includes(opt);
      if (has) return prev.filter((x) => x !== opt);
      if (prev.length >= 5) {
        Alert.alert("Limit reached", "You can select up to 5 values.");
        return prev;
      }
      return [...prev, opt];
    });
  }, []);

  const handleNext = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Session not found");

      const normalized = selected.map((s) =>
        s.toLowerCase().replace(/\s+/g, "_").replace("-", "_")
      );

      const { error } = await supabase
        .from("user_modes")
        .upsert(
          {
            user_id: session.user.id,
            mode: "dating",
            value_date: normalized,
            updated_at: new Date(),
          },
          { onConflict: "user_id,mode" }
        );

      if (error) throw error;

      router.push("/(onboarding)/(common)/lifestyle2_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

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

      {/* Skip Button (Top-right corner) */}
      <Pressable style={styles.skipButton} onPress={() => router.push("/(onboarding)/(common)/lifestyle2_signup")}>
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
        <Text style={styles.title}>What do you value in your partner?</Text>

        <View style={styles.wrapContainer}>
          {OPTIONS.map((opt) => (
            <ValueChip
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onToggle={toggleOption}
            />
          ))}
        </View>
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
    color: "#7A838E",
    fontSize: moderateScale(15),
  },

  progressWrapper: { marginTop: verticalScale(88), paddingHorizontal: scale(24) },
  progressTrack: { height: verticalScale(6), backgroundColor: "#C8CDD2", borderRadius: scale(3) },
  progressFill: { height: verticalScale(6), width: "58.80%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(28),
    paddingBottom: verticalScale(120),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(33),
    lineHeight: verticalScale(48),
    color: INK,
    marginBottom: verticalScale(18),
  },

  wrapContainer: { flexDirection: "row", flexWrap: "wrap", gap: scale(10) },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderRadius: scale(30),
  },

  chip: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(30),
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { transform: [{ scale: 1.02 }] },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#1B2B44",
    textAlign: "center",
  },
  chipTextSelected: { color: "#FFFFFF" },

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
