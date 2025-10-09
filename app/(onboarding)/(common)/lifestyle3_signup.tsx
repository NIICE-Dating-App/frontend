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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
      "⚖️ Moderate",
      "🏛 Conservative",
      "🦅 Very Conservative",
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
// CHIP COMPONENT (Animated)
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
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
        >
          <LinearGradient
            colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F8FAFF", "#EBF1FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionChip, selected && { transform: [{ scale: 1.02 }] }]}
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
  const insets = useSafeAreaInsets();

  const handleSelect = (questionKey: string, option: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswers((prev) => ({ ...prev, [questionKey]: option }));
  };

  const handleNext = async () => {
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

      const { error } = await supabase.from("lifestyle").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      router.push("/in_progress");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable style={[styles.backButton, { top: verticalScale(10) + insets.top }]} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Progress Bar */}
      <View style={[styles.progressWrapper, { marginTop: verticalScale(44) + insets.top }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: "85%" }]} />
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingBottom: insets.bottom + verticalScale(110),
          paddingTop: verticalScale(28),
        }}
      >
        <Text style={styles.title}>Religion, politics, pets & kids.</Text>

        {QUESTIONS.map((q, i) => (
          <View
            key={q.key}
            style={{
              marginBottom: verticalScale(26),
              marginTop: i === 0 ? verticalScale(6) : 0,
            }}
          >
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
      <Pressable
        onPress={handleNext}
        disabled={Object.keys(answers).length < QUESTIONS.length}
        style={[
          styles.nextButton,
          {
            bottom: insets.bottom + verticalScale(30),
            opacity: Object.keys(answers).length < QUESTIONS.length ? 0.5 : 1,
          },
        ]}
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
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(30),
    lineHeight: verticalScale(42),
    color: INK,
    marginBottom: verticalScale(12),
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK_SOFT,
    marginBottom: verticalScale(12),
  },
  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowRadius: 8,
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
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#1B2B44",
    textAlign: "center",
  },
  optionTextSelected: { color: "#FFFFFF" },
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
