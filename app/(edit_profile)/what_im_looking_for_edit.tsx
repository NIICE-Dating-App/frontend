// frontend/app/(edit_profile)/what_im_looking_for_edit.tsx
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

import { Colors, FloatingHeader } from "@/components";
import { supabase } from "@/lib/supabase";

// 🟢 FRIEND MODE: options must match friend onboarding

// What I'm hoping to find in friends
const LOOKING_FOR_OPTIONS = [
  "New friends nearby",
  "Workout/fitness buddy",
  "Travel companions",
  "Activity/hobby partners",
  "Casual hangouts",
  "Professional networking",
  "Close friendships",
];

// What I value in friendship
const VALUE_OPTIONS = [
  "Loyalty",
  "Trustworthy",
  "Good listener",
  "Sense of humor",
  "Supportive",
  "Non-judgmental",
  "Honest",
  "Reliable",
  "Fun to be around",
  "Authentic",
  "Understanding",
  "Shared interests",
  "Deep conversations",
  "Adventurous",
  "Positive energy",
  "Low-maintenance",
  "Makes time for me",
  "Encouraging",
  "Respectful of boundaries",
  "Growth-minded",
];

// UI → enum for looking_for_friend
const ENUM_MAP: Record<string, string> = {
  "New friends nearby": "new_friends_nearby",
  "Workout/fitness buddy": "workout_fitness_buddy",
  "Travel companions": "travel_companions",
  "Activity/hobby partners": "activity_hobby_partners",
  "Casual hangouts": "casual_hangouts",
  "Professional networking": "professional_networking",
  "Close friendships": "close_friendships",
};

// enum → UI for looking_for_friend
const REVERSE_ENUM_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ENUM_MAP).map(([label, enumValue]) => [enumValue, label])
);

// Helper: normalize a string and match to VALUE_OPTIONS exactly
const normalizeToOption = (value: string): string | null => {
  const normalized = value.toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  const match = VALUE_OPTIONS.find(
    (opt) => opt.toLowerCase().replace(/\s+/g, "").replace(/-/g, "") === normalized
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_looking_for_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setLookingFor(parsed.lookingFor || []);

        // Normalize partner values to match VALUE_OPTIONS exactly
        const normalizedPartnerValues = (parsed.partnerValues || [])
          .map(normalizeToOption)
          .filter(Boolean) as string[];
        setPartnerValues(normalizedPartnerValues);

        console.log(
          "Loaded from temp storage - normalized friend partnerValues:",
          normalizedPartnerValues
        );
        return;
      }

      // Load name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setFullName(profileData?.full_name || "");

      // Load friend mode from user_modes
      const { data: modesData, error: modesError } = await supabase
        .from("user_modes")
        .select("looking_for_friend, value_friend")
        .eq("user_id", user.id)
        .eq("mode", "friend")
        .maybeSingle();

      if (modesError && modesError.code !== "PGRST116") throw modesError;

      if (modesData) {
        console.log("Friend-mode data from Supabase:", modesData);

        // looking_for_friend: enum[] → UI labels
        const lookingForEnums: string[] = Array.isArray(modesData.looking_for_friend)
          ? modesData.looking_for_friend
          : [];
        const lookingForLabels = lookingForEnums
          .map((e) => REVERSE_ENUM_MAP[e])
          .filter(Boolean);
        setLookingFor(lookingForLabels);

        // value_friend: enum[] → UI labels using VALUE_OPTIONS + normalizeToOption
        const valueEnums: string[] = Array.isArray(modesData.value_friend)
          ? modesData.value_friend
          : [];

        console.log("Friend value enums from DB:", valueEnums);

        const valueLabels = valueEnums
          .map((e) => {
            // snake_case → "Title Case" string before matching
            const words = String(e)
              .split("_")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() +
                  word.slice(1).toLowerCase()
              );
            const converted = words.join(" ");
            return normalizeToOption(converted);
          })
          .filter(Boolean) as string[];

        console.log("Normalized friend value labels:", valueLabels);
        console.log("Friend value labels count:", valueLabels.length);

        setPartnerValues(valueLabels);
      } else {
        console.log("No friend-mode user_modes row found");
      }
    } catch (error) {
      console.error("Error loading friend-mode data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const toggleLookingFor = (option: string) => {
    pulse(`looking-${option}`);
    setLookingFor((prev) => {
      if (prev.includes(option)) {
        return prev.filter((x) => x !== option);
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
    setPartnerValues((prev) => {
      if (prev.includes(option)) {
        return prev.filter((x) => x !== option);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      // friend enums for looking_for_friend
      const normalizedLookingFor = lookingFor.map((x) => ENUM_MAP[x]);

      // friend enums for value_friend – standard snake_case
      const normalizedValues = partnerValues.map((s) =>
        s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
      );

      const tempKey = `temp_looking_for_${user.id}`;
      await AsyncStorage.setItem(
        tempKey,
        JSON.stringify({
          lookingFor,
          partnerValues,
          fullName,
          normalizedLookingFor,
          normalizedValues,
        })
      );

      router.back();
    } catch (err) {
      console.error("Friend-mode update error:", err);
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
            scrollEnabled
            nestedScrollEnabled
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
                            ? (["#1B44CD", "#3C6FFF"] as const)
                            : (["#FFFFFF", "#F8FAFF"] as const)
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
                          name={
                            isSelected ? "checkmark-circle" : "ellipse-outline"
                          }
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
              <Text style={styles.sectionTitle}>
                What do you value in a friend?
              </Text>
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
                            ? (["#1B44CD", "#3C6FFF"] as const)
                            : (["#FFFFFF", "#F8FAFF"] as const)
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
                These details help us show your friendship vibe more clearly.
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