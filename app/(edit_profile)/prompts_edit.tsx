import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    EmptyState,
    FloatingHeader,
    SectionCard,
} from "@/components";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  title: string;
  category: string;
  question: string;
  answer: string;
};

type CatMap = Record<string, string[]>;

const PROMPT_ARRAY_COL = "prompt_answers";
const PROMPT_SINGLE_COL = "prompt";

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
  "🤝 CONNECTION": [
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

export default function PromptEditScreen() {
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>(Object.keys(PROMPT_CATEGORIES)[0]);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [editingSlot, setEditingSlot] = useState<1 | 2 | 3 | null>(null);

  const promptList = PROMPT_CATEGORIES[selectedCat] ?? [];
  const answerRefs = useRef<Record<1 | 2 | 3, TextInput | null>>({ 1: null, 2: null, 3: null });
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const tempKey = `temp_prompts_${userId}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelected(parsed.selected || []);
        setFullName(parsed.fullName || "");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(`${PROMPT_ARRAY_COL}, ${PROMPT_SINGLE_COL}, full_name`)
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setFullName(data?.full_name || "");

      const arr: SavedEntry[] = Array.isArray(data?.[PROMPT_ARRAY_COL])
        ? data![PROMPT_ARRAY_COL]
        : [];

      const pre: SelectedEntry[] = [];
      for (const e of arr) {
        const s = Number(e?.slot);
        if ((s === 1 || s === 2 || s === 3) && e?.question) {
          pre.push({
            slot: s as 1 | 2 | 3,
            title: e.title || slotTitleFor(s as 1 | 2 | 3),
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

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelected(normalized);
    } catch (e) {
      console.error("Load prompts error:", e);
    }
  };

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("No active session");

      const empties = selected.filter(s => !s.answer.trim());
      if (empties.length > 0) {
        Alert.alert("Complete your answers", "Please write an answer for each selected prompt.");
        const emptySlot = empties[0].slot;
        answerRefs.current[emptySlot]?.focus();
        setLoading(false);
        return;
      }

      const tempKey = `temp_prompts_${userId}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        selected,
        fullName
      }));

      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save your changes.");
    } finally {
      setLoading(false);
    }
  }, [selected, fullName]);

  const slotTitleFor = (slot: 1 | 2 | 3) =>
    slot === 1 ? "Something Nice" : slot === 2 ? "Another Nice thing" : "One more Nice thing";

  const isQuestionSelected = (q: string) =>
    selected.some(s => s.question === q);

  const getByQuestion = (q: string) =>
    selected.find(s => s.question === q);

  const nextFreeSlot = (): 1 | 2 | 3 | null => {
    const used = new Set(selected.map(s => s.slot));
    for (const s of [1, 2, 3] as const) if (!used.has(s)) return s;
    return null;
  };

  const addOrToggleQuestion = (category: string, question: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isQuestionSelected(question)) {
      setSelected(prev => prev.filter(s => s.question !== question));
      return;
    }

    if (selected.length >= 3) {
      Alert.alert("Limit reached", "You can choose up to 3 prompts. Remove one to add another.");
      return;
    }

    const slot = nextFreeSlot();
    if (!slot) return;

    setSelected(prev => [...prev, {
      slot,
      title: slotTitleFor(slot),
      category,
      question,
      answer: ""
    }]);
    
    setTimeout(() => {
      setEditingSlot(slot);
      answerRefs.current[slot]?.focus();
    }, 100);
  };

  const updateAnswer = (slot: 1 | 2 | 3, text: string) => {
    setSelected(prev => prev.map(s => (s.slot === slot ? { ...s, answer: text } : s)));
  };

  const removeSlot = (slot: 1 | 2 | 3) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(prev => prev.filter(s => s.slot !== slot));
    if (editingSlot === slot) setEditingSlot(null);
  };

  const sortedSelected = [...selected].sort((a, b) => a.slot - b.slot);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FloatingHeader 
        title="Edit Prompts" 
        fullName={fullName} 
        onSave={handleSave}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={verticalScale(100)}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionCard
            title="Your Prompts"
            icon={<Ionicons name="chatbubbles-outline" size={20} color={Colors.BLUE} />}
          >
            {sortedSelected.length === 0 ? (
              <EmptyState
                text="No prompts selected"
                icon={<Ionicons name="add-circle-outline" size={24} color={Colors.BLUE} />}
                showBorder
              />
            ) : (
              <View style={styles.promptsList}>
                {sortedSelected.map((entry) => (
                  <View key={`prompt-${entry.slot}`} style={styles.promptCard}>
                    <View style={styles.promptHeader}>
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotNumber}>{entry.slot}</Text>
                      </View>
                      <Text style={styles.promptQuestion} numberOfLines={2}>
                        {entry.question}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSlot(entry.slot)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={24} color={Colors.ERROR} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      ref={(r) => { answerRefs.current[entry.slot] = r; }}
                      style={styles.answerInput}
                      placeholder="Write your answer..."
                      placeholderTextColor="rgba(10,14,26,0.4)"
                      value={entry.answer}
                      onChangeText={(text) => updateAnswer(entry.slot, text)}
                      multiline
                      numberOfLines={3}
                      maxLength={160}
                      onFocus={() => setEditingSlot(entry.slot)}
                      onBlur={() => setEditingSlot(null)}
                    />
                    <Text style={styles.charCount}>
                      {entry.answer.length}/160
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          <View style={styles.categoriesSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="apps-outline" size={22} color={Colors.BLUE} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Choose from Categories</Text>
            </View>
            <Text style={styles.sectionHint}>
              You can select up to 3 prompts total
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {Object.keys(PROMPT_CATEGORIES).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCat(cat)}
                  style={[
                    styles.categoryChip,
                    selectedCat === cat ? styles.categoryChipActive : {}
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCat === cat ? styles.categoryTextActive : {}
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <SectionCard
            title={selectedCat}
            icon={<MaterialCommunityIcons name="format-list-text" size={20} color={Colors.BLUE} />}
          >
            <View style={styles.promptsGrid}>
              {promptList.map((prompt, index) => {
                const isSelected = isQuestionSelected(prompt);
                return (
                  <TouchableOpacity
                    key={`${selectedCat}-${index}`}
                    onPress={() => addOrToggleQuestion(selectedCat, prompt)}
                    style={[
                      styles.promptOption,
                      isSelected ? styles.promptOptionSelected : {}
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.promptOptionText,
                      isSelected ? styles.promptOptionTextSelected : {}
                    ]} numberOfLines={2}>
                      {prompt}
                    </Text>
                    <View style={styles.promptOptionIcon}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.BLUE} />
                      ) : (
                        <Ionicons name="add-circle-outline" size={20} color="rgba(10,14,26,0.3)" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          <View style={styles.tipsSection}>
            <View style={styles.tipCard}>
              <Ionicons name="bulb-outline" size={20} color={Colors.BLUE} />
              <Text style={styles.tipText}>
                Choose prompts that showcase your personality and what makes you unique
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(100),
    paddingBottom: verticalScale(30),
  },
  promptsList: {
    gap: verticalScale(12),
  },
  promptCard: {
    backgroundColor: "rgba(27,68,205,0.04)",
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  slotBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
  },
  slotNumber: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  promptQuestion: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    lineHeight: verticalScale(20),
  },
  removeButton: {
    padding: scale(4),
  },
  answerInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(10),
    padding: scale(12),
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    minHeight: verticalScale(80),
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: scale(11),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    textAlign: "right",
    marginTop: verticalScale(6),
  },
  categoriesSection: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  sectionIcon: {
    marginRight: scale(6),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  sectionHint: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.45)",
    marginBottom: verticalScale(12),
  },
  categoriesScroll: {
    marginHorizontal: -scale(20),
  },
  categoriesContent: {
    paddingHorizontal: scale(20),
    gap: scale(10),
  },
  categoryChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  categoryChipActive: {
    backgroundColor: Colors.BLUE,
    borderColor: Colors.BLUE,
  },
  categoryText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  promptsGrid: {
    gap: verticalScale(10),
  },
  promptOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
  },
  promptOptionSelected: {
    backgroundColor: "rgba(27,68,205,0.08)",
    borderColor: Colors.BLUE,
  },
  promptOptionText: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    lineHeight: verticalScale(20),
    marginRight: scale(10),
  },
  promptOptionTextSelected: {
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },
  promptOptionIcon: {
    marginLeft: scale(8),
  },
  tipsSection: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(20),
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.04)",
    gap: scale(10),
  },
  tipText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    lineHeight: verticalScale(18),
  },
});