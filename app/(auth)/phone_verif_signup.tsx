import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
// import { router } from "expo-router"; // use if you want navigation

export default function VerifSignup() {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);

  // cooldown timer for Resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = () => {
    if (cooldown > 0) return;
    // TODO: trigger resend logic here
    setCooldown(30);
  };

  const handleNext = () => {
    // TODO: verify code logic here
    // router.push("/next-screen");
  };

  const isValid = code.trim().length === 6;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Back */}
        <BackButton style={styles.backButton} />

        {/* Title */}
        <View style={styles.titleWrapper}>
          <Text style={styles.titleText}>Enter your code</Text>
        </View>

        {/* Code input + Resend */}
        <View style={styles.codeArea}>
          {/* keep code centered regardless of resend */}
          <View style={styles.codeBox}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.codeInput}
              placeholder=""
              textAlign="center"
            />
            <View style={styles.codeUnderline} />
          </View>

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0}
            style={styles.resendBtn}
          >
            <Text
              style={[
                styles.resendText,
                cooldown > 0 && styles.resendDisabled,
              ]}
            >
              {cooldown > 0 ? `Resend (${cooldown})` : "Resend"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Next */}
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={() => router.push("/email_signup")}
          disabled={!isValid}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Next</Text>
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

  // Title
  titleWrapper: {
    marginTop: 12,
    marginBottom: 36,
  },
  titleText: {
    color: INK,
    fontSize: 32,             // matches the vibe in your mock
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    lineHeight: 60,
  },

  // Code input area
  codeArea: {
    marginBottom: 36,
    minHeight: 110,
    justifyContent: "flex-start",
  },
  codeBox: {
    alignSelf: "center",
    width: "62%",              // keep a nice width on all devices
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

  // Resend link pinned to the right
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

  // Next button — same sizing as your login button
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
