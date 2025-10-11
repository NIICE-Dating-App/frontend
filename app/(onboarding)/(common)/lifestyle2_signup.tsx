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
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Enable layout animation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";

const QUESTIONS = [
  {
    key: "drinking",
    label: "How often do you drink?",
    options: [
      "🚫 Not for me",
      "☕ Sober",
      "🤔 Sober curious",
      "🥂 On special occasions",
      "🍻 Socially on weekends",
      "🍷 Most Nights",
    ],
  },
  {
    key: "smoking",
    label: "How often do you smoke?",
    options: [
      "💨 Social smoker",
      "🚬 Smoker when drinking",
      "🚭 Non-smoker",
      "🚬 Smoker",
      "🚫 Trying to quit",
    ],
  },
  {
    key: "workout",
    label: "Do you workout?",
    options: [
      "💪 Everyday",
      "🏋 Often",
      "🏃 Sometimes",
      "💯 Gym rat",
      "🤷 Occasionally",
      "🛋 Never",
    ],
  },
  {
    key: "communication",
    label: "What is your communication style?",
    options: [
      "📱 Big time texter",
      "📞 Phone caller",
      "📹 Video chatter",
      "😅 Bad texter",
      "🤝 Better in person",
    ],
  },
  {
    key: "love_language",
    label: "How do you receive love?",
    options: [
      "💭 Thoughtful gestures",
      "🎁 Presents",
      "🤗 Touch",
      "💬 Compliments",
      "⏰ Time together",
    ],
  },
  {
    key: "zodiac",
    label: "What is your zodiac sign?",
    options: [
      "♑ Capricorn",
      "♒ Aquarius",
      "♓ Pisces",
      "♈ Aries",
      "♉ Taurus",
      "♊ Gemini",
      "♋ Cancer",
      "♌ Leo",
      "♍ Virgo",
      "♎ Libra",
      "♏ Scorpio",
      "♐ Sagittarius",
    ],
  },
];

// ===========================
// CHIP COMPONENT
// ===========================
const OptionChip = React.memo(
  ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => {
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
            style={[styles.optionChip, selected && styles.optionSelected]}
          >
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
export default function LifestyleSignup() {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSelect = useCallback((questionKey: string, option: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswers((prev) => {
      if (prev[questionKey] === option) {
        const updated = { ...prev };
        delete updated[questionKey];
        return updated;
      }
      return { ...prev, [questionKey]: option };
    });
  }, []);

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

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

      await supabase.from("lifestyle").delete().eq("user_id", session.user.id);
      const { error } = await supabase.from("lifestyle").insert(payload);
      if (error) throw error;

      router.push("/lifestyle3_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

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
      <Pressable style={styles.skipButton} onPress={() => handleNext()}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Let’s talk about your{"\n"}lifestyle and habits.</Text>

        {QUESTIONS.map((q, i) => (
          <View key={q.key} style={{ marginBottom: verticalScale(26), marginTop: i === 0 ? verticalScale(6) : 0 }}>
            <Text style={styles.question}>{q.label}</Text>
            <View style={styles.optionGroup}>
              {q.options.map((opt) => (
                <OptionChip
                  key={opt}
                  label={opt}
                  selected={answers[q.key] === opt}
                  onPress={() => handleSelect(q.key, opt)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Next Button */}
      <Pressable onPress={handleNext} style={styles.nextButton}>
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
  progressFill: { height: verticalScale(6), width: "70%", backgroundColor: BLUE, borderRadius: scale(3) },

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
  question: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: INK_SOFT,
    marginBottom: verticalScale(12),
  },
  optionGroup: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderRadius: scale(30),
  },

  optionChip: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(22),
    borderRadius: scale(30),
    minWidth: scale(110),
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: { transform: [{ scale: 1.02 }] },

  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#1B2B44",
    textAlign: "center",
  },
  optionTextSelected: { color: "#FFFFFF" },

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
