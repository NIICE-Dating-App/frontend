import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const trimmedEmail = email.toLowerCase().trim();

      const { data: userExists, error: checkError } = await supabase
        .rpc('check_user_exists', { user_email: trimmedEmail });

      if (checkError) {
        console.error("Error checking user:", checkError);
        throw checkError;
      }

      if (userExists) {
        Alert.alert(
          "Account Already Exists",
          "An account with this email already exists. Would you like to log in instead?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setLoading(false),
            },
            {
              text: "Log In",
              onPress: () => {
                setLoading(false);
                router.push("/login");
              },
            },
          ]
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      console.log("OTP sent successfully:", data);

      router.push({
        pathname: "/email_verif_signup",
        params: { email: trimmedEmail },
      });
    } catch (error: any) {
      console.error("Error in signup process:", error);
      setError(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValid = email.length > 0 && isValidEmail(email);
  const showError = email.length > 0 && !isValidEmail(email) && !isFocused;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.INK} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.pageTitle}>Your Email</Text>
              <Text style={styles.pageSubtitle}>
                We'll send you a verification code
              </Text>
            </View>

            {/* Input Card */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={Colors.BLUE}
                  />
                </View>
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(10,14,26,0.4)"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                  selectionColor={Colors.BLUE}
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setEmail("");
                      setError("");
                    }}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="rgba(10,14,26,0.3)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Validation Error or API Error */}
            {(showError || error) && (
              <View style={styles.errorMessage}>
                <Ionicons name="alert-circle" size={16} color={Colors.BLUE} />
                <Text style={styles.errorText}>
                  {error || "Please enter a valid email address"}
                </Text>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.nextButton, (loading || !isValid) && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={loading || !isValid}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.nextButtonText}>Sending code...</Text>
                </View>
              ) : (
                <Text style={styles.nextButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.push("/in_progress")}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipText, loading && styles.skipTextDisabled]}>
                I'll do this later
              </Text>
              <Ionicons 
                name="arrow-forward" 
                size={16} 
                color={loading ? "rgba(27,68,205,0.3)" : Colors.BLUE}
                style={{ marginLeft: scale(4) }}
              />
            </TouchableOpacity>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <View style={styles.infoIconCircle}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={Colors.BLUE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Secure & Private</Text>
                <Text style={styles.infoNoteText}>
                  Your email is encrypted and never shared with third parties
                </Text>
              </View>
            </View>
          </View>
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
  headerSection: {
    marginBottom: verticalScale(32),
  },
  pageTitle: {
    fontSize: moderateScale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(22),
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(12),
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(27,68,205,0.2)",
    paddingBottom: verticalScale(8),
    gap: scale(10),
  },
  inputWrapperFocused: {
    borderBottomColor: Colors.BLUE,
    borderBottomWidth: 2.5,
  },
  iconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emailInput: {
    flex: 1,
    fontSize: moderateScale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    paddingVertical: 0,
  },
  clearButton: {
    padding: scale(4),
  },
  errorMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(4),
  },
  errorText: {
    fontSize: moderateScale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    flex: 1,
  },
  nextButton: {
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
    marginBottom: verticalScale(16),
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(24),
  },
  skipText: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.primary,
    color: Colors.BLUE,
    letterSpacing: 0.2,
  },
  skipTextDisabled: {
    color: "rgba(27,68,205,0.3)",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  infoIconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    marginBottom: verticalScale(2),
    letterSpacing: 0.2,
  },
  infoNoteText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(16),
  },
});