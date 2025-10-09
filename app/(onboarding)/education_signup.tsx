// app/(onboarding)/education_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EducationSignup() {
  const [selected, setSelected] = useState<string | null>(null);
  const [institution, setInstitution] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const levels = useMemo(
    () => ["High School", "Bachelor’s", "Master’s", "PhD", "Other"],
    []
  );

  const animRefs = useRef<Record<string, Animated.Value>>({});

  const onPick = (level: string) => {
    if (!animRefs.current[level]) animRefs.current[level] = new Animated.Value(1);
    const a = animRefs.current[level];
    Animated.sequence([
      Animated.timing(a, { toValue: 1.06, duration: 110, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();

    setSelected(level);
    if (level !== "Other") setOtherLabel("");
  };

  const normalizedSelection = () => {
    if (!selected) return null;
    if (selected === "Other") {
      const clean = otherLabel.trim();
      return clean.length ? clean : null;
    }
    return selected;
  };

  const updateProfile = async (education?: string | null, institution?: string | null) => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      throw new Error("Session not found");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        education: education || null,
        institution: institution || null,
        onboarding_step: 9,
      })
      .eq("id", session.user.id);

    if (updateError) throw updateError;
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      await updateProfile(normalizedSelection(), institution.trim() || null);
      router.push("/(onboarding)/purpose_signup");
    } catch (e) {
      console.error("Education update error:", e);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      await updateProfile(null, null); // nothing filled → just move on
      router.push("/(onboarding)/purpose_signup");
    } catch (e) {
      console.error("Skip error:", e);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "56.25%" }]} />
          </View>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerBlock}>
              <Text style={styles.title}>What is your education?</Text>
              <Text style={styles.subtitle}>
                Choose the level that best represents you.
              </Text>
            </View>

            {/* Pills */}
            <View style={styles.pillGrid}>
              {levels.map((lvl) => {
                const isActive =
                  lvl === selected ||
                  (lvl === "Other" && selected === "Other" && !!otherLabel.trim());
                const a = animRefs.current[lvl] || new Animated.Value(1);

                return (
                  <Pressable key={lvl} onPress={() => onPick(lvl)}>
                    <Animated.View style={{ transform: [{ scale: a }] }}>
                      <LinearGradient
                        colors={
                          isActive
                            ? ["#1B44CD", "#3C6FFF", "#7AA9FF"]
                            : ["#F8FAFF", "#EBF1FF"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.pill,
                          isActive && styles.pillActive,
                          lvl === "Other" && { paddingHorizontal: scale(22) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isActive && { color: "#FFFFFF" },
                          ]}
                          numberOfLines={1}
                        >
                          {lvl}
                        </Text>
                        <Ionicons
                          name={isActive ? "checkmark-circle" : "ellipse-outline"}
                          size={moderateScale(20)}
                          color={isActive ? "#FFFFFF" : "#1B2B44"}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            {/* “Other” field */}
            {selected === "Other" && (
              <View style={styles.inlineBox}>
                <Text style={styles.inlineLabel}>Specify your education</Text>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="e.g., Associate’s, Bootcamp, Diploma…"
                  placeholderTextColor="#6C757D"
                  value={otherLabel}
                  onChangeText={setOtherLabel}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            )}

            {/* Institution */}
            <View style={styles.inlineBox}>
              <Text style={styles.inlineLabel}>Institution</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Add institution (optional)"
                placeholderTextColor="#6C757D"
                value={institution}
                onChangeText={setInstitution}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.helper}>
                Tip: If you studied at multiple places, add your most recent or most relevant one.
              </Text>
            </View>

            <View style={{ height: verticalScale(120) }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

/* 🎨 Styles */
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

  progressWrapper: {
    marginTop: verticalScale(88),
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(20),
  },

  headerBlock: { marginBottom: verticalScale(10) },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(48),
    color: INK,
  },
  subtitle: {
    marginTop: verticalScale(4),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    lineHeight: verticalScale(24),
    color: "#4A5568",
  },

  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginTop: verticalScale(16),
  },
  pill: {
    borderRadius: scale(28),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(18),
    minWidth: scale(120),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: scale(10),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pillActive: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    transform: [{ scale: 1.02 }],
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: "#1B2B44",
  },

  inlineBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    marginTop: verticalScale(18),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  inlineLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: "#6C757D",
    marginBottom: verticalScale(6),
  },
  inlineInput: {
    borderBottomWidth: scale(3),
    borderBottomColor: BLUE,
    paddingVertical: verticalScale(8),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK,
  },
  helper: {
    marginTop: verticalScale(8),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12.5),
    color: "#6C757D",
    lineHeight: verticalScale(20),
  },

  bottomButtons: {
    position: "absolute",
    bottom: verticalScale(40),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(24),
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
  },
  skipText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#4A5568",
  },
  nextButton: {
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
