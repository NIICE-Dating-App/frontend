import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);

  const onCreateProfile = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        console.error("Session error:", error);
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      console.log("Creating profile for user:", session.user.id);

      const { data, error: upsertError } = await supabase.from("profiles").upsert({
        id: session.user.id,
        onboarding_step: 0,
        onboarding_completed: false,
        gender: "man",
        interested_in: ["woman"],
        prompt: "To be filled soon",
      }).select();

      if (upsertError) {
        console.error("Profile upsert error:", upsertError);
        Alert.alert("Error", upsertError.message);
        setLoading(false);
        return;
      }

      console.log("Profile created successfully:", data);
      router.push("/(onboarding)/name_age_signup");
    } catch (err) {
      console.error("Profile creation error:", err);
      Alert.alert("Unexpected error", "Please try again.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </TouchableOpacity>

        <View style={styles.centerContent}>
          <View style={styles.iconBadge}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.BLUE} />
            </View>
          </View>

          <Text style={styles.pageTitle}>You're all set!</Text>
          <Text style={styles.accentTitle}>That's Niice</Text>
          <Text style={styles.pageSubtitle}>
            Let's create your profile and start connecting with people nearby
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={onCreateProfile}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryButtonText}>Creating profile...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#FFFFFF" style={{ marginRight: scale(8) }} />
                <Text style={styles.primaryButtonText}>Create Your Profile</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoNote}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="sparkles" size={16} color={Colors.BLUE} />
            </View>
            <Text style={styles.infoNoteText}>
              This will only take a few minutes to complete
            </Text>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(32),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(60),
  },
  iconBadge: {
    marginBottom: verticalScale(32),
  },
  iconCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: "rgba(27,68,205,0.08)",
    borderWidth: 2,
    borderColor: "rgba(27,68,205,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: moderateScale(32),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    textAlign: "center",
    marginBottom: verticalScale(8),
    letterSpacing: 0.3,
  },
  accentTitle: {
    fontSize: moderateScale(48),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    textAlign: "center",
    marginBottom: verticalScale(16),
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
    lineHeight: verticalScale(22),
    paddingHorizontal: scale(20),
  },
  bottomSection: {
    paddingBottom: verticalScale(40),
    gap: verticalScale(12),
  },
  primaryButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  infoIconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoNoteText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
    paddingTop: verticalScale(0.5),
  },
});