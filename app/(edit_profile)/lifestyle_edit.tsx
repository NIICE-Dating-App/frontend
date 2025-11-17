import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    Colors,
    FloatingHeader,
} from "@/components";

import { supabase } from "@/lib/supabase";

const LIFESTYLE_OPTIONS = {
  drinking: [
    "🚫 Not for me",
    "☕ Sober",
    "🤔 Sober curious",
    "🥂 On special occasions",
    "🍻 Socially on weekends",
    "🍷 Most Nights",
  ],
  smoking: [
    "💨 Social smoker",
    "🚬 Smoker when drinking",
    "🚭 Non-smoker",
    "🚬 Smoker",
    "🚫 Trying to quit",
  ],
  workout: [
    "💪 Everyday",
    "🏋 Often",
    "🏃 Sometimes",
    "💯 Gym rat",
    "🤷 Occasionally",
    "🛋 Never",
  ],
  religion: [
    "🤔 Agnostic",
    "🚫 Atheist",
    "☸️ Buddhist",
    "✝️ Catholic",
    "⛪ Christian",
    "🕉 Hindu",
    "✡️ Jewish",
    "☪️ Muslim",
    "🪔 Sikh",
    "🌌 Spiritual but not religious",
    "✨ Other",
    "🙈 Prefer not to say",
  ],
  politics: [
    "🕊 Very Liberal",
    "🌈 Liberal",
    "⚖️ Moderate / Centrist",
    "🏛 Conservative",
    "🦅 Very Conservative",
    "🌍 Progressive",
    "💚 Green / Environmentalist",
    "📜 Libertarian",
    "✊ Socialist / Leftist",
    "💡 Independent Thinker",
    "🙃 Not political",
    "🤫 Prefer not to say",
  ],
  kids: [
    "🙅‍♂️ No kids, and don't want them",
    "🤱 No kids, but want them someday",
    "🤔 No kids, still deciding",
    "👨‍👧 Have kids",
    "👴 Have grown kids",
    "🙈 Prefer not to say",
  ],
};

const SECTIONS = [
  { 
    key: "drinking", 
    label: "Drinking", 
    question: "How often do you drink?",
    icon: "glass-wine" as const,
    iconType: "MaterialCommunityIcons" as const,
  },
  { 
    key: "smoking", 
    label: "Smoking", 
    question: "How often do you smoke?",
    icon: "smoking" as const,
    iconType: "MaterialCommunityIcons" as const,
  },
  { 
    key: "workout", 
    label: "Fitness", 
    question: "Do you workout?",
    icon: "dumbbell" as const,
    iconType: "MaterialCommunityIcons" as const,
  },
  { 
    key: "religion", 
    label: "Religion", 
    question: "What are your spiritual beliefs?",
    icon: "praying-hands" as const,
    iconType: "FontAwesome5" as const,
  },
  { 
    key: "politics", 
    label: "Politics", 
    question: "What are your political views?",
    icon: "bank" as const,
    iconType: "MaterialCommunityIcons" as const,
  },
  { 
    key: "kids", 
    label: "Kids", 
    question: "Do you have kids?",
    icon: "baby-face-outline" as const,
    iconType: "MaterialCommunityIcons" as const,
  },
];

