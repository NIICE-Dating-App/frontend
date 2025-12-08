// app/(auth)/done_signup.tsx
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

const { width: W, height: H } = Dimensions.get("window");

export default function DoneSignup() {
  const onCreateProfile = async () => {
    try {
      // get current Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        console.error("Session error:", error);
        Alert.alert("Error", "Session not found. Please log in again.");
        return;
      }

      console.log("Creating profile for user:", session.user.id);

      // Create an empty profile row for onboarding with defaults
      const { data, error: upsertError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        onboarding_step: 0,
        onboarding_completed: false,

        // Set defaults for non-nullable fields only
        gender: "man",
        interested_in: ["woman"],
        prompt: "To be filled soon",
      }).select();

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
        Alert.alert("Error", upsertError.message);
        return;
      }

      console.log("Profile created successfully:", data);

      // move to the first onboarding screen
      router.push("/(onboarding)/name_age_signup");
    } catch (err) {
      console.error("Profile creation error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    }
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

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>You are set!</Text>
        <Text style={styles.accentTitle}>That's Niice</Text>
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.primaryButton}
          onPress={onCreateProfile}
        >
          <Text style={styles.primaryButtonText}>Create Your Profile</Text>
        </TouchableOpacity>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            Let's create your profile and start meeting Niice people
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  backButton: {
    marginTop: verticalScale(16),
    marginLeft: scale(20),
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
  headerContainer: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(H * 0.12),
  },
  pageTitle: {
    fontSize: scale(32),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    lineHeight: verticalScale(42),
    marginBottom: verticalScale(8),
    paddingTop: verticalScale(4),
  },
  accentTitle: {
    fontSize: scale(48),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    lineHeight: verticalScale(58),
    paddingTop: verticalScale(16),
  },
  buttonContainer: {
    marginTop: "auto",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
    gap: verticalScale(16),
  },
  primaryButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    paddingTop: verticalScale(1.3),
  },
});