// app/(onboarding)/distancepref_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Unit = "km" | "m";

export default function DistancePreferenceSignup() {
  const [distance, setDistance] = useState(2.0); // km internally
  const [unit, setUnit] = useState<Unit>("km");
  const [loading, setLoading] = useState(false);

  // 🔵 Animated waves for 3 pins
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const wave5 = useRef(new Animated.Value(0)).current;
  const wave6 = useRef(new Animated.Value(0)).current;
  const wave7 = useRef(new Animated.Value(0)).current;
  const wave8 = useRef(new Animated.Value(0)).current;
  const wave9 = useRef(new Animated.Value(0)).current;

  // ✨ Slider card animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const createWaveAnimation = (wave: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(wave, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(wave, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    
    // Top pin waves
    createWaveAnimation(wave1, 0).start();
    createWaveAnimation(wave2, 800).start();
    createWaveAnimation(wave3, 1600).start();
    
    // Bottom left pin waves
    createWaveAnimation(wave4, 400).start();
    createWaveAnimation(wave5, 1200).start();
    createWaveAnimation(wave6, 2000).start();
    
    // Bottom right pin waves
    createWaveAnimation(wave7, 600).start();
    createWaveAnimation(wave8, 1400).start();
    createWaveAnimation(wave9, 2200).start();

    // Slider card entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatDistance = (valueKm: number, u: Unit) => {
    if (u === "m") return `${Math.round(valueKm * 1000)} m`;
    // show floats when needed
    if (valueKm % 1 === 0) return `${valueKm.toFixed(0)} km`;
    return `${valueKm.toFixed(1)} km`;
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const distance_meters = Math.round(distance * 1000);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          distance_meters,
          onboarding_step: 7,
        })
        .eq("id", session.user.id);

      if (updateError) throw updateError;
      router.push("/(onboarding)/education_signup");
    } catch (err) {
      console.error("Distance update error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ⚙️ tap-to-jump on slider
  const [sliderLayout, setSliderLayout] = useState({ x: 0, width: 1 });
  const handleSliderLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setSliderLayout({ x, width });
  };
  const handleSliderPress = (event: any) => {
    const pressX = event.nativeEvent.locationX;
    const ratio = pressX / sliderLayout.width;
    const min = 0.1, max = 4.0;
    const value = min + ratio * (max - min);
    const stepped = Math.round(value * 10) / 10; // 0.1 step
    setDistance(Math.min(max, Math.max(min, stepped)));
  };

  const slideTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Main Content */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Your distance preference?</Text>
            <Text style={styles.subtitle}>Choose how far your Niice's can be.</Text>

            {/* 📍 Triple Animated Pins in Triangle Formation */}
            <View style={styles.iconContainer}>
              {/* Top Pin */}
              <View style={[styles.pinWrapper, styles.pinTop]}>
                {[wave1, wave2, wave3].map((wave, i) => {
                  const scaleWave = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
                  const opacityAnim = wave.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.wave, { transform: [{ scale: scaleWave }], opacity: opacityAnim }]}
                    />
                  );
                })}
                <View style={styles.pinCore}>
                  <Ionicons name="location-sharp" size={moderateScale(40)} color={BLUE} />
                </View>
              </View>

              {/* Bottom Left Pin */}
              <View style={[styles.pinWrapper, styles.pinBottomLeft]}>
                {[wave4, wave5, wave6].map((wave, i) => {
                  const scaleWave = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
                  const opacityAnim = wave.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.wave, { transform: [{ scale: scaleWave }], opacity: opacityAnim }]}
                    />
                  );
                })}
                <View style={styles.pinCore}>
                  <Ionicons name="location-sharp" size={moderateScale(40)} color={BLUE} />
                </View>
              </View>

              {/* Bottom Right Pin */}
              <View style={[styles.pinWrapper, styles.pinBottomRight]}>
                {[wave7, wave8, wave9].map((wave, i) => {
                  const scaleWave = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
                  const opacityAnim = wave.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.wave, { transform: [{ scale: scaleWave }], opacity: opacityAnim }]}
                    />
                  );
                })}
                <View style={styles.pinCore}>
                  <Ionicons name="location-sharp" size={moderateScale(40)} color={BLUE} />
                </View>
              </View>
            </View>

            {/* ✨ Enhanced Slider Section with Animation */}
            <Animated.View
              style={[
                styles.sliderWrapper,
                {
                  opacity: slideAnim,
                  transform: [
                    { translateY: slideTranslate },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <View style={styles.labelRow}>
                <Text style={styles.label}>Distance</Text>

                <View style={styles.rightControls}>
                  <Text style={styles.valueText}>{formatDistance(distance, unit)}</Text>

                  <View style={styles.unitSwitch}>
                    <Pressable
                      onPress={() => setUnit("km")}
                      style={[styles.unitBtn, unit === "km" && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitText, unit === "km" && styles.unitTextActive]}>km</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setUnit("m")}
                      style={[styles.unitBtn, unit === "m" && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitText, unit === "m" && styles.unitTextActive]}>m</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Tappable slider track */}
              <Pressable onPress={handleSliderPress} onLayout={handleSliderLayout}>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={4.0}
                  step={0.1}
                  value={distance}
                  onValueChange={setDistance}
                  minimumTrackTintColor={BLUE}
                  maximumTrackTintColor="#C8CDD2"
                  thumbTintColor={BLUE}
                />
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={loading}>
          <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

/* 🎨 Theme */
const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  progressWrapper: {
    marginTop: verticalScale(88),
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
  },
  progressFill: {
    height: verticalScale(6),
    width: "43.75%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(35),
    paddingBottom: verticalScale(100),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(42),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    lineHeight: verticalScale(30),
    color: BLUE,
    marginBottom: verticalScale(20),
  },

  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(40),
    height: verticalScale(160),
    position: "relative",
  },
  pinWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pinTop: {
    top: 0,
  },
  pinBottomLeft: {
    bottom: 0,
    left: scale(25),
  },
  pinBottomRight: {
    bottom: 0,
    right: scale(25),
  },
  wave: {
    position: "absolute",
    width: scale(80),
    height: scale(80),
    borderRadius: 999,
    borderWidth: scale(2),
    borderColor: BLUE,
  },
  pinCore: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  sliderWrapper: {
    width: "100%",
    marginTop: verticalScale(5),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    shadowColor: BLUE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(8),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK,
  },

  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: BLUE,
    marginRight: scale(10),
  },
  unitSwitch: {
    flexDirection: "row",
    backgroundColor: "#EBF1FF",
    borderRadius: scale(10),
    overflow: "hidden",
  },
  unitBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  unitBtnActive: {
    backgroundColor: BLUE,
  },
  unitText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(12.5),
    color: "#1B2B44",
  },
  unitTextActive: {
    color: "#FFFFFF",
  },

  slider: {
    width: "100%",
    height: verticalScale(40),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});