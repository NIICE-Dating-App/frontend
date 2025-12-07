// app/(onboarding)/(common)/marital_status_signup.tsx
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

// ==========================================
// MARITAL STATUS OPTIONS (matches marital_status_enum)
// ==========================================
const OPTIONS = [
  { value: "single", label: "💫 Single" },
  { value: "in_relationship", label: "💑 In a Relationship" },
  { value: "engaged", label: "💍 Engaged" },
  { value: "married", label: "💒 Married" },
  { value: "divorced", label: "📝 Divorced" },
  { value: "widowed", label: "🕊️ Widowed" },
  { value: "separated", label: "↔️ Separated" },
  { value: "its_complicated", label: "🤷 It's Complicated" },
];

// ==========================================
// CHIP COMPONENT
// ==========================================
const OptionChip = React.memo(
  ({
    label,
    selected,
    onPress,
  }: {
    label: string;
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
            style={[styles.optionChip, selected && { transform: [{ scale: 1.02 }] }]}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MaritalStatusSignup() {
  const [selected, setSelected] = useState<string | null>(null);

  const toggleOption = useCallback((value: string) => {
    setSelected((prev) => (prev === value ? null : value));
  }, []);

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Only update if user selected something
      if (selected) {
        const { error } = await supabase
          .from("profiles")
          .update({ marital_status: selected })
          .eq("id", session.user.id);

        if (error) throw error;
      }

      router.push("/(onboarding)/hometown_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Skip Button */}
      <Pressable style={styles.skipButton} onPress={handleNext}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingBottom: verticalScale(110),
          paddingTop: verticalScale(35),
        }}
      >
        <Text style={styles.title}>What's your relationship status?</Text>
        <Text style={styles.subtitle}>
          This helps us personalize your experience. You can skip if you prefer.
        </Text>

        <View style={styles.optionGroup}>
          {OPTIONS.map((opt) => (
            <OptionChip
              key={opt.value}
              label={opt.label}
              selected={selected === opt.value}
              onPress={() => toggleOption(opt.value)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Next Button */}
      <Pressable onPress={handleNext} style={styles.nextButton}>
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
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
    top: verticalScale(58),
    right: scale(24),
    zIndex: 10,
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: "#7A838E",
    fontSize: moderateScale(15),
  },

  progressWrapper: {
    marginTop: verticalScale(88),
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
  },
  progressFill: {
    height: verticalScale(6),
    width: "78%", // After communities4 (76.44%), incrementing
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(42),
    color: INK,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    lineHeight: verticalScale(26),
    color: BLUE,
    marginBottom: verticalScale(20),
  },

  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: scale(10),
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
    minWidth: scale(140),
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#1B2B44",
    textAlign: "center",
  },
  optionTextSelected: { color: "#FFFFFF" },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});