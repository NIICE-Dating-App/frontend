import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { Colors, Fonts } from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function EmailSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Send OTP to email
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      console.log("OTP sent successfully:", data);

      // Navigate to verification page with email as parameter
      router.push({
        pathname: "/email_verif_signup",
        params: { email: email.toLowerCase().trim() },
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton
        style={styles.backButton}
        color="#FFFFFF"
        backgroundColor="#000910"
      />

      <View style={styles.content}>
        <Text style={styles.titleBlue}>Now Continue</Text>
        <Text style={styles.titleBlack}>with your email</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Enter your email"
          placeholderTextColor="#999"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={loading || !email}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Next</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/try")}
          disabled={loading}
        >
          <Text style={styles.skipText}>I will do this later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const BG = "#EEF7FF";
const INK = "#000910";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  backButton: {
    position: "absolute",
    top: 58,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 32,
    marginTop: 96,
  },
  titleBlue: {
    fontFamily: Fonts.bold,
    fontSize: 42,
    color: Colors.light.primary,
    marginBottom: 0,
    lineHeight: 60,
  },
  titleBlack: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: INK,
    marginTop: -6,
    marginBottom: 22,
    lineHeight: 45,
  },
  input: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: INK,
    borderBottomWidth: 3,
    borderBottomColor: Colors.light.primary,
    paddingVertical: 6,
    marginBottom: 22,
  },
  button: {
    height: 56,
    backgroundColor: INK,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
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
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  skipText: {
    fontFamily: Fonts.primary,
    fontSize: 16,
    color: Colors.light.primary,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});