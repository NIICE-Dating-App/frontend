import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import { Fonts } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const { height } = Dimensions.get("window");

const MapPin: React.FC<{ size?: number }> = ({ size = 70 }) => (
  <Svg
    width={size}
    height={size * 1.4}
    viewBox="0 0 50 70"
    preserveAspectRatio="xMidYMid meet"
  >
    <Path
      d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z"
      fill="#1E40D8"
    />
    <SvgCircle cx="25" cy="25" r="8" fill="#000000" />
  </Svg>
);

const CircleWithPin: React.FC<{
  x: number;
  y: number;
  circleSize?: number;
  hasPin?: boolean;
}> = ({ x, y, circleSize = 71, hasPin = false }) => (
  <View style={[styles.circleContainer, { left: x, top: y }]}>
    <View
      style={[
        styles.backgroundCircle,
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
        },
      ]}
    />
    {hasPin && (
      <View style={styles.pinWrapper}>
        <MapPin size={70} />
      </View>
    )}
  </View>
);

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("username", username)
        .single();

      if (userError || !userData) {
        Alert.alert("Login Failed", "Username not found");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      } else {
        router.push("/try");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Static Background Circles & Pins */}
      <View style={styles.backgroundPattern}>
        <CircleWithPin x={47} y={-3} hasPin />
        <CircleWithPin x={317} y={22} hasPin />
        <CircleWithPin x={277} y={138} hasPin />
        <CircleWithPin x={206} y={4} />
        <CircleWithPin x={59} y={134} hasPin />
        <CircleWithPin x={150} y={192} />
        <CircleWithPin x={152} y={93} />
        <CircleWithPin x={-12} y={465} hasPin />
        <CircleWithPin x={-25} y={625} />
        <CircleWithPin x={60} y={572} />
        <CircleWithPin x={165} y={645} hasPin />
        <CircleWithPin x={288} y={617} />
        <CircleWithPin x={-25} y={298} />
        <CircleWithPin x={60} y={720} hasPin />
        <CircleWithPin x={-20} y={830} />
        <CircleWithPin x={165} y={794} />
        <CircleWithPin x={261} y={725} hasPin />
        <CircleWithPin x={312} y={803} />
        <CircleWithPin x={357} y={701} />
        <CircleWithPin x={357} y={538} />
        <CircleWithPin x={344} y={319} hasPin />
        <CircleWithPin x={-36} y={170} />
        <CircleWithPin x={357} y={197} />
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Centered Wrapper */}
      <View style={styles.centerWrapper}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>Log In</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  circleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundCircle: {
    backgroundColor: "#C8DBE8",
    opacity: 0.85,
  },
  pinWrapper: {
    position: "absolute",
    top: -43,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 58,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingVertical: 28,
    paddingHorizontal: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: 8,
    textAlign: "left",
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: 6,
  },
  input: {
    height: 52,
    backgroundColor: BOX,
    borderRadius: 26,
    paddingHorizontal: 18,
    fontSize: 18,
    color: "#1A44CC",
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
    marginTop: 12,
    shadowColor: "#00000040",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: BG,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
  },
});
