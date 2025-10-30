import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const MapPin: React.FC<{ size?: number }> = ({ size = moderateScale(70) }) => (
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
}> = ({ x, y, circleSize = moderateScale(71), hasPin = false }) => (
  <View style={[styles.circleContainer, { left: scale(x), top: verticalScale(y) }]}>
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
        <MapPin size={moderateScale(70)} />
      </View>
    )}
  </View>
);

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ On mount: check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user) {
        await handlePostLoginRedirect(session.user.id);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        Alert.alert("Login Failed", error.message);
      } else if (data.session?.user) {
        await handlePostLoginRedirect(data.session.user.id);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle where to send user after login
  const handlePostLoginRedirect = async (userId: string) => {
    try {
      // Example: assuming you have a table `profiles` with a boolean column `onboarding_completed`
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error(error);
      }

      if (!profile || !profile.onboarding_completed) {
        router.replace("/name_age_signup");
      } else {
        router.replace("/final_signup");
      }
    } catch (err) {
      console.error("Redirect check failed:", err);
      router.replace("/name_age_signup");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Background Circles */}
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
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Login Card */}
      <View style={styles.centerWrapper}>
        <View style={styles.loginCard}>
          <Text style={styles.title}>Log In</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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
    top: verticalScale(-43),
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(60),
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(32),
    paddingVertical: verticalScale(28),
    paddingHorizontal: scale(28),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(12) },
    shadowOpacity: 0.25,
    shadowRadius: scale(25),
    elevation: 15,
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(8),
    textAlign: "left",
  },
  inputContainer: { marginBottom: verticalScale(20) },
  inputLabel: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(6),
  },
  input: {
    height: verticalScale(52),
    backgroundColor: BOX,
    borderRadius: scale(26),
    paddingHorizontal: scale(18),
    fontSize: moderateScale(18),
    color: "#1A44CC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(3),
    elevation: 2,
  },
  button: {
    height: verticalScale(56),
    backgroundColor: INK,
    borderRadius: scale(28),
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(12),
    shadowColor: "#00000040",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowRadius: scale(4),
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: BG,
    fontSize: moderateScale(18),
    fontWeight: "bold",
    fontFamily: Fonts.bold,
  },
});
