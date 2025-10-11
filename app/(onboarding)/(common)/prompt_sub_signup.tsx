import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
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
const BORDER = "#D8DFE8";
const CARD_BG = "#FFFFFF";

const PROMPT_ARRAY_COL = "prompt_answers"; // JSONB array
const PROMPT_SINGLE_COL = "prompt";        // text column for slot 1 answer

type CatMap = Record<string, string[]>;

const PROMPT_CATEGORIES: CatMap = {
  "🧘 SELF-CARE": [
    "How I like to disconnect and recharge",
    "My go-to method for lifting my spirits",
    "A recent self-discovery I made",
    "What I take pride in",
    "A personal goal I'm working toward",
    "What I'm passionately interested in right now",
    "How I start my day",
    "My ideal relaxing weekend",
    "When I feel most confident",
    "A boundary I've learned to set",
    "How I'd describe my mindset lately",
    "What self-care looks like for me",
  ],
  "🤝 CONNECTION / LOOKING FOR": [
    "What I appreciate most in others",
    "The quality that instantly earns my respect",
    "Something I'm curious to learn about people",
    "What I believe creates a strong connection",
    "A green flag for me",
    "I feel most connected when",
    "We'll vibe if you",
    "Share your thoughts about",
    "What I value in friendships and beyond",
    "Something that always wins me over",
  ],
  "🌆 EXPERIENCES": [
    "The meal I'd love to share with someone",
    "A favorite local spot I recommend",
    "My go-to activity when exploring the city",
    "How I like to prepare for meeting new people",
    "My ideal hangout or outing",
    "We'll connect well if",
    "What makes or breaks a great experience",
    "My best suggestion for a chill plan",
    "A fun thing to try together",
    "My favorite creative way to spend an evening",
    "Something I'd like to experience again",
    "An alternative to a typical night out",
  ],
  "🎲 BIT OF FUN": [
    "A memorable moment from my past",
    "What always makes me laugh",
    "What gets me unreasonably excited",
    "What I do when my phone dies",
    "A game: guess which statement is false",
    "A confession I'm willing to make",
    "A character I relate to",
    "My hidden talent",
    "My favorite way to unwind",
    "The last random note on my phone",
    "Something that surprised me recently",
    "A past trend I'd bring back",
    "What my friends call me",
  ],
  "🧠 ABOUT ME": [
    "Describe me in three words",
    "The fastest way to connect with me",
    "An important fact about me",
    "When I feel most joyful",
    "My reputation among friends",
    "What brings me everyday happiness",
    "My favorite topic of conversation",
    "What I'm quietly proud of",
    "Where I spend my free time",
    "Something people should know about my circle",
    "My area of deep enthusiasm",
    "My unique strength",
    "What I find hard to tolerate",
    "How I'd summarize myself briefly",
  ],
  "💬 REAL TALK": [
    "The best and worst things about being my friend",
    "How I show care and affection",
    "My biggest personal challenge",
    "Something I quietly believe",
    "Please understand if I",
    "My guilty pleasure I'll defend",
    "A topic I'd love your take on",
    "What tends to make me anxious",
    "Something the world needs more of",
    "A surprising fact about me",
    "Where people misjudge me",
    "What I'm striving to achieve",
    "A family story I rarely tell",
  ],
};

function PromptRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable 
      onPress={onPress} 
      hitSlop={6} 
      style={({ pressed }) => [pressed && { opacity: 0.96 }]}
    >
      <View
        style={[
          styles.row,
          { 
            borderColor: selected ? BLUE : BORDER, 
            backgroundColor: CARD_BG,
          },
        ]}
      >
        <Text style={[styles.rowText, selected && { color: INK }]}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={moderateScale(18)}
          color={selected ? BLUE : "#9AA6B2"}
        />
      </View>
    </Pressable>
  );
}

