import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

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
      Animated.timing(anim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setSelectedOrientation(option);
  };

  // Skip handler - just advances without saving orientation
  const handleSkip = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Update onboarding step without setting orientation
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          onboarding_step: 4,
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      router.push("/distancepref_signup");
    } catch (err) {
      console.error("Skip error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!selectedOrientation) {
      Alert.alert("Missing info", "Please select your sexual orientation or skip this step.");
      return;
    }

    if (selectedOrientation === "Not listed" && customOrientation.trim().length === 0) {
      Alert.alert("Please specify", "You can describe your orientation or skip this step.");
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
          onboarding_step: 4,
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
            <Text style={styles.subtitle}>
              This is optional — you can skip if you prefer not to share.
            </Text>

            {orientations.map((option) => {
              const anim = animRefs.current[option] || new Animated.Value(1);
              const isSelected = selectedOrientation === option;
              return (
                <Pressable key={option} onPress={() => pressAnim(option)}>
                  <Animated.View style={{ transform: [{ scale: anim }] }}>
                    <LinearGradient
                      colors={
                        isSelected
                          ? (["#1B44CD", "#3C6FFF"] as const)
                          : (["#FFFFFF", "#F8FAFF"] as const)
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
                        size={22}
                        color={isSelected ? "#FFFFFF" : Colors.BLUE}
                      />
                    </LinearGradient>
                  </Animated.View>

                  {selectedOrientation === "Not listed" && option === "Not listed" && (
                    <TextInput
                      style={styles.customInput}
                      placeholder="Please share how you identify"
                      placeholderTextColor="rgba(10,14,26,0.4)"
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
                It's up to you to show this information on your profile.
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Show on profile</Text>
                <Switch
                  value={showOnProfile}
                  onValueChange={setShowOnProfile}
                  trackColor={{ false: "#C8CDD2", true: Colors.BLUE }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C8CDD2"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, !selectedOrientation && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={loading || !selectedOrientation}
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
    height: verticalScale(8),
    width: "23.52%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    marginBottom: verticalScale(8),
    paddingTop: verticalScale(6.5),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(20),
    lineHeight: verticalScale(22),
  },
  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(18),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: Colors.INK,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  customInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileNoteWrapper: {
    marginTop: verticalScale(24),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  noteText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
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