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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
            colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F8FAFF", "#EBF1FF"]}
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

export default function ValuePartnerSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

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

      // Optional: save selections
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable
        style={[styles.backButton, { top: verticalScale(10) + insets.top }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Progress Bar */}
      <View style={[styles.progressWrapper, { marginTop: verticalScale(44) + insets.top }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: "33%" }]} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + verticalScale(110) },
        ]}
      >
        <Text style={styles.title}>What do you value in your partner</Text>

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

      {/* Skip Button (Top-Right corner) */}
      {/* Skip Button (Top-right above progress bar) */}
{/* Skip Button (Top-right above progress bar) */}
      <Pressable
        style={[
          styles.skipButton,
          {
            top: verticalScale(10) + insets.top,
            right: scale(24),
          },
        ]}
        onPress={() => router.push("/(onboarding)/(common)/lifestyle2_signup")}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>




      {/* Next Button */}
      <Pressable
        onPress={handleNext}
        disabled={loading}
        style={[
          styles.nextButton,
          { bottom: insets.bottom + verticalScale(30), opacity: selected.length === 0 ? 0.5 : 1 },
        ]}
      >
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backButton: {
    position: "absolute",
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  progressWrapper: { paddingHorizontal: scale(24) },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
  },
  progressFill: {
    height: verticalScale(6),
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },
  scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(28) },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(44),
    color: INK,
    marginBottom: verticalScale(18),
  },
  wrapContainer: { flexDirection: "row", flexWrap: "wrap", gap: scale(10) },
  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowRadius: 8,
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
  skipButton: {
    position: "absolute",
    alignSelf: "flex-end", // ensures alignment inside SafeAreaView
    zIndex: 1000,
    backgroundColor: "transparent",
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(25),
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: "#7A838E",
    fontSize: moderateScale(15),
    textAlign: "right",
  },
  nextButton: {
    position: "absolute",
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
});
