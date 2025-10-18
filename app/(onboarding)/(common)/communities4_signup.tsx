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
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";

// ==========================================
// COMMUNITY OPTIONS
// ==========================================
const OPTIONS = [
  "🌿 Environmentalism",
  "✊ Social justice",
  "🏳️‍🌈 LGBTQIA+",
  "♀️ Feminism",
  "🧠 Mental health awareness",
  "✊🏾 Black community",
  "🧧 Asian community",
  "🪅 Latino/Hispanic community",
  "✡️ Jewish community",
  "☪️ Muslim community",
  "♿ Disability awareness",
  "💖 Body positivity",
  "🐾 Animal rights",
  "🌍 Climate action",
  "✨ Other",
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
export default function CommunitiesSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const toggleOption = useCallback((option: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) => {
      const has = prev.includes(option);

      // Deselect
      if (has) return prev.filter((x) => x !== option);

      // Prevent selecting more than 4
      if (prev.length >= 4) {
        Alert.alert("Limit reached", "You can select up to 4 communities.");
        return prev;
      }

      return [...prev, option];
    });
  }, []);

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const finalSelections = selected.includes("✨ Other")
        ? [...selected.filter((x) => x !== "✨ Other"), otherText.trim() || "Other"]
        : selected;

      const payload = {
        user_id: session.user.id,
        communities: finalSelections.length > 0 ? finalSelections : null,
      };

      await supabase.from("lifestyle").delete().eq("user_id", session.user.id);
      const { error } = await supabase.from("lifestyle").insert(payload);
      if (error) throw error;

      router.push("/(onboarding)/(common)/prompt_signup");
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
        <Text style={styles.title}>Pick the communities you support.</Text>
        <Text style={styles.subtitle}>
          Select all that apply – this helps you connect with like-minded people.
        </Text>

        <View style={styles.optionGroup}>
          {OPTIONS.map((opt) => (
            <React.Fragment key={opt}>
              <OptionChip
                label={opt}
                selected={selected.includes(opt)}
                onPress={() => toggleOption(opt)}
              />
              {opt === "✨ Other" && selected.includes("✨ Other") && (
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your community..."
                  placeholderTextColor="#7A838E"
                  value={otherText}
                  onChangeText={setOtherText}
                />
              )}
            </React.Fragment>
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

  // Match distancepref_signup positions
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
    width: "76.44%",
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
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(30),
    minWidth: scale(120),
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
  textInput: {
    width: "100%",
    borderColor: "#C8CDD2",
    borderWidth: 1,
    borderRadius: scale(12),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: INK_SOFT,
    marginTop: verticalScale(10),
    backgroundColor: "#FFFFFF",
  },
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
