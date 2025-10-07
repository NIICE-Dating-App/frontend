import { router, useLocalSearchParams } from "expo-router";
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
import { BackButton } from "../../components/BackButton";
import { Fonts } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

export default function PasswordCreateSignup() {
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView style={styles.container}>
      <BackButton style={styles.backButton} />

      {/* Title */}
      <View style={styles.titleWrapper}>
        <Text style={styles.titleText}>Create a password</Text>
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          placeholder=""
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      {/* Verify Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Verify Password</Text>
        <TextInput
          style={styles.input}
          value={verifyPassword}
          onChangeText={setVerifyPassword}
          secureTextEntry={true}
          placeholder=""
          placeholderTextColor="#999"
          editable={!loading}
        />
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={!isValid || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color="#EEF7FF" />
        ) : (
          <Text style={styles.buttonText}>Next</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const BG = "#EEF7FF";
const BOX = "#DDE9F4";
const INK = "#000910";

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
    marginBottom: 36,
  },
  titleText: {
    color: INK,
    fontSize: 32,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    lineHeight: 60,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: BOX,
    borderRadius: 26,
    paddingHorizontal: 18,
    fontSize: 18,
    color: "#1A44CC",
    letterSpacing: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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