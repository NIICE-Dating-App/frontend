import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function PasswordCreateSignup() {
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [verifyPasswordFocused, setVerifyPasswordFocused] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (pwd.length === 0) return { strength: 0, label: "", color: "" };
    if (pwd.length < 6) return { strength: 1, label: "Too Short", color: "rgba(27,68,205,0.4)" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;
    
    if (strength === 0 || pwd.length < 8) return { strength: 2, label: "Weak", color: "rgba(27,68,205,0.5)" };
    if (strength === 1 || strength === 2) return { strength: 3, label: "Good", color: Colors.BLUE };
    return { strength: 4, label: "Strong", color: Colors.BLUE };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleNext = async () => {
    if (!password || !verifyPassword) return;

    if (password !== verifyPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters long"
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      console.log("Password set successfully:", data);

      Alert.alert(
        "Success! 🎉",
        "Your account has been created successfully!",
        [
          {
            text: "Continue",
            onPress: () => {
              router.push("/location_req_signup");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error setting password:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to set password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isValid = password.length >= 6 && password === verifyPassword;
  const showMismatch = verifyPassword.length > 0 && password !== verifyPassword && !verifyPasswordFocused;

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
              <Text style={styles.pageTitle}>Create a Password</Text>
              <Text style={styles.pageSubtitle}>
                Choose a strong password for your account
              </Text>
            </View>

            {/* Input Card */}
            <View style={styles.inputCard}>
              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused
                ]}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={Colors.BLUE}
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    placeholderTextColor="rgba(10,14,26,0.4)"
                    editable={!loading}
                    returnKeyType="next"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor={Colors.BLUE}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.BLUE}
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            level <= passwordStrength.strength && {
                              backgroundColor: passwordStrength.color,
                            }
                          ]}
                        />
                      ))}
                    </View>
                    {passwordStrength.label && (
                      <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                        {passwordStrength.label}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputWrapper,
                  verifyPasswordFocused && styles.inputWrapperFocused,
                  showMismatch && styles.inputWrapperError
                ]}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={showMismatch ? "rgba(27,68,205,0.5)" : Colors.BLUE}
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={verifyPassword}
                    onChangeText={setVerifyPassword}
                    onFocus={() => setVerifyPasswordFocused(true)}
                    onBlur={() => setVerifyPasswordFocused(false)}
                    secureTextEntry={!showVerifyPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(10,14,26,0.4)"
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectionColor={Colors.BLUE}
                  />
                  <TouchableOpacity
                    onPress={() => setShowVerifyPassword(!showVerifyPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showVerifyPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.BLUE}
                    />
                  </TouchableOpacity>
                </View>

                {/* Mismatch Error */}
                {showMismatch && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="rgba(27,68,205,0.6)" />
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  </View>
                )}

                {/* Match Indicator */}
                {verifyPassword.length > 0 && password === verifyPassword && (
                  <View style={styles.successContainer}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.BLUE} />
                    <Text style={styles.successText}>Passwords match</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.nextButton,
                (!isValid || loading) && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!isValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.nextButtonText}>Creating account...</Text>
                </View>
              ) : (
                <Text style={styles.nextButtonText}>Continue</Text>
              )}
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
                <Text style={styles.infoTitle}>Password Requirements</Text>
                <Text style={styles.infoNoteText}>
                  • At least 6 characters{"\n"}
                  • Mix of letters and numbers recommended
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
    marginBottom: verticalScale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: verticalScale(20),
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
  inputWrapperError: {
    borderBottomColor: "rgba(27,68,205,0.4)",
  },
  iconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: moderateScale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: scale(4),
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
    gap: scale(8),
  },
  strengthBars: {
    flexDirection: "row",
    flex: 1,
    gap: scale(4),
  },
  strengthBar: {
    flex: 1,
    height: verticalScale(4),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(2),
  },
  strengthLabel: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(8),
  },
  errorText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(8),
  },
  successText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
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
    marginBottom: verticalScale(24),
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
    marginBottom: verticalScale(4),
    letterSpacing: 0.2,
  },
  infoNoteText: {
    fontSize: moderateScale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(16),
  },
});