export default function LifestyleEdit() {
  const [selected, setSelected] = useState<Record<string, string | null>>({
    drinking: null,
    smoking: null,
    workout: null,
    religion: null,
    politics: null,
    kids: null,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const animRefs = useRef<Record<string, Animated.Value>>({});
  const expandAnims = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const ensureExpandAnim = (key: string) => {
    if (!expandAnims.current[key]) expandAnims.current[key] = new Animated.Value(0);
    return expandAnims.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_lifestyle_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setSelected(parsed.selected || {
          drinking: null,
          smoking: null,
          workout: null,
          religion: null,
          politics: null,
          kids: null,
        });
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.full_name || "");

      const { data: lifestyleData, error: lifestyleError } = await supabase
        .from("lifestyle")
        .select("drinking, smoking, workout, religion, politics, kids")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lifestyleError && lifestyleError.code !== "PGRST116") throw lifestyleError;

      if (lifestyleData) {
        setSelected({
          drinking: lifestyleData.drinking || null,
          smoking: lifestyleData.smoking || null,
          workout: lifestyleData.workout || null,
          religion: lifestyleData.religion || null,
          politics: lifestyleData.politics || null,
          kids: lifestyleData.kids || null,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const handleSelect = (category: string, option: string) => {
    pulse(`${category}-${option}`);
    setSelected(prev => ({
      ...prev,
      [category]: prev[category] === option ? null : option,
    }));
  };

  const toggleSection = (sectionKey: string) => {
    const anim = ensureExpandAnim(sectionKey);
    const isExpanding = expandedSection !== sectionKey;

    if (isExpanding) {
      setExpandedSection(sectionKey);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: false,
        friction: 8,
        tension: 100,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setExpandedSection(null);
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      const tempKey = `temp_lifestyle_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        selected,
        fullName
      }));

      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (section: typeof SECTIONS[0]) => {
    if (section.iconType === "FontAwesome5") {
      return <FontAwesome5 name={section.icon} size={20} color={Colors.BLUE} />;
    }
    return <MaterialCommunityIcons name={section.icon} size={20} color={Colors.BLUE} />;
  };

  const getDisplayValue = (value: string | null) => {
  if (!value) return "Not set";
  // Remove ALL emojis and symbols at the start (anything before the first letter/number)
  return value.replace(/^[^\w\s]+\s*/, '').trim();
};

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="Lifestyle" 
          fullName={fullName}
          onSave={handleSave}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            <View pointerEvents="none">
              <Text style={styles.pageTitle}>Your Lifestyle</Text>
              <Text style={styles.pageSubtitle}>Share your habits and preferences</Text>
            </View>

            {SECTIONS.map((section) => {
              const isExpanded = expandedSection === section.key;
              const hasValue = selected[section.key];
              const expandAnim = ensureExpandAnim(section.key);
              
              const maxHeight = expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2000],
              });

              const opacity = expandAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.5, 1],
              });

              return (
                <View key={section.key} style={styles.categoryCard}>
                  <LinearGradient
                    colors={["#FFFFFF", "#F8FAFF"] as const}
                    style={StyleSheet.absoluteFillObject}
                  />
                  
                  <Pressable
                    onPress={() => toggleSection(section.key)}
                    style={styles.categoryHeader}
                  >
                    <View style={styles.categoryHeaderLeft}>
                      <View style={[styles.iconCircle, hasValue && styles.iconCircleActive]}>
                        {renderIcon(section)}
                      </View>
                      <View style={styles.categoryHeaderText}>
                        <Text style={styles.categoryLabel}>{section.label}</Text>
                        <Text style={[styles.categoryValue, hasValue && styles.categoryValueSet]}>
                          {getDisplayValue(selected[section.key])}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="rgba(10,14,26,0.4)"
                    />
                  </Pressable>

                  {expandedSection === section.key && (
                    <Animated.View 
                      style={[
                        styles.optionsSection,
                        { 
                          maxHeight,
                          opacity,
                        }
                      ]}
                    >
                      <View pointerEvents="none">
                        <Text style={styles.optionsQuestion}>{section.question}</Text>
                      </View>
                      
                      <View style={styles.chipsContainer}>
                        {LIFESTYLE_OPTIONS[section.key as keyof typeof LIFESTYLE_OPTIONS].map((option) => {
                          const anim = ensureAnim(`${section.key}-${option}`);
                          const isSelected = selected[section.key] === option;

                          return (
                            <Pressable 
                              key={option} 
                              onPress={() => handleSelect(section.key, option)}
                              delayLongPress={70}
                            >
                              <Animated.View style={{ transform: [{ scale: anim }] }}>
                                <LinearGradient
                                  colors={
                                    isSelected
                                      ? ["#1B44CD", "#3C6FFF"] as const
                                      : ["#FFFFFF", "#F0F3F8"] as const
                                  }
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={[
                                    styles.chipButton,
                                    isSelected && styles.chipButtonSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chipText,
                                      isSelected && styles.chipTextSelected,
                                    ]}
                                  >
                                    {option}
                                  </Text>
                                </LinearGradient>
                              </Animated.View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </Animated.View>
                  )}
                </View>
              );
            })}

            <View style={styles.infoNote} pointerEvents="none">
              <Ionicons 
                name="information-circle-outline" 
                size={18} 
                color="rgba(10,14,26,0.5)" 
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                These details help us find compatible matches for you.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  pageTitle: {
    fontSize: scale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(24),
  },
  categoryCard: {
    marginBottom: verticalScale(12),
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scale(16),
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  iconCircleActive: {
    backgroundColor: "rgba(27,68,205,0.15)",
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(2),
  },
  categoryValue: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },
  categoryValueSet: {
    color: Colors.BLUE,
    fontFamily: Fonts.bold,
  },
  optionsSection: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(27,68,205,0.08)",
    paddingTop: scale(16),
    overflow: "hidden",
  },
  optionsQuestion: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.7)",
    marginBottom: verticalScale(12),
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  chipButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chipButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    textAlign: "center",
  },
  chipTextSelected: {
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
  },
});