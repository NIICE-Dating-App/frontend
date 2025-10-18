import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrientationSignup() {
  const [selectedOrientation, setSelectedOrientation] = useState<string | null>(null);
  const [customOrientation, setCustomOrientation] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [loading, setLoading] = useState(false);

  const animRefs = useRef<Record<string, Animated.Value>>({});

  const orientations = [
    "Straight",
    "Gay",
    "Lesbian",
    "Bisexual",
    "Pansexual",
    "Omnisexual",
    "Asexual",
    "Demisexual",
    "Aromantic",
    "Queer",
    "Questioning",
    "Not listed",
  ];

  const pressAnim = (option: string) => {
    if (!animRefs.current[option]) animRefs.current[option] = new Animated.Value(1);
    const anim = animRefs.current[option];
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.08, duration: 130, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setSelectedOrientation(option);
  };

  const handleNext = async () => {
    if (!selectedOrientation) {
      Alert.alert("Missing info", "Please select your sexual orientation.");
      return;
    }

    if (selectedOrientation === "Not listed" && customOrientation.trim().length === 0) {
      Alert.alert("Please specify", "You can describe your orientation or skip this later.");
      return;
    }

    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const normalizedOrientation = selectedOrientation.toLowerCase().replace(/\s+/g, "_");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          sexual_orientation: normalizedOrientation,
          orientation_custom: customOrientation || null,
          show_orientation_on_profile: showOnProfile,
          onboarding_step: 3,
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      router.push("/distancepref_signup");
    } catch (err) {
      console.error("Orientation update error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Keyboard Aware View */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>What is your sexual orientation?</Text>

            {orientations.map((option) => {
              const anim = animRefs.current[option] || new Animated.Value(1);
              const isSelected = selectedOrientation === option;
              return (
                <Pressable key={option} onPress={() => pressAnim(option)}>
                  <Animated.View
                    style={[{ transform: [{ scale: anim }] }, styles.shadowWrapper]}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? ["#1B44CD", "#3C6FFF", "#7AA9FF"]
                          : ["#F8FAFF", "#EBF1FF"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    >
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      >
                        {option}
                      </Text>
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={moderateScale(22)}
                        color={isSelected ? "#FFFFFF" : "#1B2B44"}
                      />
                    </LinearGradient>
                  </Animated.View>

                  {selectedOrientation === "Not listed" && option === "Not listed" && (
                    <TextInput
                      style={styles.customInput}
                      placeholder="Please share how you identify"
                      placeholderTextColor="#6C757D"
                      value={customOrientation}
                      onChangeText={setCustomOrientation}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  )}
                </Pressable>
              );
            })}

            <View style={styles.profileNoteWrapper}>
              <Text style={styles.noteText}>
                It’s up to you to show this information on your profile.
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Show on profile</Text>
                <Switch
                  value={showOnProfile}
                  onValueChange={setShowOnProfile}
                  trackColor={{ false: "#C8CDD2", true: BLUE }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C8CDD2"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
        >
          <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

/* Theme Constants */
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
  },
  progressFill: {
    height: verticalScale(6),
    width: "17.64%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },
  scrollContainer: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(120),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(26),
    lineHeight: verticalScale(40),
    color: INK,
    marginBottom: verticalScale(24),
  },
  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: verticalScale(12),
  },
  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionButtonSelected: {
    shadowOpacity: 0.35,
    shadowRadius: 10,
    transform: [{ scale: 1.02 }],
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: "#1B2B44",
  },
  optionTextSelected: { color: "#FFFFFF" },
  customInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: INK,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(14),
  },
  profileNoteWrapper: { marginTop: verticalScale(16) },
  noteText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#6C757D",
    lineHeight: verticalScale(26),
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginTop: verticalScale(4),
  },
  switchLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#6C757D",
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
