// app/(onboarding)/prompt_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  type DimensionValue,
} from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
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

const PROMPT_ARRAY_COL = "prompt_answers"; // JSONB array in profiles
const PROMPT_SINGLE_COL = "prompt";        // text mirror for slot 1 answer

type SavedEntry = {
  slot?: number;
  title?: string;
  category?: string;
  question?: string;
  answer?: string;
  updated_at?: string;
};

type SelectedEntry = {
  slot: 1 | 2 | 3;
  category: string;
  question: string;
  answer: string;
};

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

export default function PromptSignup() {
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(Object.keys(PROMPT_CATEGORIES)[0]);
  const [loading, setLoading] = useState(false);

  const progressWidth: DimensionValue = "82.32%";
  const allCats = useMemo(() => Object.keys(PROMPT_CATEGORIES), []);
  const promptList = PROMPT_CATEGORIES[selectedCat] ?? [];

  // refs
  const answerRefs = useRef<Record<1 | 2 | 3, RNTextInput | null>>({ 1: null, 2: null, 3: null });
  const scrollRef = useRef<ScrollView | null>(null);
  const catScrollRef = useRef<ScrollView | null>(null);
  const promptsTopY = useRef<number>(0);
  const cardTopY = useRef<number>(0);
  const rowYMap = useRef<Record<string, number>>({}); // question -> y (within card)

  // keyboard tracking
  const [kbVisible, setKbVisible] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [editing, setEditing] = useState<{ slot: 1 | 2 | 3; question: string } | null>(null);

  // horizontal cat scroll state
  const [catX, setCatX] = useState(0);
  const [catContentW, setCatContentW] = useState(0);
  const [catBoxW, setCatBoxW] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKbVisible(true);
      setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKbVisible(false);
      setKbHeight(0);
      setEditing(null);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ---------- Load existing ----------
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { data, error } = await supabase
            .from("profiles")
            .select(`${PROMPT_ARRAY_COL}, ${PROMPT_SINGLE_COL}`)
            .eq("id", session.user.id)
            .single();

          if (error && error.code !== "PGRST116") throw error;

          const arr: SavedEntry[] = Array.isArray(data?.[PROMPT_ARRAY_COL])
            ? data![PROMPT_ARRAY_COL]
            : [];

          const pre: SelectedEntry[] = [];
          for (const e of arr) {
            const s = Number(e?.slot);
            if ((s === 1 || s === 2 || s === 3) && e?.question) {
              pre.push({
                slot: s as 1 | 2 | 3,
                category: e.category || "🧠 ABOUT ME",
                question: e.question,
                answer:
                  s === 1 && typeof data?.[PROMPT_SINGLE_COL] !== "undefined" && data[PROMPT_SINGLE_COL] !== null
                    ? String(data[PROMPT_SINGLE_COL] ?? "")
                    : (e.answer || ""),
              });
            }
          }

          pre.sort((a, b) => a.slot - b.slot);
          const normalized = pre.slice(0, 3);

          if (mounted) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelected(normalized);
          }
        } catch (e) {
          console.error("Load prompts error:", e);
        }
      })();
      return () => { mounted = false; };
    }, [])
  );

  // ---------- Helpers ----------
  const slotTitleFor = (slot: 1 | 2 | 3) =>
    slot === 1 ? "Something Niice" : slot === 2 ? "Another Niice thing" : "One more Niice thing";

  const isQuestionSelected = (q: string) =>
    selected.some(s => s.question === q);

  const getByQuestion = (q: string) =>
    selected.find(s => s.question === q);

  const nextFreeSlot = (): 1 | 2 | 3 | null => {
    const used = new Set(selected.map(s => s.slot));
    for (const s of [1, 2, 3] as const) if (!used.has(s)) return s;
    return null;
  };

  const focusFirstEmpty = () => {
    const empty = [...selected].sort((a, b) => a.slot - b.slot).find(s => !s.answer.trim());
    if (empty) {
      requestAnimationFrame(() => {
        answerRefs.current[empty.slot]?.focus?.();
      });
      return true;
    }
    return false;
  };

  const addOrToggleQuestion = (category: string, question: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Prevent adding a new prompt while any selected is empty
    const hasEmpty = selected.some(s => !s.answer.trim());
    if (!isQuestionSelected(question) && hasEmpty) {
      Alert.alert("Finish your answer", "Please complete your current prompt answer before adding another.");
      focusFirstEmpty();
      return;
    }

    if (isQuestionSelected(question)) {
      setSelected(prev => prev.filter(s => s.question !== question));
      return;
    }

    if (selected.length >= 3) {
      Alert.alert("Limit reached", "You can choose up to 3 prompts.");
      return;
    }

    const slot = nextFreeSlot();
    if (!slot) return;

    setSelected(prev => [...prev, { slot, category, question, answer: "" }]);
    setTimeout(() => {
      answerRefs.current[slot]?.focus?.();
      setEditing({ slot, question });
    }, 120);
  };

  const updateAnswer = (slot: 1 | 2 | 3, text: string) => {
    setSelected(prev => prev.map(s => (s.slot === slot ? { ...s, answer: text } : s)));
  };

  const removeSlot = (slot: 1 | 2 | 3) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(prev => prev.filter(s => s.slot !== slot));
    if (editing?.slot === slot) setEditing(null);
  };

  // NEW: if the input loses focus and is empty, auto-unselect that prompt
  const handleInputBlur = (slot: 1 | 2 | 3, question: string) => {
    const cur = selected.find(s => s.slot === slot && s.question === question);
    if (cur && !cur.answer.trim()) {
      removeSlot(slot);
    }
    setEditing(null);
  };

  const sortedSelected = useMemo(
    () => [...selected].sort((a, b) => a.slot - b.slot),
    [selected]
  );

  const renderRightActions = (slot: 1 | 2 | 3) => (
    <Pressable style={styles.removeAction} onPress={() => removeSlot(slot)}>
      <Ionicons name="trash-outline" size={moderateScale(18)} color="#FFFFFF" />
      <Text style={styles.removeText}>Remove</Text>
    </Pressable>
  );

  // ---------- Scrolling helpers ----------
  const scrollToY = (y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
  };

  const scrollToPromptsTop = () => {
    const padding = verticalScale(6);
    scrollToY(Math.max(0, promptsTopY.current - padding));
  };

  const scrollToPromptQuestion = (question: string) => {
    const rel = rowYMap.current[question];
    if (typeof rel === "number") {
      const padding = verticalScale(6);
      scrollToY(Math.max(0, cardTopY.current + rel - padding));
    } else {
      setTimeout(() => {
        const rel2 = rowYMap.current[question];
        if (typeof rel2 === "number") {
          const padding2 = verticalScale(6);
          scrollToY(Math.max(0, cardTopY.current + rel2 - padding2));
        } else {
          scrollToPromptsTop();
        }
      }, 80);
    }
  };

  const nudgeCategories = (dir: "left" | "right") => {
    const delta = scale(160);
    const target = dir === "left" ? Math.max(0, catX - delta) : Math.min(catContentW - catBoxW, catX + delta);
    catScrollRef.current?.scrollTo({ x: target, animated: true });
  };

  // tap on any of the first 3 buttons (slot cards)
  const handleTopSlotPress = (slot: 1 | 2 | 3) => {
    const entry = sortedSelected.find(s => s.slot === slot);
    if (!entry) {
      scrollToPromptsTop();
      return;
    }
    if (selectedCat !== entry.category) {
      setSelectedCat(entry.category);
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToPromptQuestion(entry.question);
          setTimeout(() => {
            answerRefs.current[entry.slot]?.focus?.();
            setEditing({ slot: entry.slot, question: entry.question });
          }, 60);
        }, 60);
      });
    } else {
      scrollToPromptQuestion(entry.question);
      setTimeout(() => {
        answerRefs.current[entry.slot]?.focus?.();
        setEditing({ slot: entry.slot, question: entry.question });
      }, 60);
    }
  };

  useEffect(() => {
    rowYMap.current = {};
  }, [selectedCat]);

  // ---------- Save / Next ----------
  const handleNext = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      if (sortedSelected.length === 0) {
        Alert.alert("Choose a prompt", "Please choose at least one prompt and add your answer.");
        setLoading(false);
        return;
      }

      const empties = sortedSelected.filter(s => !s.answer.trim());
      if (empties.length > 0) {
        Alert.alert("Add your answers", "Please write an answer for each selected prompt.");
        focusFirstEmpty();
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const payloadArray = sortedSelected.map(s => ({
        slot: s.slot,
        title: slotTitleFor(s.slot),
        category: s.category,
        question: s.question,
        answer: s.answer.trim(),
        updated_at: now,
      }));

      const slot1 = sortedSelected.find(s => s.slot === 1);
      const promptValue = slot1 ? slot1.answer.trim() : "";

      const payload: Record<string, any> = {
        [PROMPT_ARRAY_COL]: payloadArray,
        [PROMPT_SINGLE_COL]: promptValue,
      };

      const { error: upErr } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", session.user.id);

      if (upErr && upErr.code !== "PGRST116") throw upErr;

      router.push("/photo_signup");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save your prompts.");
    } finally {
      setLoading(false);
    }
  }, [sortedSelected]);

  // ---------- UI ----------
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* TOP-ONLY safe area (no bottom) */}
        <SafeAreaView style={styles.container} edges={["top"]}>
          <StatusBar barStyle="dark-content" />

          {/* Back (unchanged) */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
          </Pressable>

          {/* Skip (unchanged) */}
          <Pressable style={styles.skipButton} onPress={handleNext} disabled={loading}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          {/* Progress (unchanged) */}
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>

          {/* Header (unchanged) */}
          <View style={styles.headerBlock}>
            <Text style={styles.title}>What's Niice about you?</Text>
            <Text style={styles.subtitle}>Choose up to 3 prompts to give people a taste of you</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: verticalScale(120) }}
            style={styles.scrollArea}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {}}
            scrollEventThrottle={16}
          >
            {/* Selected summary */}
            <View style={styles.selectedHeaderRow}>
              <Text style={styles.selectedHeaderText}>Selected ({selected.length}/3)</Text>
            </View>

            <View style={styles.selectedWrap}>
              {([1, 2, 3] as const).map(slot => {
                const entry = sortedSelected.find(s => s.slot === slot);

                if (!entry) {
                  return (
                    <Pressable
                      key={`slot-empty-${slot}`}
                      onPress={() => handleTopSlotPress(slot)}
                      style={({ pressed }) => [styles.selCardBase, styles.selEmpty, pressed && { opacity: 0.97 }]}
                    >
                      <Text style={styles.selEmptyTitle}>{slotTitleFor(slot)}</Text>
                      <Text style={styles.selEmptyHint}>Tap to pick from the list below</Text>
                    </Pressable>
                  );
                }

                return (
                  <Swipeable
                    key={`slot-${slot}`}
                    renderRightActions={() => renderRightActions(slot)}
                    overshootRight={false}
                    friction={2}
                  >
                    <Pressable
                      onPress={() => handleTopSlotPress(slot)}
                      style={({ pressed }) => [
                        styles.selCardBase,
                        styles.selCardActive,
                        pressed && { opacity: 0.97 },
                      ]}
                    >
                      <View style={styles.selTopRow}>
                        <Text style={styles.selTitle} numberOfLines={2}>
                          {entry.question}
                        </Text>
                        <Ionicons name="create-outline" size={moderateScale(18)} color={BLUE} />
                      </View>
                      {entry.answer.trim().length > 0 ? (
                        <Text style={styles.selAnswerText} numberOfLines={4}>
                          {entry.answer}
                        </Text>
                      ) : null}
                    </Pressable>
                  </Swipeable>
                );
              })}
            </View>

            {/* Divider */}
            <View style={styles.sectionDivider}>
              <View style={styles.sectionLine} />
              <View style={styles.sectionChip}>
                <Ionicons name="sparkles-outline" size={moderateScale(16)} color={BLUE} />
                <Text style={styles.sectionChipText}>Pick prompts below</Text>
              </View>
              <View style={styles.sectionLine} />
            </View>

            {/* Anchor */}
            <View onLayout={(e) => { promptsTopY.current = e.nativeEvent.layout.y; }} />

            {/* Categories */}
            <View style={styles.staticTop}>
              <View
                style={styles.catBox}
                onLayout={(e) => setCatBoxW(e.nativeEvent.layout.width)}
              >
                {catX > 4 && (
                  <Pressable style={[styles.catNudge, { left: scale(4) }]} onPress={() => nudgeCategories("left")}>
                    <Ionicons name="chevron-back" size={moderateScale(16)} color={BLUE} />
                  </Pressable>
                )}
                {catX < Math.max(0, catContentW - catBoxW - 4) && (
                  <Pressable style={[styles.catNudge, { right: scale(4) }]} onPress={() => nudgeCategories("right")}>
                    <Ionicons name="chevron-forward" size={moderateScale(16)} color={BLUE} />
                  </Pressable>
                )}

                <LinearGradient
                  pointerEvents="none"
                  colors={["#F7FAFF", "rgba(247,250,255,0)"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.catFade, { left: 0 }]}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(247,250,255,0)", "#F7FAFF"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.catFade, { right: 0 }]}
                />

                <ScrollView
                  ref={catScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: scale(8), paddingLeft: scale(8), alignItems: "center" }}
                  onContentSizeChange={(w) => setCatContentW(w)}
                  onScroll={(e) => setCatX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                >
                  {allCats.map((c) => {
                    const active = c === selectedCat;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSelectedCat(c);
                        }}
                        style={({ pressed }) => [
                          styles.catItem,
                          active && styles.catItemActive,
                          pressed && { opacity: 0.95 },
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
            </View>

            {/* Prompts List */}
            <View
              style={styles.card}
              onLayout={(e) => { cardTopY.current = e.nativeEvent.layout.y; }}
            >
              {promptList.map((p, i) => {
                const selectedRow = isQuestionSelected(p);
                const sel = getByQuestion(p);
                const isLast = i === promptList.length - 1;

                return (
                  <View
                    key={p}
                    onLayout={(e) => { rowYMap.current[p] = e.nativeEvent.layout.y; }}
                  >
                    <Pressable
                      onPress={() => {
                        addOrToggleQuestion(selectedCat, p);
                        setTimeout(() => {
                          if (isQuestionSelected(p)) {
                            scrollToPromptQuestion(p);
                          }
                        }, 80);
                      }}
                      hitSlop={6}
                      style={({ pressed }) => [pressed && { opacity: 0.96 }]}
                    >
                      {selectedRow ? (
                        <LinearGradient
                          colors={["#1B44CD", "#3C6FFF", "#7AA9FF"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.rowGradient]}
                        >
                          <Text style={[styles.rowTextSelected]} numberOfLines={2}>
                            {p}
                          </Text>
                          <Ionicons name="checkmark-circle" size={moderateScale(20)} color="#FFFFFF" />
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.row,
                            { borderColor: BORDER, backgroundColor: "#F7FAFF" },
                          ]}
                        >
                          <Text style={styles.rowText} numberOfLines={2}>
                            {p}
                          </Text>
                          <Ionicons name="chevron-forward" size={moderateScale(18)} color="#9AA6B2" />
                        </View>
                      )}
                    </Pressable>

                    {/* Inline answer input only when selected */}
                    {selectedRow && sel && (
                      <View style={styles.inlineAnswerWrap}>
                        <TextInput
                          ref={(r) => { answerRefs.current[sel.slot] = r; }}
                          style={styles.inlineTextInput}
                          placeholder="Write your answer…"
                          placeholderTextColor="#8FA6E5"
                          value={sel.answer}
                          onChangeText={(t) => updateAnswer(sel.slot, t)}
                          multiline={false}
                          returnKeyType="done"
                          blurOnSubmit
                          selectionColor={BLUE}
                          onFocus={() => setEditing({ slot: sel.slot, question: sel.question })}
                          onSubmitEditing={() => { Keyboard.dismiss(); }}
                          onBlur={() => handleInputBlur(sel.slot, sel.question)} // <-- auto-unselect if empty
                          maxLength={160}
                        />
                      </View>
                    )}

                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky editing banner above keyboard */}
          {kbVisible && editing && (
            <View style={[styles.editingSticky, { bottom: kbHeight + verticalScale(12) }]}>
              <Ionicons name="create-outline" size={moderateScale(18)} color={BLUE} />
              <Text style={styles.editingStickyText} numberOfLines={2}>
                {editing.question}
              </Text>
            </View>
          )}

          {/* Next (unchanged) */}
          <Pressable onPress={handleNext} style={styles.nextButton} disabled={loading}>
            <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ----------- DO-NOT-CHANGE BUTTONS & PROGRESS -----------
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
  skipButton: {
    position: "absolute",
    top: verticalScale(58),
    right: scale(24),
    zIndex: 20,
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
    fontSize: moderateScale(17),
    lineHeight: verticalScale(26),
    marginBottom: verticalScale(7),
    color: BLUE,
  },
  // ---------------------------------------------------------

  scrollArea: { flex: 1 },

  selectedHeaderRow: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedHeaderText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: INK_SOFT,
  },

  selectedWrap: {
    paddingHorizontal: scale(24),
    gap: verticalScale(12),
  },

  // Top buttons styled like chips
  selCardBase: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "#E4EAF5",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
  },
  selCardActive: {
    borderColor: "#BFD2FF",
    backgroundColor: "#EEF4FF",
  },
  selTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(8),
  },

  selEmpty: {
    borderStyle: "dashed",
    borderColor: "#C8CDD2",
    backgroundColor: "#F8FBFF",
  },
  selEmptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14.5),
    color: INK_SOFT,
  },
  selEmptyHint: {
    marginTop: verticalScale(6),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12.5),
    color: "#7A838E",
  },

  selTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: INK,
  },
  // BLUE answer preview
  selAnswerText: {
    marginTop: verticalScale(8),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14.5),
    color: BLUE,
  },

  // swipe-to-delete action
  removeAction: {
    width: scale(104),
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(16),
    marginVertical: verticalScale(4),
    marginLeft: scale(8),
  },
  removeText: {
    marginTop: verticalScale(4),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: "#FFFFFF",
  },

  // Divider
  sectionDivider: {
    marginTop: verticalScale(16),
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(24),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },
  sectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(10),
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DCE6F5",
    borderRadius: scale(999),
  },
  sectionChipText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12.5),
    color: BLUE,
  },

  // Category tabs
  staticTop: {
    paddingTop: verticalScale(12),
    paddingHorizontal: scale(24),
    backgroundColor: BG,
  },

  catBox: {
    position: "relative",
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DCE6F5",
    borderRadius: scale(16),
    paddingVertical: verticalScale(6),
    overflow: "hidden",
  },
  catFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: scale(28),
    zIndex: 2,
  },
  catNudge: {
    position: "absolute",
    top: "50%",
    marginTop: -verticalScale(14),
    width: scale(28),
    height: verticalScale(28),
    borderRadius: scale(14),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6F5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },

  catItem: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    marginRight: scale(8),
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF5",
    borderRadius: scale(12),
  },
  catItemActive: {
    borderColor: "#BFD2FF",
    backgroundColor: "#EEF4FF",
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

  // Prompts list card — roomy
  card: {
    backgroundColor: CARD_BG,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginTop: verticalScale(12),
    marginHorizontal: scale(16),
  },

  // Unselected row
  row: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: BORDER,
  },
  rowText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    lineHeight: verticalScale(30),
    color: INK_SOFT,
    flex: 1,
    marginRight: scale(10),
  },

  // Selected row (gradient)
  rowGradient: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "#6E92FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTextSelected: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    lineHeight: verticalScale(30),
    color: "#FFFFFF",
    flex: 1,
    marginRight: scale(10),
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(16),
    marginRight: scale(16),
  },

  // Inline input
  inlineAnswerWrap: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    backgroundColor: CARD_BG,
  },
  inlineTextInput: {
    borderColor: "#BFD2FF",
    borderWidth: 1,
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: BLUE,
    backgroundColor: "#F7FAFF",
  },

  // Sticky banner
  editingSticky: {
    position: "absolute",
    left: scale(24),
    right: scale(24),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DCE6F5",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  editingStickyText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14.5),
    color: INK_SOFT,
  },

  // Next (unchanged)
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