export default function PromptSubSignup() {
  const params = useLocalSearchParams<{ slot?: string; title?: string }>();
  const slot: 1 | 2 | 3 = useMemo(() => {
    const n = Number(params.slot);
    return (n === 1 || n === 2 || n === 3 ? n : 1) as 1 | 2 | 3;
  }, [params.slot]);
  const slotTitle = decodeURIComponent((params.title as string) || "").trim() || "Your prompt";

  const allCats = useMemo(() => Object.keys(PROMPT_CATEGORIES), []);
  const [selectedCat, setSelectedCat] = useState<string>(allCats[0]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const onPickPrompt = (p: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPrompt((prev) => (prev === p ? null : p));
    setAnswer((prev) => (selectedPrompt === p ? "" : prev));
  };

  const handleDone = useCallback(async () => {
    if (!selectedPrompt || !answer.trim()) {
      Alert.alert("Incomplete", "Pick a prompt and write your answer.");
      return;
    }
    try {
      setSaving(true);
      const { data: { session} } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // 1) Read existing JSON array
      let existing: any[] = [];
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`${PROMPT_ARRAY_COL}`)
          .eq("id", session.user.id)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        if (data && data[PROMPT_ARRAY_COL]) {
          existing = Array.isArray(data[PROMPT_ARRAY_COL]) ? data[PROMPT_ARRAY_COL] : [];
        }
      } catch {
        existing = [];
      }

      // 2) Upsert current slot entry inside the array
      const entry = {
        slot,
        title: slotTitle,
        category: selectedCat,
        question: selectedPrompt,
        answer: answer.trim(),
        updated_at: new Date().toISOString(),
      };
      const next = [...existing.filter((x) => x?.slot !== slot), entry];

      // 3) Build payload: always update JSON array; if slot 1, also update 'prompt' with the answer
      const payload: Record<string, any> = { [PROMPT_ARRAY_COL]: next };
      if (slot === 1) {
        payload[PROMPT_SINGLE_COL] = answer.trim();
      }

      // 4) Save
      const { error: upErr } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id);
      if (upErr && upErr.code !== "PGRST116") throw upErr;

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save your prompt.");
    } finally {
      setSaving(false);
    }
  }, [selectedPrompt, answer, slot, slotTitle, selectedCat]);

  const prompts = PROMPT_CATEGORIES[selectedCat] ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* STATIC TOP */}
      <View style={styles.staticTop}>
        <Text style={styles.title}>{slotTitle}</Text>
        <Text style={styles.subtitle}>Pick a prompt and add your answer</Text>

        {/* Horizontal text tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: scale(6) }}
          style={{ marginTop: verticalScale(10) }}
        >
          {allCats.map((c) => {
            const active = c === selectedCat;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedCat(c);
                  setSelectedPrompt(null);
                  setAnswer("");
                }}
                style={({ pressed }) => [
                  styles.catItem,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.catText, active && styles.catTextActive]} numberOfLines={1}>
                  {c}
                </Text>
                <View style={[styles.catIndicator, active && { opacity: 1 }]} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* SCROLLABLE LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingBottom: verticalScale(140),
          paddingTop: verticalScale(8),
        }}
        style={styles.scrollArea}
      >
        <View style={styles.card}>
          {prompts.map((p, i) => {
            const selected = selectedPrompt === p;
            const isLast = i === prompts.length - 1;
            return (
              <View key={p}>
                <PromptRow 
                  label={p} 
                  selected={selected} 
                  onPress={() => onPickPrompt(p)} 
                />
                {!isLast && <View style={styles.divider} />}
                {selected && (
                  <>
                    <View style={styles.answerWrap}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Write your answer…"
                        placeholderTextColor="#7A838E"
                        value={answer}
                        onChangeText={setAnswer}
                        multiline
                        maxLength={160}
                      />
                    </View>
                    {!isLast && <View style={styles.divider} />}
                  </>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* DONE */}
      <Pressable
        onPress={handleDone}
        disabled={!selectedPrompt || !answer.trim() || saving}
        style={[
          styles.doneButton,
          (!selectedPrompt || !answer.trim() || saving) && { opacity: 0.55 },
        ]}
      >
        <Ionicons name="checkmark" size={moderateScale(30)} color="#FFFFFF" />
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
    zIndex: 20,
  },

  staticTop: {
    paddingTop: verticalScale(90),
    paddingHorizontal: scale(24),
    backgroundColor: BG,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(42),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    lineHeight: verticalScale(24),
    color: BLUE,
  },

  catItem: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    marginRight: scale(8),
    alignItems: "center",
  },
  catText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14.5),
    color: INK_SOFT,
  },
  catTextActive: { color: INK },
  catIndicator: {
    height: verticalScale(3),
    width: "100%",
    backgroundColor: BLUE,
    borderRadius: scale(2),
    marginTop: verticalScale(6),
    opacity: 0,
  },

  scrollArea: { flex: 1 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  row: {
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  rowText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15.5),
    color: INK_SOFT,
    flex: 1,
    marginRight: scale(10),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(14),
    marginRight: scale(14),
  },

  answerWrap: {
    paddingHorizontal: scale(14),
    paddingBottom: verticalScale(12),
    paddingTop: verticalScale(6),
  },
  textInput: {
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: INK_SOFT,
    backgroundColor: "#FFFFFF",
  },

  doneButton: {
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