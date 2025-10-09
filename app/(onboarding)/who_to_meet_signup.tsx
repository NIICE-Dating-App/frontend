import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
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

// put near your other imports
type Mode = "dating" | "friend";

// helper: normalize any incoming `purpose` param to our two modes
const normalizePurposeToMode = (p: unknown): Mode | null => {
  if (p == null) return null;
  const s = String(p).trim().toLowerCase();
  if (s === "friend" || s === "friends") return "friend";
  if (s === "date" || s === "dating") return "dating";
  return null;
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
  const { purpose } = useLocalSearchParams();
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
            .filter((x): x is (typeof MAIN)[number] => (MAIN as readonly string[]).includes(x))
            .map((x) => ENUM_BY_LABEL[x]);
  
      if (normalized.length === 0) {
        Alert.alert("Missing info", "Please select who you would like to meet.");
        return;
      }
  
      try {
        setLoading(true);
  
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !session?.user) throw new Error("Session not found");
        const userId = session.user.id;
  
        // save choices
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ interested_in: normalized, onboarding_step: 3 })
          .eq("id", userId);
        if (updateError) throw new Error(updateError.message);
  
        // 1) try router param
        let mode: Mode | null = normalizePurposeToMode(purpose);
  
        // 2) if no reliable param (undefined / weird), fall back to DB
        if (!mode) {
          const { data: modeRow, error: modeErr } = await supabase
            .from("user_modes")
            .select("mode")
            .eq("user_id", userId)
            .maybeSingle();
          if (modeErr) throw modeErr;
          mode = (modeRow?.mode === "friend" ? "friend" : "dating");
        }
  
        // 3) route
        const nextPath =
          mode === "friend"
            ? "/(onboarding)/(friend)/hope_to_find_friend_signup"
            : "/(onboarding)/(date)/hope_to_find_signup";
  
        router.push(nextPath);
      } catch (e: any) {
        console.log("who_to_meet -> next error; purpose param =", purpose, e);
        Alert.alert("Error", e.message ?? "Something went wrong");
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

      {/* Progress */}
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
          You can choose more than one answer or select “All”.
        </Text>

        {OPTIONS.map((opt) => {
          const anim = ensureAnim(opt);
          const selected = isSelected(opt);

          return (
            <Pressable key={opt} onPress={() => toggleOption(opt)}>
              <Animated.View style={[{ transform: [{ scale: anim }] }, styles.shadowWrapper]}>
                <LinearGradient
                  colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F9FBFF", "#EEF3FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.optionButton, selected && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={moderateScale(22)}
                    color={selected ? "#FFFFFF" : "#1B2B44"}
                  />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, manualSet.length === 0 && !allMode && { opacity: 0.5 }]}
        onPress={handleNext}
        disabled={loading || (manualSet.length === 0 && !allMode)}
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
  progressFill: { height: verticalScale(6), width: "25%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(28), paddingBottom: verticalScale(120) },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(35),
    lineHeight: verticalScale(50),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: { fontFamily: Fonts.bold, fontSize: moderateScale(17), color: "#6C757D", marginBottom: verticalScale(20) },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: verticalScale(10),
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
