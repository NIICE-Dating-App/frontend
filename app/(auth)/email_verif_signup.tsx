import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { Fonts } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function EmailVerifSignup() {
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert("Error", "Email not found. Please start over.");
      router.back();
    }
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      Alert.alert("Success", "Verification code sent!");
      setCooldown(30);
    } catch (error: any) {
      console.error("Error resending OTP:", error);
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  const handleNext = async () => {
    if (code.length !== 6) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: "email",
      });

      if (error) throw error;

      console.log("OTP verified successfully:", data);

      router.push({
        pathname: "/password_create_signup",
        params: { email: email },
      });
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      Alert.alert(
        "Verification Failed",
        error.message || "Invalid code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isValid = code.trim().length === 6;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <BackButton style={styles.backButton} />

        <View style={styles.titleWrapper}>
          <Text style={styles.titleText}>Verify your email</Text>
          <Text style={styles.subtitleText}>
            We've sent a 6-digit code to {email}
          </Text>
        </View>

        <View style={styles.codeArea}>
          <View style={styles.codeBox}>
            <TextInput
              value={code}
              onChangeText={(t) =>
                setCode(t.replace(/[^0-9]/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.codeInput}
              placeholder="000000"
              textAlign="center"
              editable={!loading}
            />
            <View style={styles.codeUnderline} />
          </View>

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0}
            style={styles.resendBtn}
          >
            <Text
              style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}
            >
              {cooldown > 0 ? `Resend (${cooldown})` : "Resend"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isValid || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#EEF7FF" />
          ) : (
            <Text style={styles.buttonText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BLUE = "#1A44CC";
const INK = "#000910";
const BG = "#EEF7FF";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  titleWrapper: {
    marginTop: 12,
    marginBottom: 28,
  },
  titleText: {
    color: INK,
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    lineHeight: 65,
  },
  subtitleText: {
    color: "#555",
    fontSize: 16,
    fontFamily: Fonts.primary,
    marginTop: 4,
  },
  codeArea: {
    marginBottom: 36,
    minHeight: 110,
    justifyContent: "flex-start",
  },
  codeBox: {
    alignSelf: "center",
    width: "62%",
    alignItems: "center",
  },
  codeInput: {
    width: "100%",
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    color: INK,
    paddingVertical: 6,
  },
  codeUnderline: {
    marginTop: 4,
    height: 5,
    width: "100%",
    backgroundColor: BLUE,
    borderRadius: 3,
  },
  resendBtn: {
    position: "absolute",
    right: 0,
    top: 10,
    padding: 6,
  },
  resendText: {
    color: BLUE,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.bold,
    textDecorationLine: "underline",
  },
  resendDisabled: {
    opacity: 0.45,
    textDecorationLine: "none",
  },
  button: {
    height: 56,
    backgroundColor: INK,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#00000040",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: BG,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
  },
});