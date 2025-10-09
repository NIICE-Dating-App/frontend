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

// Reusable animated chip component
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

export default function LifestyleSignup() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const insets = useSafeAreaInsets();

  const handleSelect = useCallback((questionKey: string, option: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswers((prev) => ({ ...prev, [questionKey]: option }));
  }, []);

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const payload = {
        user_id: session.user.id,
        drinking: answers.drinking ?? null,
        smoking: answers.smoking ?? null,
        workout: answers.workout ?? null,
        communication: answers.communication ?? null,
        love_language: answers.love_language ?? null,
        zodiac: answers.zodiac ?? null,
      };

      const { error } = await supabase.from("lifestyle").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      router.push("/lifestyle3_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

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
          <View style={[styles.progressFill, { width: "70%" }]} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingBottom: insets.bottom + verticalScale(110),
          paddingTop: verticalScale(24), // smaller padding
        }}
      >
        <Text style={styles.title}>Let’s talk about your{"\n"}lifestyle and habits.</Text>

        {QUESTIONS.map((q, i) => (
          <View
            key={q.key}
            style={{
              marginBottom: verticalScale(26),
              marginTop: i === 0 ? verticalScale(6) : 0, // reduce top gap before first question
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
    marginBottom: verticalScale(12), // reduced gap
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
    gap: scale(8), // smaller gap to fit better
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
    minWidth: scale(110), // slightly bigger chips
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
