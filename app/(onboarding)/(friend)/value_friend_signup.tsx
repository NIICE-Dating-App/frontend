// frontend/app/(onboarding)/(friend)/vale_friend_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// 🟢 Options for friendship values
const OPTIONS = [
  "Loyalty",
  "Trustworthy",
  "Good listener",
  "Sense of humor",
  "Supportive",
  "Non-judgmental",
  "Honest",
  "Reliable",
  "Fun to be around",
  "Authentic",
  "Understanding",
  "Shared interests",
  "Deep conversations",
  "Adventurous",
  "Positive energy",
  "Low-maintenance",
  "Makes time for me",
  "Encouraging",
  "Respectful of boundaries",
  "Growth-minded",
];

// 🔵 UI → ENUM mapping for DB
const ENUM_MAP: Record<string, string> = {
  "Loyalty": "loyalty",
  "Trustworthy": "trustworthy",
  "Good listener": "good_listener",
  "Sense of humor": "sense_of_humor",
  "Supportive": "supportive",
  "Non-judgmental": "non_judgmental",
  "Honest": "honest",
  "Reliable": "reliable",
  "Fun to be around": "fun_to_be_around",
  "Authentic": "authentic",
  "Understanding": "understanding",
  "Shared interests": "shared_interests",
  "Deep conversations": "deep_conversations",
  "Adventurous": "adventurous",
  "Positive energy": "positive_energy",
  "Low-maintenance": "low_maintenance",
  "Makes time for me": "makes_time_for_me",
  "Encouraging": "encouraging",
  "Respectful of boundaries": "respectful_of_boundaries",
  "Growth-minded": "growth_minded",
};

export default function HopeToFindFriendSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const animRefs = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.07, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const toggleOption = (opt: string) => {
    pulse(opt);
    if (selected.includes(opt)) {
      setSelected(selected.filter((x) => x !== opt));
    } else {
      if (selected.length >= 5) {
        Alert.alert("Limit reached", "You can choose up to 5 values.");
        return;
      }
      setSelected([...selected, opt]);
    }
  };

  const isSelected = (opt: string) => selected.includes(opt);

  const handleNext = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session?.user) throw new Error("Session not found");

      // normalize to enum values
      const normalized = selected.map((x) => ENUM_MAP[x]);

      // 🟦 Insert or update user_modes for friend mode
      const { error: upsertError } = await supabase
        .from("user_modes")
        .upsert(
          {
            user_id: session.user.id,
            mode: "friend",
            value_friend: normalized, // ✅ correct enum[] column
            updated_at: new Date(),
          },
          { onConflict: "user_id,mode" }
        );

      if (upsertError) throw new Error(upsertError.message);

      // update onboarding progress
      await supabase
        .from("profiles")
        .update({ onboarding_step: 4 })
        .eq("id", session.user.id);

      // 🧭 Route to next common page
      router.push("/(onboarding)/(common)/lifestyle2_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What do you value in friendship?</Text>
        <Text style={styles.subtitle}>
          Choose up to 5 that feel true to you — or skip if you’d like.
        </Text>

        {OPTIONS.map((opt) => {
          const anim = ensureAnim(opt);
          const selectedState = isSelected(opt);

          return (
            <Pressable key={opt} onPress={() => toggleOption(opt)}>
              <Animated.View style={[{ transform: [{ scale: anim }] }, styles.shadowWrapper]}>
                <LinearGradient
                  colors={selectedState ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F9FBFF", "#EEF3FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.optionButton, selectedState && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selectedState && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                  <Ionicons
                    name={selectedState ? "checkmark-circle" : "ellipse-outline"}
                    size={moderateScale(22)}
                    color={selectedState ? "#FFFFFF" : "#1B2B44"}
                  />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Next Button (skippable) */}
      <TouchableOpacity
        style={[styles.nextButton, loading && { opacity: 0.5 }]}
        onPress={handleNext}
        disabled={loading}
      >
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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

  progressWrapper: { marginTop: verticalScale(88), paddingHorizontal: scale(24) },
  progressTrack: { height: verticalScale(6), backgroundColor: "#C8CDD2", borderRadius: scale(3) },
  progressFill: { height: verticalScale(6), width: "58.80%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(28), paddingBottom: verticalScale(120) },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(33),
    lineHeight: verticalScale(48),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: "#6C757D",
    marginBottom: verticalScale(20),
  },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: verticalScale(12),
  },

  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionSelected: { shadowOpacity: 0.4, shadowRadius: 8, transform: [{ scale: 1.02 }] },
  optionText: { fontFamily: Fonts.bold, fontSize: moderateScale(17), color: "#1B2B44" },
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