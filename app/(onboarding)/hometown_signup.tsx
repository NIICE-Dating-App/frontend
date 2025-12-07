// app/(onboarding)/(common)/hometown_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function HometownSignup() {
  const [hometown, setHometown] = useState("");

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Only update if user entered something
      const trimmedHometown = hometown.trim();
      if (trimmedHometown) {
        const { error } = await supabase
          .from("profiles")
          .update({ hometown: trimmedHometown })
          .eq("id", session.user.id);

        if (error) throw error;
      }

      router.push("/(onboarding)/languages_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Skip Button */}
      <Pressable style={styles.skipButton} onPress={handleNext}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={verticalScale(20)}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: scale(24),
            paddingBottom: verticalScale(110),
            paddingTop: verticalScale(35),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Where are you from?</Text>
          <Text style={styles.subtitle}>
            Share your hometown or where you grew up. This is optional.
          </Text>

          {/* Location Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={moderateScale(48)} color={BLUE} />
            </View>
          </View>

          {/* Text Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="home-outline" size={moderateScale(22)} color="#7A838E" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter your hometown..."
              placeholderTextColor="#7A838E"
              value={hometown}
              onChangeText={setHometown}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={100}
            />
            {hometown.length > 0 && (
              <Pressable onPress={() => setHometown("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={moderateScale(20)} color="#7A838E" />
              </Pressable>
            )}
          </View>

          {/* Helper Text */}
          <Text style={styles.helperText}>
            e.g., Istanbul, New York, London, Tokyo
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Next Button */}
      <Pressable onPress={handleNext} style={styles.nextButton}>
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
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

  skipButton: {
    position: "absolute",
    top: verticalScale(58),
    right: scale(24),
    zIndex: 10,
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
    width: "82%", // Incrementing from marital_status
    backgroundColor: BLUE,
    borderRadius: scale(3),
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
    color: BLUE,
    marginBottom: verticalScale(30),
  },

  iconContainer: {
    alignItems: "center",
    marginBottom: verticalScale(30),
  },
  iconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: "#E4ECFF",
    alignItems: "center",
    justifyContent: "center",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: "#D4DAE1",
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(12),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: INK_SOFT,
    paddingVertical: verticalScale(16),
  },
  clearButton: {
    padding: scale(4),
  },

  helperText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: "#7A838E",
    textAlign: "center",
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