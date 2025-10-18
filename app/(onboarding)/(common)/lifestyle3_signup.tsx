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

// ===========================
// QUESTIONS
// ===========================
const QUESTIONS = [
  {
    key: "religion",
    label: "What are your spiritual beliefs?",
    options: [
      "🤔 Agnostic",
      "🚫 Atheist",
      "☸️ Buddhist",
      "✝️ Catholic",
      "⛪ Christian",
      "🕉 Hindu",
      "✡️ Jewish",
      "☪️ Muslim",
      "🪔 Sikh",
      "🌌 Spiritual but not religious",
      "✨ Other",
      "🙈 Prefer not to say",
    ],
  },
    {
      key: "politics",
      label: "What are your political views?",
      options: [
        "🕊 Very Liberal",
        "🌈 Liberal",
        "⚖️ Moderate / Centrist",
        "🏛 Conservative",
        "🦅 Very Conservative",
        "🌍 Progressive",
        "💚 Green / Environmentalist",
        "📜 Libertarian",
        "✊ Socialist / Leftist",
        "💡 Independent Thinker",
        "🙃 Not political",
        "🤫 Prefer not to say",
      ],
    },
    
  {
    key: "pets",
    label: "Do you have any pets?",
    options: [
      "🐶 Dog",
      "🐱 Cat",
      "🦎 Reptile",
      "🐸 Amphibian",
      "🐦 Bird",
      "🐠 Fish",
      "❤ Don't have but love",
      "🐾 Other",
      "🐢 Turtle",
      "🐹 Hamster",
      "🐰 Rabbit",
      "🚫 Pet-free",
      "🐾 All the pets",
      "🤔 Want a pet",
      "🤧 Allergic to pets",
    ],
  },
  {
    key: "kids",
    label: "Do you have kids?",
    options: [
      "🙅‍♂️ No kids, and don't want them",
      "🤱 No kids, but want them someday",
      "🤔 No kids, still deciding",
      "👨‍👧 Have kids",
      "👴 Have grown kids",
      "🙈 Prefer not to say",
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
export default function BeliefsPetsKidsSignup() {
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

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const payload = {
        user_id: session.user.id,
        religion: answers.religion ?? null,
        politics: answers.politics ?? null,
        pets: answers.pets ?? null,
        kids: answers.kids ?? null,
      };

      await supabase.from("lifestyle").delete().eq("user_id", session.user.id);
      const { error } = await supabase.from("lifestyle").insert(payload);
      if (error) throw error;

      router.push("/(onboarding)/(common)/communities4_signup");
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
      <Pressable style={styles.skipButton} onPress={handleSave}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Religion, politics, pets & kids.</Text>

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
      <Pressable onPress={handleSave} style={styles.nextButton}>
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
  progressFill: { height: verticalScale(6), width: "70.56%", backgroundColor: BLUE, borderRadius: scale(3) },

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
    marginTop: verticalScale(-10),
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
