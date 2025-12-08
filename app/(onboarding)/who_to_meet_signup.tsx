import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

type GenderEnum = "woman" | "man" | "nonbinary";

const MAIN = ["Woman", "Man", "Nonbinary"] as const;
const OPTIONS = [...MAIN, "All"] as const;

// Map UI labels → Postgres enum values (case-sensitive)
const ENUM_BY_LABEL: Record<(typeof MAIN)[number], GenderEnum> = {
  Woman: "woman",
  Man: "man",
  Nonbinary: "nonbinary",
};

export default function WhoToMeetSignup() {
  const [manualSet, setManualSet] = useState<string[]>([]);
  const [allMode, setAllMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastManualRef = useRef<string[]>([]);
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

    if (opt === "All") {
      if (allMode) {
        // 🔴 If "All" is currently active and user deselects it → clear everything
        setAllMode(false);
        setManualSet([]);
        lastManualRef.current = [];
      } else {
        // 🟢 If user activates "All" → save current manual selection and enable allMode
        lastManualRef.current = manualSet;
        setManualSet([]);
        setAllMode(true);
      }
      return;
    }

    if (allMode) {
      // leaving ALL → single selection
      setAllMode(false);
      setManualSet([opt]);
      return;
    }

    const next = manualSet.includes(opt)
      ? manualSet.filter((x) => x !== opt)
      : [...manualSet, opt];

    // if all three selected, collapse to ALL
    if (MAIN.every((m) => next.includes(m))) {
      lastManualRef.current = next;
      setManualSet([]);
      setAllMode(true);
    } else {
      setManualSet(next);
    }
  };

  const isSelected = (opt: string) =>
    opt === "All" ? allMode : allMode ? true : manualSet.includes(opt);

  const handleNext = async () => {
    // normalize to enum array for DB
    const normalized: GenderEnum[] = allMode
      ? ["woman", "man", "nonbinary"]
      : manualSet
          .filter((x): x is (typeof MAIN)[number] =>
            (MAIN as readonly string[]).includes(x)
          )
          .map((x) => ENUM_BY_LABEL[x]);

    if (normalized.length === 0) {
      Alert.alert("Missing info", "Please select who you would like to meet.");
      return;
    }

    try {
      setLoading(true);
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();
      if (sessErr || !session?.user) throw new Error("Session not found");

      const userId = session.user.id;

      // ✅ Save to profiles.interested_in only (no more user_modes)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          interested_in: normalized,
          onboarding_step: 7,
        })
        .eq("id", userId);

      if (updateError) throw new Error(updateError.message);

      // ✅ UNIFIED ROUTING - No more mode branching!
      router.push("/(onboarding)/(common)/hobbies1_signup");
    } catch (e: any) {
      console.log("who_to_meet -> next error:", e);
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>Who would you like to meet?</Text>
        <Text style={styles.subtitle}>
          You can choose more than one answer or select "All".
        </Text>

        {OPTIONS.map((opt) => {
          const anim = ensureAnim(opt);
          const selected = isSelected(opt);

          return (
            <Pressable key={opt} onPress={() => toggleOption(opt)}>
              <Animated.View style={{ transform: [{ scale: anim }] }}>
                <LinearGradient
                  colors={
                    selected
                      ? (["#1B44CD", "#3C6FFF"] as const)
                      : (["#FFFFFF", "#F8FAFF"] as const)
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.optionButton, selected && styles.optionSelected]}
                >
                  <Text
                    style={[styles.optionText, selected && styles.optionTextSelected]}
                  >
                    {opt}
                  </Text>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={selected ? "#FFFFFF" : Colors.BLUE}
                  />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          );
        })}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            You can always change this later in your profile settings.
          </Text>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        style={[
          styles.nextButton,
          manualSet.length === 0 && !allMode && { opacity: 0.5 },
        ]}
        onPress={handleNext}
        disabled={loading || (manualSet.length === 0 && !allMode)}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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
    width: "41.16%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContainer: {
    flex: 1,
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
    paddingTop: verticalScale(4),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(20),
    lineHeight: verticalScale(22),
  },

  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(18),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: Colors.INK,
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