// app/(auth)/notification_signup.tsx
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import { BackButton } from "../../components/BackButton";
import { Fonts } from "../../constants/theme";

const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1A44CC";
const BTNBLUE = "#2347E8";

const { width: W } = Dimensions.get("window");
const isSmall = W < 380;

/** Bell with ringing + animated waves */
const BellRinging = ({ size = 250 }: { size?: number }) => {
  const ringAnim = useRef(new Animated.Value(0)).current;
  const waveScale = useRef(new Animated.Value(0.8)).current;
  const waveOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Bell swing loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: -1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave pulsing loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(waveScale, {
            toValue: 1.2,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(waveOpacity, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(waveScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(waveOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const ringRotation = ringAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "15deg"],
  });

  return (
    <View
      style={{
        width: size + 100,
        height: size,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      {/* Animated Bell */}
      <Animated.View
        style={{
          transform: [{ rotate: ringRotation }],
          position: "absolute",
          top: -100,
          left: 40,
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path
            d="M32 8c8.8 0 16 7.2 16 16v10.5c0 1.8.6 3.6 1.6 5.1l2.1 3.2c.8 1.2-.1 2.7-1.5 2.7H13.8c-1.4 0-2.3-1.5-1.5-2.7l2.1-3.2c1-1.6 1.6-3.3 1.6-5.1V24c0-8.8 7.2-16 16-16Z"
            fill={BTNBLUE}
          />
          <SvgCircle cx="32" cy="48" r="5" fill={INK} />
        </Svg>
      </Animated.View>

      {/* Shadow */}
      <Svg
        width={size}
        height={12}
        viewBox="0 0 64 12"
        style={{ position: "absolute", top: size * 0.6 }}
      >
        <Path
          d="M8 6c0 3.3 10.7 6 24 6s24-2.7 24-6S45.3 0 32 0 8 2.7 8 6Z"
          fill={BTNBLUE}
          opacity={0.25}
        />
      </Svg>

      {/* Animated Waves */}
      <Animated.View
        style={{
          position: "absolute",
          right: -10,
          top: size * 0.05,
          transform: [{ rotate: "-40deg" }, { scale: waveScale }],
          opacity: waveOpacity,
        }}
      >
        <Svg width={160} height={120} viewBox="0 0 140 90">
          <Path
            d="M8,22 q28,18 56,0"
            stroke={BTNBLUE}
            strokeWidth={4.5}
            fill="none"
          />
          <Path
            d="M10,38 q30,20 60,0"
            stroke={BTNBLUE}
            strokeWidth={5}
            fill="none"
          />
          <Path
            d="M12,54 q32,22 64,0"
            stroke={BTNBLUE}
            strokeWidth={5.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default function NotificationSignup() {
    const [loading, setLoading] = useState(false);
  
    const onAllow = async () => {
      try {
        setLoading(true);
        await Notifications.requestPermissionsAsync();
        // regardless of status, go to done_signup
        router.push("/done_signup");
      } catch {
        Alert.alert("Error", "Could not request notifications.");
        // still continue to done_signup
        router.push("/done_signup");
      } finally {
        setLoading(false);
      }
    };
  
    const onSkip = () => {
      router.push("/done_signup");
    };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <BackButton style={styles.backButton} />

      {/* Header */}
      <View style={styles.copy}>
        <Text style={styles.title}>
          Get the latest likes{"\n"}in your area
        </Text>
        <Text style={styles.subtitle}>
          Turn on your notifications so we can let you know when a Niiice around liked you
        </Text>
      </View>

      {/* CTAs */}
      <View style={styles.ctaArea}>
        <View style={styles.bellWrapper}>
          <BellRinging size={isSmall ? 180 : 220} />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryBtn, loading && { opacity: 0.75 }]}
          onPress={onAllow}
          disabled={loading}
        >
          <Text style={styles.primaryText}>Allow Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={styles.secondaryBtn} onPress={onSkip}>
          <Text style={styles.secondaryText}>Not Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 16,
  },

  copy: {
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    color: INK,
    fontSize: 36,
    lineHeight: 48,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
    marginBottom: 8,
    paddingTop: 4,
  },
  subtitle: {
    color: BLUE,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
  },
  bellWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    marginTop: -20,
  },

  ctaArea: {
    marginTop: "auto",
    paddingBottom: 36,
    gap: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: BTNBLUE,
    alignItems: "center",
    justifyContent: "center",
    width: "92%",
    alignSelf: "center",
    shadowColor: "#00000040",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
  },
  primaryText: {
    color: INK,
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: BTNBLUE,
    alignItems: "center",
    justifyContent: "center",
    width: "92%",
    alignSelf: "center",
    shadowColor: "#00000015",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  secondaryText: {
    color: BTNBLUE,
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
  },
});
