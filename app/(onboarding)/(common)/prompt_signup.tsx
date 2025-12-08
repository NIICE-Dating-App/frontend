// app/(onboarding)/prompt_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import type { TextInput as RNTextInput } from "react-native";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

const PROMPT_ARRAY_COL = "prompt_answers";
const PROMPT_SINGLE_COL = "prompt";

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

type CatMap = Record<string, { icon: string; iconLib: "ionicons" | "material"; prompts: string[] }>;

const PROMPT_CATEGORIES: CatMap = {
  "SELF-CARE": {
    icon: "heart-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
  "CONNECTION": {
    icon: "people-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
  "EXPERIENCES": {
    icon: "map-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
  "BIT OF FUN": {
    icon: "game-controller-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
  "ABOUT ME": {
    icon: "person-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
  "REAL TALK": {
    icon: "chatbubbles-outline",
    iconLib: "ionicons",
    prompts: [
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
  },
};

export default function PromptSignup() {
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(Object.keys(PROMPT_CATEGORIES)[0]);
  const [loading, setLoading] = useState(false);

  const allCats = useMemo(() => Object.keys(PROMPT_CATEGORIES), []);
  const currentCategory = PROMPT_CATEGORIES[selectedCat];
  const promptList = currentCategory?.prompts ?? [];

  const answerRefs = useRef<Record<1 | 2 | 3, RNTextInput | null>>({
    1: null,
    2: null,
    3: null,
  });
  const scrollRef = useRef<ScrollView | null>(null);
  const promptPositions = useRef<Record<string, number>>({});

  // Load existing prompts
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
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
                category: e.category || "ABOUT ME",
                question: e.question,
                answer:
                  s === 1 &&
                  typeof data?.[PROMPT_SINGLE_COL] !== "undefined" &&
                  data[PROMPT_SINGLE_COL] !== null
                    ? String(data[PROMPT_SINGLE_COL] ?? "")
                    : e.answer || "",
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
      return () => {
        mounted = false;
      };
    }, [])
  );

  const slotTitleFor = (slot: 1 | 2 | 3) =>
    slot === 1 ? "Something Nice" : slot === 2 ? "Another Nice thing" : "One more Nice thing";

  const isQuestionSelected = (q: string) => selected.some((s) => s.question === q);

  const getByQuestion = (q: string) => selected.find((s) => s.question === q);

  const nextFreeSlot = (): 1 | 2 | 3 | null => {
    const used = new Set(selected.map((s) => s.slot));
    for (const s of [1, 2, 3] as const) if (!used.has(s)) return s;
    return null;
  };

  const addOrToggleQuestion = (category: string, question: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  if (isQuestionSelected(question)) {
    setSelected((prev) => prev.filter((s) => s.question !== question));
    return;
  }

  if (selected.length >= 3) {
    Alert.alert("Limit reached", "You can choose up to 3 prompts.");
    return;
  }

  const slot = nextFreeSlot();
  if (!slot) return;

  setSelected((prev) => [...prev, { slot, category, question, answer: "" }]);

  setTimeout(() => {
    const yPosition = promptPositions.current[question];
    if (yPosition !== undefined) {
      // Calculate total offset from top of scroll view
      // Title + subtitle + counter + categories + prompts header ≈ 280
      const headerOffset = verticalScale(370);
      const keyboardOffset = verticalScale(150); // Space above keyboard
      
      scrollRef.current?.scrollTo({ 
        y: headerOffset + yPosition - keyboardOffset,
        animated: true 
      });
    }
    
    setTimeout(() => {
      answerRefs.current[slot]?.focus();
    }, 100);
  }, 250);
};

  const updateAnswer = (slot: 1 | 2 | 3, text: string) => {
    setSelected((prev) => prev.map((s) => (s.slot === slot ? { ...s, answer: text } : s)));
  };

  const handleInputBlur = (slot: 1 | 2 | 3, question: string) => {
    const cur = selected.find((s) => s.slot === slot && s.question === question);
    if (cur && !cur.answer.trim()) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelected((prev) => prev.filter((s) => s.slot !== slot));
    }
  };

  const sortedSelected = useMemo(
    () => [...selected].sort((a, b) => a.slot - b.slot),
    [selected]
  );

  const handleNext = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Require at least 1 prompt with answer
      if (sortedSelected.length === 0) {
        Alert.alert(
          "Choose a prompt",
          "Please choose at least one prompt and add your answer."
        );
        setLoading(false);
        return;
      }

      const empties = sortedSelected.filter((s) => !s.answer.trim());
      if (empties.length > 0) {
        Alert.alert(
          "Add your answers",
          "Please write an answer for each selected prompt."
        );
        const emptySlot = empties[0].slot;
        answerRefs.current[emptySlot]?.focus();
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const payloadArray = sortedSelected.map((s) => ({
        slot: s.slot,
        title: slotTitleFor(s.slot),
        category: s.category,
        question: s.question,
        answer: s.answer.trim(),
        updated_at: now,
      }));

      const slot1 = sortedSelected.find((s) => s.slot === 1);
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

  const renderCategoryIcon = (category: keyof typeof PROMPT_CATEGORIES, isActive: boolean) => {
    const cat = PROMPT_CATEGORIES[category];
    const iconColor = isActive ? "#FFFFFF" : Colors.BLUE;
    
    if (cat.iconLib === "material") {
      return <MaterialCommunityIcons name={cat.icon as any} size={16} color={iconColor} />;
    }
    return <Ionicons name={cat.icon as any} size={16} color={iconColor} />;
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

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleNext}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>What's Nice about you?</Text>
          <Text style={styles.pageSubtitle}>
            Choose up to 3 prompts to share your personality
          </Text>

          {/* Selected Counter */}
          <View style={styles.counterCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.BLUE} />
            <Text style={styles.counterText}>
              {selected.length} of 3 prompts selected
            </Text>
          </View>

          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Choose Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {allCats.map((cat, index) => {
                const isActive = selectedCat === cat;
                const isLast = index === allCats.length - 1;
                
                return (
                  <React.Fragment key={cat}>
                    <TouchableOpacity
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSelectedCat(cat);
                      }}
                      style={[
                        styles.categoryChip,
                        isActive ? styles.categoryChipActive : {},
                      ]}
                      activeOpacity={0.7}
                    >
                      {renderCategoryIcon(cat as keyof typeof PROMPT_CATEGORIES, isActive)}
                      <Text
                        style={[
                          styles.categoryText,
                          isActive ? styles.categoryTextActive : {},
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Divider line between categories */}
                    {!isLast && <View style={styles.categoryDivider} />}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>

          {/* Prompts List */}
          <View style={styles.promptsCard}>
            <View style={styles.promptsHeader}>
              {currentCategory.iconLib === "ionicons" ? (
                <Ionicons name={currentCategory.icon as any} size={20} color={Colors.BLUE} />
              ) : (
                <MaterialCommunityIcons
                  name={currentCategory.icon as any}
                  size={20}
                  color={Colors.BLUE}
                />
              )}
              <Text style={styles.promptsHeaderText}>{selectedCat}</Text>
            </View>

            <View style={styles.promptsList}>
              {promptList.map((prompt, index) => {
                const isSelected = isQuestionSelected(prompt);
                const entry = getByQuestion(prompt);
                const isLast = index === promptList.length - 1;

                return (
                  <View 
  key={prompt}
  onLayout={(event) => {
    const layout = event.nativeEvent.layout;
    // Store Y position relative to promptsList container
    promptPositions.current[prompt] = layout.y;
  }}
>
                    <Pressable
                      onPress={() => addOrToggleQuestion(selectedCat, prompt)}
                      style={({ pressed }) => [
                        styles.promptRow,
                        isSelected && styles.promptRowSelected,
                        pressed && { opacity: 0.96 },
                      ]}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={["#1B44CD", "#3C6FFF"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.promptRowGradient}
                        >
                          <Text style={styles.promptTextSelected} numberOfLines={2}>
                            {prompt}
                          </Text>
                          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        </LinearGradient>
                      ) : (
                        <View style={styles.promptRowContent}>
                          <Text style={styles.promptText} numberOfLines={2}>
                            {prompt}
                          </Text>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="rgba(10,14,26,0.3)"
                          />
                        </View>
                      )}
                    </Pressable>

                    {/* Inline Answer Input */}
                    {isSelected && entry && (
                      <View style={styles.answerContainer}>
                        <TextInput
                          ref={(r) => {
                            answerRefs.current[entry.slot] = r;
                          }}
                          style={styles.answerInput}
                          placeholder="Write your answer..."
                          placeholderTextColor="rgba(10,14,26,0.4)"
                          value={entry.answer}
                          onChangeText={(text) => updateAnswer(entry.slot, text)}
                          multiline
                          numberOfLines={3}
                          maxLength={160}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          onSubmitEditing={() => {
                            Keyboard.dismiss();
                          }}
                          onBlur={() => handleInputBlur(entry.slot, entry.question)}
                        />
                        <Text style={styles.charCount}>{entry.answer.length}/160</Text>
                      </View>
                    )}

                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons
              name="bulb-outline"
              size={20}
              color={Colors.BLUE}
              style={{ marginRight: scale(8) }}
            />
            <Text style={styles.infoNoteText}>
              Choose prompts that showcase your personality and what makes you unique
            </Text>
          </View>

          <View style={{ height: verticalScale(120) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleNext}
        disabled={loading}
        style={[styles.nextButton, loading && { opacity: 0.5 }]}
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

  skipButton: {
    position: "absolute",
    top: verticalScale(16),
    right: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
    padding: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.BLUE,
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
    width: "94%",
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(30),
  },

  pageTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(20),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(20),
    lineHeight: verticalScale(22),
  },

  counterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  counterText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },

  categoriesSection: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(20),
  },
  categoriesScroll: {
    marginHorizontal: -scale(20),
  },
  categoriesContent: {
    paddingHorizontal: scale(20),
    paddingRight: scale(60),
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginLeft: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(50),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  categoryChipActive: {
    backgroundColor: Colors.BLUE,
    borderColor: Colors.BLUE,
  },
  categoryDivider: {
    width: 1,
    height: verticalScale(35),
    marginLeft: scale(15),
    backgroundColor: "rgba(27,68,205,0.2)",
    marginHorizontal: scale(8),
  },
  categoryText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },

  promptsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  promptsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.08)",
  },
  promptsHeaderText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },

  promptsList: {
    padding: scale(16),
  },
  promptRow: {
    borderRadius: scale(12),
    overflow: "hidden",
  },
  promptRowSelected: {
    marginBottom: verticalScale(12),
  },
  promptRowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    gap: scale(10),
  },
  promptRowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderRadius: scale(12),
    gap: scale(10),
  },
  promptText: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    lineHeight: verticalScale(20),
  },
  promptTextSelected: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    lineHeight: verticalScale(20),
  },

  answerContainer: {
    marginBottom: verticalScale(8),
  },
  answerInput: {
    backgroundColor: "#F7FAFF",
    borderRadius: scale(10),
    padding: scale(12),
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    minHeight: verticalScale(80),
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.2)",
  },
  charCount: {
    fontSize: scale(11),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    textAlign: "right",
    marginTop: verticalScale(6),
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(27,68,205,0.08)",
    marginVertical: verticalScale(12),
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.06)",
    marginHorizontal: scale(20),
    marginTop: verticalScale(20),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
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