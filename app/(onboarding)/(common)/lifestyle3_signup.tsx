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
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

// Enable layout animation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ===========================
// QUESTIONS
// ===========================
const QUESTIONS = [
  {
    key: "religion",
    label: "What are your spiritual beliefs?",
    options: [
      { label: "Agnostic", icon: "help-circle" },
      { label: "Atheist", icon: "close-circle" },
      { label: "Buddhist", icon: "flower" },
      { label: "Catholic", icon: "book" },
      { label: "Christian", icon: "book" },
      { label: "Hindu", icon: "flower-outline" },
      { label: "Jewish", icon: "star" },
      { label: "Muslim", icon: "moon" },
      { label: "Sikh", icon: "flame" },
      { label: "Spiritual but not religious", icon: "sparkles" },
      { label: "Other", icon: "ellipsis-horizontal" },
      { label: "Prefer not to say", icon: "eye-off" },
    ],
  },
  {
    key: "politics",
    label: "What are your political views?",
    options: [
      { label: "Very Liberal", icon: "trending-down" },
      { label: "Liberal", icon: "arrow-back" },
      { label: "Moderate / Centrist", icon: "analytics" },
      { label: "Conservative", icon: "arrow-forward" },
      { label: "Very Conservative", icon: "trending-up" },
      { label: "Progressive", icon: "arrow-up" },
      { label: "Green / Environmentalist", icon: "leaf" },
      { label: "Libertarian", icon: "document-text" },
      { label: "Socialist / Leftist", icon: "people" },
      { label: "Independent Thinker", icon: "bulb" },
      { label: "Not political", icon: "close-circle" },
      { label: "Prefer not to say", icon: "eye-off" },
    ],
  },
  {
    key: "pets",
    label: "Do you have any pets?",
    options: [
      { label: "Dog", icon: "paw" },
      { label: "Cat", icon: "paw" },
      { label: "Reptile", icon: "bug" },
      { label: "Amphibian", icon: "water" },
      { label: "Bird", icon: "navigate" },
      { label: "Fish", icon: "fish" },
      { label: "Don't have but love", icon: "heart-outline" },
      { label: "Other", icon: "ellipsis-horizontal" },
      { label: "Turtle", icon: "bug" },
      { label: "Hamster", icon: "paw" },
      { label: "Rabbit", icon: "paw" },
      { label: "Pet-free", icon: "close-circle" },
      { label: "All the pets", icon: "heart" },
      { label: "Want a pet", icon: "heart-half" },
      { label: "Allergic to pets", icon: "warning" },
    ],
  },
  {
    key: "kids",
    label: "Do you have kids?",
    options: [
      { label: "No kids, and don't want them", icon: "close-circle" },
      { label: "No kids, but want them someday", icon: "heart" },
      { label: "No kids, still deciding", icon: "help-circle" },
      { label: "Have kids", icon: "people" },
      { label: "Have grown kids", icon: "person" },
      { label: "Prefer not to say", icon: "eye-off" },
    ],
  },
];

// ===========================
// CHIP COMPONENT
// ===========================
const OptionChip = React.memo(
  ({
    label,
    icon,
    selected,
    onPress,
  }: {
    label: string;
    icon: string;
    selected: boolean;
    onPress: () => void;
  }) => {
    const anim = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.06, duration: 95, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
      onPress();
    }, [anim, onPress]);

    return (
      <Pressable onPress={handlePress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={selected ? (["#1B44CD", "#3C6FFF"] as const) : (["#FFFFFF", "#F8FAFF"] as const)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionChip, selected && styles.optionSelected]}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={selected ? "#FFFFFF" : Colors.BLUE}
              style={styles.chipIcon}
            />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ===========================
// MAIN COMPONENT
// ===========================
export default function Lifestyle3Signup() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSelect = useCallback((questionKey: string, optionLabel: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswers((prev) => {
      if (prev[questionKey] === optionLabel) {
        const updated = { ...prev };
        delete updated[questionKey];
        return updated;
      }
      return { ...prev, [questionKey]: optionLabel };
    });
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const userId = session.user.id;

      // Try UPDATE first (preserves other columns)
      const { data, error } = await supabase
        .from("lifestyle")
        .update({
          religion: answers.religion ?? null,
          politics: answers.politics ?? null,
          pets: answers.pets ?? null,
          kids: answers.kids ?? null,
        })
        .eq("user_id", userId)
        .select("user_id");

      if (error) throw error;

      // If no row existed yet, INSERT a new one with just these fields
      if (!data || data.length === 0) {
        const { error: insertErr } = await supabase.from("lifestyle").insert({
          user_id: userId,
          religion: answers.religion ?? null,
          politics: answers.politics ?? null,
          pets: answers.pets ?? null,
          kids: answers.kids ?? null,
        });
        if (insertErr) throw insertErr;
      }

      router.push("/(onboarding)/(common)/communities4_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
      <TouchableOpacity style={styles.skipButton} onPress={handleSave} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Religion, politics, pets & kids</Text>
        <Text style={styles.subtitle}>
          Share your values and lifestyle to help us find compatible matches.
        </Text>

        {QUESTIONS.map((q) => (
          <View key={q.key} style={styles.questionSection}>
            <Text style={styles.question}>{q.label}</Text>
            <View style={styles.optionGroup}>
              {q.options.map((opt) => (
                <OptionChip
                  key={opt.label}
                  label={opt.label}
                  icon={opt.icon}
                  selected={answers[q.key] === opt.label}
                  onPress={() => handleSelect(q.key, opt.label)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            These details are optional but help us find better matches for you.
          </Text>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={loading}
        style={[styles.nextButton, loading && { opacity: 0.5 }]}
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
    padding: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.BLUE,
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
    width: "70.56%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
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
    marginBottom: verticalScale(20),
    lineHeight: verticalScale(22),
  },

  questionSection: {
    marginBottom: verticalScale(24),
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: Colors.INK,
    marginBottom: verticalScale(12),
  },
  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },

  optionChip: {
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
  optionSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipIcon: {
    marginRight: scale(6),
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: Colors.INK,
    textAlign: "center",
  },
  optionTextSelected: {
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