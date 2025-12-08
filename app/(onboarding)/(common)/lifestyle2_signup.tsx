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

const QUESTIONS = [
  {
    key: "drinking",
    label: "How often do you drink?",
    options: [
      { label: "Not for me", icon: "close-circle" },
      { label: "Sober", icon: "cafe" },
      { label: "Sober curious", icon: "help-circle" },
      { label: "On special occasions", icon: "wine" },
      { label: "Socially on weekends", icon: "beer" },
      { label: "Most Nights", icon: "wine" },
    ],
  },
  {
    key: "smoking",
    label: "How often do you smoke?",
    options: [
      { label: "Social smoker", icon: "people" },
      { label: "Smoker when drinking", icon: "beer" },
      { label: "Non-smoker", icon: "checkmark-circle" },
      { label: "Smoker", icon: "cloud" },
      { label: "Trying to quit", icon: "trending-down" },
    ],
  },
  {
    key: "workout",
    label: "Do you workout?",
    options: [
      { label: "Everyday", icon: "barbell" },
      { label: "Often", icon: "fitness" },
      { label: "Sometimes", icon: "walk" },
      { label: "Gym rat", icon: "trophy" },
      { label: "Occasionally", icon: "calendar" },
      { label: "Never", icon: "close-circle" },
    ],
  },
  {
    key: "communication",
    label: "What is your communication style?",
    options: [
      { label: "Big time texter", icon: "chatbubble" },
      { label: "Phone caller", icon: "call" },
      { label: "Video chatter", icon: "videocam" },
      { label: "Bad texter", icon: "chatbubble-ellipses" },
      { label: "Better in person", icon: "people" },
    ],
  },
  {
    key: "love_language",
    label: "How do you receive love?",
    options: [
      { label: "Thoughtful gestures", icon: "sparkles" },
      { label: "Presents", icon: "gift" },
      { label: "Touch", icon: "hand-right" },
      { label: "Compliments", icon: "chatbubbles" },
      { label: "Time together", icon: "time" },
    ],
  },
  {
    key: "zodiac",
    label: "What is your zodiac sign?",
    options: [
      { label: "Capricorn", icon: "triangle" },
      { label: "Aquarius", icon: "water" },
      { label: "Pisces", icon: "fish" },
      { label: "Aries", icon: "flame" },
      { label: "Taurus", icon: "leaf" },
      { label: "Gemini", icon: "people" },
      { label: "Cancer", icon: "moon" },
      { label: "Leo", icon: "sunny" },
      { label: "Virgo", icon: "flower" },
      { label: "Libra", icon: "analytics" },
      { label: "Scorpio", icon: "bug" },
      { label: "Sagittarius", icon: "compass" },
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
    onPress 
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
export default function Lifestyle2Signup() {
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

  const handleNext = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Single UPSERT to satisfy RLS once
      const payload = {
        user_id: session.user.id,
        drinking: answers.drinking ?? null,
        smoking: answers.smoking ?? null,
        kids: null,
        workout: answers.workout ?? null,
        communication: answers.communication ?? null,
        love_language: answers.love_language ?? null,
        zodiac: answers.zodiac ?? null,
      };

      const { error } = await supabase
        .from("lifestyle")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      router.push("/(onboarding)/(common)/lifestyle3_signup");
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
      <TouchableOpacity style={styles.skipButton} onPress={handleNext} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Let's talk about your lifestyle and habits</Text>
        <Text style={styles.subtitle}>
          Share your preferences to help us find compatible matches.
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
        onPress={handleNext}
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
    width: "64.68%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
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