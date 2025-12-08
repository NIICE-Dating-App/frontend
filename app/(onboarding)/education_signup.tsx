// app/(onboarding)/education_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function EducationSignup() {
  const [selected, setSelected] = useState<string | null>(null);
  const [institution, setInstitution] = useState("");
  const [otherLabel, setOtherLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const levels = useMemo(
    () => ["High School", "Bachelor's", "Master's", "PhD", "Other"],
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
      router.push("/(onboarding)/value_signup");
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
      router.push("/(onboarding)/value_signup");
    } catch (e) {
      console.error("Skip error:", e);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
        <Pressable style={styles.skipButton} onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "29.40%" }]} />
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
                            ? (["#1B44CD", "#3C6FFF"] as const)
                            : (["#FFFFFF", "#F8FAFF"] as const)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.pill,
                          isActive && styles.pillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isActive && styles.pillTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {lvl}
                        </Text>
                        <Ionicons
                          name={isActive ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={isActive ? "#FFFFFF" : Colors.BLUE}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            {/* "Other" field */}
            {selected === "Other" && (
              <View style={styles.inlineBox}>
                <Text style={styles.inlineLabel}>Specify your education</Text>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="e.g., Associate's, Bootcamp, Diploma…"
                  placeholderTextColor="rgba(10,14,26,0.4)"
                  value={otherLabel}
                  onChangeText={setOtherLabel}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            )}

            {/* Institution */}
            <View style={styles.inlineBox}>
              <Text style={styles.inlineLabel}>Institution (Optional)</Text>
              <TextInput
                style={styles.inlineInput}
                placeholder="Add institution name..."
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={institution}
                onChangeText={setInstitution}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="rgba(10,14,26,0.5)"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                💡 Tip: Add your most recent or most relevant institution
              </Text>
            </View>

            <View style={{ height: verticalScale(40) }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    fontSize: scale(16),
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
    height: "100%",
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },

  headerBlock: {
    marginBottom: verticalScale(10),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    paddingTop: verticalScale(6.5),
  },
  subtitle: {
    marginTop: verticalScale(4),
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    lineHeight: verticalScale(22),
    color: "rgba(10,14,26,0.6)",
  },

  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginTop: verticalScale(16),
  },
  pill: {
    borderRadius: scale(24),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(18),
    minWidth: scale(120),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(8),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillActive: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: Colors.INK,
  },
  pillTextSelected: {
    color: "#FFFFFF",
  },

  inlineBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    marginTop: verticalScale(16),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inlineLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(8),
  },
  inlineInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingVertical: verticalScale(8),
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: Colors.INK,
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
    paddingTop: verticalScale(0.5),
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