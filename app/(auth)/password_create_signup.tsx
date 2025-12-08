import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.INK} />
            </TouchableOpacity>

            <View style={styles.headerSection}>
              <Text style={styles.pageTitle}>Create a Password</Text>
              <Text style={styles.pageSubtitle}>
                Choose a strong password for your account
              </Text>
            </View>

            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="rgba(10,14,26,0.4)"
                    style={{ marginRight: scale(8) }}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter password"
                    placeholderTextColor="rgba(10,14,26,0.4)"
                    editable={!loading}
                    returnKeyType="next"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="rgba(10,14,26,0.4)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="rgba(10,14,26,0.4)"
                    style={{ marginRight: scale(8) }}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={verifyPassword}
                    onChangeText={setVerifyPassword}
                    secureTextEntry={!showVerifyPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(10,14,26,0.4)"
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowVerifyPassword(!showVerifyPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showVerifyPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="rgba(10,14,26,0.4)"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.nextButton,
                (!isValid || loading) && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!isValid || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="rgba(10,14,26,0.5)"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Password must be at least 6 characters long
              </Text>
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
    fontSize: scale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(12),
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingBottom: verticalScale(8),
  },
  textInput: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: scale(4),
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
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  nextButtonText: {
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
    paddingTop: verticalScale(4.5),
  },
});