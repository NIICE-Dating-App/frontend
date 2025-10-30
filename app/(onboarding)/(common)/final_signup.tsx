// app/(onboarding)/final_signup.tsx
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";

import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";

// THEME
const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1B44CD";

const { height: H } = Dimensions.get("window");

// ─────────────────────────── Pins & Circles (same visual style as login)
const MapPin: React.FC<{ size?: number }> = ({ size = moderateScale(70) }) => (
  <Svg width={size} height={size * 1.4} viewBox="0 0 50 70" preserveAspectRatio="xMidYMid meet">
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
  delay?: number;
}> = ({ x, y, circleSize = moderateScale(71), hasPin = false, delay = 0 }) => {
  const dropAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial drop animation with bounce
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(dropAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 6,
      }),
    ]).start(() => {
      // After drop completes, start subtle pulse
      if (hasPin) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, [delay, hasPin, dropAnim, pulseAnim]);

  const translateY = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const animatedScale = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.circleContainer,
        {
          left: scale(x),
          top: verticalScale(y),
          transform: [{ translateY }, { scale: animatedScale }],
        },
      ]}
    >
      <View
        style={[
          styles.backgroundCircle,
          { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
        ]}
      />
      {hasPin && (
        <Animated.View
          style={[
            styles.pinWrapper,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MapPin size={moderateScale(70)} />
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Smooth typing text component with fade-in effect
const TypingText: React.FC<{
  text: string;
  delay?: number;
  speed?: number;
  style: any;
  onComplete?: () => void;
}> = ({ text, delay = 0, speed = 50, style, onComplete }) => {
  const charOpacities = useRef(text.split("").map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let mounted = true;
    const chars = text.length;

    const animateChars = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));

      for (let i = 0; i < chars; i++) {
        if (!mounted) break;

        Animated.timing(charOpacities[i], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();

        await new Promise((resolve) => setTimeout(resolve, speed));
      }

      if (mounted && onComplete) {
        onComplete();
      }
    };

    animateChars();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {text.split("").map((char, index) => (
        <Animated.Text
          key={index}
          style={[
            style,
            {
              opacity: charOpacities[index],
            },
          ]}
        >
          {char}
        </Animated.Text>
      ))}
    </View>
  );
};

// Background coordinate set
const BG_COORDS = [
  { x: 47, y: -3, pin: true },
  { x: 317, y: 22, pin: true },
  { x: 250, y: 105, pin: false },
  { x: 277, y: 204, pin: true },
  { x: 206, y: 4, pin: false },
  { x: 30, y: 90, pin: true },
  { x: 59, y: 204, pin: true },
  { x: 150, y: 192, pin: false },
  { x: 150, y: 72, pin: true },
  { x: 20, y: 590, pin: true },
  { x: 94, y: 530, pin: false },
  { x: 165, y: 645, pin: true }, //bottom center
  { x: 235, y: 555, pin: true }, //bottom up right
  { x: 288, y: 617, pin: false },
  { x: -25, y: 298, pin: false },
  { x: 60, y: 720, pin: true }, //bottom left 
  { x: 20, y: 800, pin: false },
  { x: -20, y: 830, pin: false },
  { x: 165, y: 794, pin: false },
  { x: 261, y: 725, pin: true },
  { x: 312, y: 803, pin: false },
  { x: 357, y: 701, pin: false },
  { x: 357, y: 538, pin: false },
  { x: 344, y: 319, pin: false },
  { x: -36, y: 170, pin: false },
  { x: 357, y: 197, pin: false },
];

// Safe vertical zone for content
const SAFE_TOP = verticalScale(H * 0.24);
const SAFE_BOT = verticalScale(H * 0.52);

export default function FinalSignup() {
  const [loading, setLoading] = useState(false);
  const press = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Button animation on press
  const animate = useCallback(
    (to: number) => {
      Animated.spring(press, {
        toValue: to,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }).start();
    },
    [press]
  );

  // Gentle looping pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(press, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(press, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [press]);

  // Fade in button after both texts complete
  // Calculate when second text finishes: first text length * speed + delay for second text + second text length * speed
  useEffect(() => {
    const firstTextDuration = "Welcome to Niice".length * 65;
    const secondTextDelay = 300;
    const secondTextDuration = "Your profile is complete".length * 45;
    const totalDuration = firstTextDuration + secondTextDelay + secondTextDuration;

    const timer = setTimeout(() => {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, totalDuration);

    return () => clearTimeout(timer);
  }, []);

  const onMeetPeople = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", session.user.id);

      if (updErr) {
        Alert.alert("Error", updErr.message);
        setLoading(false);
        return;
      }

      router.replace("/(tabs)/profile");
    } catch (e) {
      console.error(e);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Background pattern */}
      <View style={styles.backgroundPattern} pointerEvents="none">
        {BG_COORDS.map(({ x, y, pin }, i) => {
          if (y > SAFE_TOP && y < SAFE_BOT) return null;
          return <CircleWithPin key={i} x={x} y={y} hasPin={pin} delay={i * 80} />;
        })}
      </View>

      {/* Foreground content */}
      <View style={styles.content}>
        <View style={styles.copyBlock}>
          <TypingText
            text="Welcome to Niice"
            delay={0}
            speed={65}
            style={styles.lead}
          />
          <TypingText
            text="Your profile is complete"
            delay={1200}
            speed={45}
            style={styles.subLead}
          />
        </View>

        <Animated.View style={{ transform: [{ scale: press }], opacity: buttonOpacity }}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPressIn={() => animate(0.96)}
            onPressOut={() => animate(1)}
            onPress={onMeetPeople}
            disabled={loading}
          >
            <LinearGradient
              colors={["#1B44CD", "#678CFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.ctaButton, loading && { opacity: 0.6 }]}
            >
              <Animated.View
                style={{
                  opacity: press.interpolate({
                    inputRange: [0.95, 1],
                    outputRange: [0.7, 1],
                  }),
                }}
              >
                <Text style={styles.ctaButtonText}>Meet your Niice people</Text>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: scale(24),
  },

  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: "hidden",
  },
  circleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundCircle: {
    backgroundColor: "#C8DBE8",
    opacity: 0.75,
    shadowColor: "#A7C3E8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  pinWrapper: {
    position: "absolute",
    top: verticalScale(-43),
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: verticalScale(H * 0.08),
  },
  copyBlock: {
    alignItems: "center",
    marginBottom: verticalScale(22),
  },
  lead: {
    color: INK,
    fontSize: moderateScale(39),
    fontFamily: Fonts.bold,
    lineHeight: verticalScale(65),
    textAlign: "center",
  },
  subLead: {
    color: BLUE,
    fontSize: moderateScale(25),
    fontFamily: Fonts.bold,
    lineHeight: verticalScale(38),
    marginTop: verticalScale(6),
    textAlign: "center",
  },

  // New CTA design
  ctaButton: {
    borderRadius: scale(40),
    paddingVertical: verticalScale(17),
    paddingHorizontal: scale(36),
    alignSelf: "center",
    shadowColor: "#1B44CD",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    transform: [{ translateY: verticalScale(-5) }],
  },
  ctaButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});