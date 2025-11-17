import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
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

const LOOKING_FOR_OPTIONS = [
  "Marriage",
  "Life partner",
  "Long-term relationship",
  "Short-term relationship",
  "Fun, casual dates",
  "Intimacy",
  "Figuring it out",
];

const VALUE_OPTIONS = [
  "Honesty",
  "Kindness",
  "Sense of humor",
  "Good communication",
  "Ambition",
  "Loyalty",
  "Emotional intelligence",
  "Adventurous spirit",
  "Intelligence",
  "Affectionate",
  "Family-oriented",
  "Open-mindedness",
  "Active lifestyle",
  "Supportive",
  "Authenticity",
  "Similar values",
  "Confidence",
  "Romantic",
  "Financial stability",
  "Shared interests",
];

const ENUM_MAP: Record<string, string> = {
  "Marriage": "marriage",
  "Life partner": "life_partner",
  "Long-term relationship": "long_term_relationship",
  "Short-term relationship": "short_term_relationship",
  "Fun, casual dates": "casual_dates",
  "Intimacy": "intimacy",
  "New friends": "new_friends",
  "Figuring it out": "figuring_it_out",
};

const REVERSE_ENUM_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ENUM_MAP).map(([k, v]) => [v, k])
);

// Helper function to normalize value strings to match OPTIONS exactly
const normalizeToOption = (value: string): string | null => {
  const normalized = value.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
  const match = VALUE_OPTIONS.find(opt => 
    opt.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') === normalized
  );
  return match || null;
};

export default function WhatImLookingForEdit() {
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [partnerValues, setPartnerValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const animRefs = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
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

      const tempKey = `temp_looking_for_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setLookingFor(parsed.lookingFor || []);
        
        // Normalize partner values to match OPTIONS exactly
        const normalizedPartnerValues = (parsed.partnerValues || [])
          .map(normalizeToOption)
          .filter(Boolean) as string[];
        setPartnerValues(normalizedPartnerValues);
        
        console.log("Loaded from temp storage - normalized partnerValues:", normalizedPartnerValues);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.full_name || "");

      const { data: modesData, error: modesError } = await supabase
        .from("user_modes")
        .select("looking_for_date, value_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (modesError && modesError.code !== "PGRST116") throw modesError;

      if (modesData) {
        console.log("Raw data from Supabase:", modesData);
        
        // Load looking_for_date
        const lookingForEnums: string[] = Array.isArray(modesData.looking_for_date) 
          ? modesData.looking_for_date 
          : [];
        const lookingForLabels = lookingForEnums
          .map(e => REVERSE_ENUM_MAP[e])
          .filter(Boolean);
        
        setLookingFor(lookingForLabels);

        // Load value_date - ALL values (up to 5)
        const valueEnums: string[] = Array.isArray(modesData.value_date)
          ? modesData.value_date
          : [];
        
        console.log("Value enums from DB:", valueEnums);
        
        // Convert database format to exact OPTIONS format
        const valueLabels = valueEnums
          .map(e => {
            // Convert snake_case to Title Case
            const words = e.split('_');
            const converted = words.map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
            return normalizeToOption(converted);
          })
          .filter(Boolean) as string[];
        
        console.log("Normalized value labels:", valueLabels);
        console.log("Value labels count:", valueLabels.length);
        
        setPartnerValues(valueLabels);
      } else {
        console.log("No modesData found in database");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const toggleLookingFor = (option: string) => {
    pulse(`looking-${option}`);
    setLookingFor(prev => {
      if (prev.includes(option)) {
        return prev.filter(x => x !== option);
      } else {
        if (prev.length >= 2) {
          Alert.alert("Limit reached", "You can choose up to 2 options.");
          return prev;
        }
        return [...prev, option];
      }
    });
  };

  const togglePartnerValue = (option: string) => {
    pulse(`value-${option}`);
    setPartnerValues(prev => {
      if (prev.includes(option)) {
        return prev.filter(x => x !== option);
      } else {
        if (prev.length >= 5) {
          Alert.alert("Limit reached", "You can select up to 5 values.");
          return prev;
        }
        return [...prev, option];
      }
    });
  };

  const handleSave = async () => {
    if (lookingFor.length === 0 && partnerValues.length === 0) {
      Alert.alert("Missing Info", "Please select at least one option.");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      const normalizedLookingFor = lookingFor.map(x => ENUM_MAP[x]);
      const normalizedValues = partnerValues.map(s =>
        s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
      );

      const tempKey = `temp_looking_for_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        lookingFor,
        partnerValues,
        fullName,
        normalizedLookingFor,
        normalizedValues
      }));

      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="What I'm Looking For" 
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
  <Text style={styles.sectionTitle}>What are you hoping to find?</Text>
  <Text style={styles.sectionSubtitle}>Choose up to 2 options</Text>
</View>

            <View style={styles.optionsContainer}>
  {LOOKING_FOR_OPTIONS.map((option) => {
    const anim = ensureAnim(`looking-${option}`);
    const isSelected = lookingFor.includes(option);

    return (
      <Pressable 
        key={option} 
        onPress={() => toggleLookingFor(option)}
        delayLongPress={70}
      >
        <Animated.View style={{ transform: [{ scale: anim }] }}>
                      <LinearGradient
                        colors={
                          isSelected
                            ? ["#1B44CD", "#3C6FFF"] as const
                            : ["#FFFFFF", "#F8FAFF"] as const
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={isSelected ? "#FFFFFF" : Colors.BLUE}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} pointerEvents="none" />

            <View pointerEvents="none">
  <Text style={styles.sectionTitle}>What do you value in a partner?</Text>
  <Text style={styles.sectionSubtitle}>Choose up to 5 values</Text>
</View>

            <View style={styles.chipsContainer}>
  {VALUE_OPTIONS.map((option) => {
    const anim = ensureAnim(`value-${option}`);
    const isSelected = partnerValues.includes(option);

    return (
      <Pressable 
        key={option} 
        onPress={() => togglePartnerValue(option)}
        delayLongPress={70}
      >
        <Animated.View style={{ transform: [{ scale: anim }] }}>
                      <LinearGradient
                        colors={
                          isSelected
                            ? ["#1B44CD", "#3C6FFF"] as const
                            : ["#FFFFFF", "#F8FAFF"] as const
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

            <View style={styles.infoNote} pointerEvents="none">
  <Ionicons 
    name="information-circle-outline" 
    size={18} 
    color="rgba(10,14,26,0.5)" 
    style={{ marginRight: scale(8) }}
  />
  <Text style={styles.infoNoteText}>
    This information helps us find compatible matches for you.
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
  sectionTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(6),
  },
  sectionSubtitle: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(16),
  },
  optionsContainer: {
    gap: verticalScale(12),
    marginBottom: verticalScale(32),
  },
  optionButton: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(27,68,205,0.12)",
    marginVertical: verticalScale(24),
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginBottom: verticalScale(24),
  },
  chipButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(30),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  chipButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipText: {
    fontSize: scale(15),
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
    marginTop: verticalScale(8),
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