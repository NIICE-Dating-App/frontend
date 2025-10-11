import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    Alert,
    LayoutAnimation,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    UIManager,
    View,
    type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";
const PROMPT_ANSWERS_COL = "prompt_answers"; // JSONB array
const PROMPT_COL = "prompt"; // Slot 1 answer mirror

type SavedEntry = {
  slot: number;
  title?: string;
  category?: string;
  question?: string;
  answer?: string;
  updated_at?: string;
};

type PromptItem = { 
  slot: 1 | 2 | 3; 
  title: string; 
  route: string;
};

const PROMPTS: PromptItem[] = [
  { slot: 1, title: "Something Niice",      route: "/(onboarding)/(common)/prompt_sub_signup" },
  { slot: 2, title: "Another Niice thing",  route: "/(onboarding)/(common)/prompt_sub2_signup" },
  { slot: 3, title: "One more Niice thing", route: "/(onboarding)/(common)/prompt_sub3_signup" },
];
  
export default function PromptSignup() {
  const [savedMap, setSavedMap] = useState<Record<number, SavedEntry>>({});
  const [slot1Answer, setSlot1Answer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progressWidth: DimensionValue = "80%";

  // Load saved prompts whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;

          // Fetch both columns
          const { data, error } = await supabase
            .from("profiles")
            .select(`${PROMPT_ANSWERS_COL}, ${PROMPT_COL}`)
            .eq("id", session.user.id)
            .single();

          if (error && error.code !== "PGRST116") throw error;

          const arr: SavedEntry[] = Array.isArray(data?.[PROMPT_ANSWERS_COL]) 
            ? data![PROMPT_ANSWERS_COL] 
            : [];
          
          const map: Record<number, SavedEntry> = {};
          for (const e of arr) {
            if (e?.slot) map[e.slot] = e;
          }

          if (mounted) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSavedMap(map);
            // Slot 1 prefers the dedicated 'prompt' column
            setSlot1Answer((data?.[PROMPT_COL] as string) ?? map[1]?.answer ?? null);
          }
        } catch (err) {
          console.error("Error loading prompts:", err);
        }
      })();
      return () => { mounted = false; };
    }, [])
  );

  // Display the chosen question or placeholder
  const displayForSlot = useCallback(
    (slot: 1 | 2 | 3) =>
      (savedMap[slot]?.question?.trim() || "Add a prompt"),
    [savedMap]
  );

  // Get answer for display
  const answerForSlot = useCallback(
    (slot: 1 | 2 | 3) => {
      if (slot === 1) return slot1Answer ?? "";
      return savedMap[slot]?.answer ?? "";
    },
    [savedMap, slot1Answer]
  );

  const isFilled = useCallback(
    (slot: 1 | 2 | 3) => Boolean(savedMap[slot]?.question),
    [savedMap]
  );

  const openSlot = useCallback(async (p: PromptItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");
  
      // Use the full route path for proper Expo Router navigation
      router.push({
        pathname: p.route as any,
        params: { 
          slot: String(p.slot), 
          title: p.title 
        }
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not continue.");
    }
  }, []);

  const handleNext = useCallback(() => {
    router.push("/in_progress");
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Skip */}
      <Pressable style={styles.skipButton} onPress={handleNext}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>

      {/* Header */}
      <View style={styles.headerBlock}>
        <Text style={styles.title}>What's niice about you?</Text>
        <Text style={styles.subtitle}>Choose 3 prompts to give people a taste of you</Text>
      </View>

      {/* Cards */}
      <View style={styles.cards}>
        {PROMPTS.map((p) => {
          const filled = isFilled(p.slot);
          const question = displayForSlot(p.slot);
          const answer = answerForSlot(p.slot);
          const hasAnswer = !!answer;

          return (
            <Pressable
              key={p.slot}
              style={({ pressed }) => [styles.cardShadow, pressed && { opacity: 0.96 }]}
              onPress={() => openSlot(p)}
              hitSlop={6}
            >
              <LinearGradient
                colors={["#F8FAFF", "#EBF1FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Small grey label: static box title */}
                <Text style={styles.cardTopTitle}>{p.title}</Text>

                {/* Main line: either "Add a prompt" or the chosen question */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {question}
                </Text>

                {/* Answer or hint */}
                <Text 
                  style={[styles.cardHint, hasAnswer && { opacity: 0.9 }]}
                  numberOfLines={2}
                >
                  {hasAnswer ? answer : (filled ? "Tap to add your answer" : "Tap to choose a prompt")}
                </Text>

                {/* Right chevron */}
                <View style={styles.cardChevron}>
                  <Ionicons name="chevron-forward" size={moderateScale(22)} color={BLUE} />
                </View>

                {/* Filled badge */}
                {filled && (
                  <View style={styles.filledBadge}>
                    <Ionicons name="checkmark-circle" size={moderateScale(18)} color={BLUE} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>

      {/* Next */}
      <Pressable onPress={handleNext} style={styles.nextButton} disabled={loading}>
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

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
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  headerBlock: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(28),
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
    fontSize: moderateScale(16),
    lineHeight: verticalScale(24),
    color: BLUE,
  },

  cards: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(18),
    gap: verticalScale(14),
  },
  cardShadow: {
    shadowColor: "#1B44CD",
    shadowRadius: 10,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    borderRadius: scale(16),
  },
  card: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(18),
    minHeight: verticalScale(92),
    justifyContent: "center",
  },

  cardTopTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12.5),
    color: "#6F7B88",
    marginBottom: verticalScale(6),
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK_SOFT,
  },
  cardHint: {
    marginTop: verticalScale(6),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    opacity: 0.55,
    color: INK_SOFT,
  },

  cardChevron: {
    position: "absolute",
    right: scale(14),
    top: "50%",
    marginTop: -verticalScale(11),
  },
  filledBadge: {
    position: "absolute",
    right: scale(14),
    top: verticalScale(12),
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