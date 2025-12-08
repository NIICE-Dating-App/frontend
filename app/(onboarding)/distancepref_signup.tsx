// app/(onboarding)/distancepref_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={24} color={Colors.INK} />
          </View>
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
                  <Ionicons name="location-sharp" size={scale(40)} color={Colors.BLUE} />
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
                  <Ionicons name="location-sharp" size={scale(40)} color={Colors.BLUE} />
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
                  <Ionicons name="location-sharp" size={scale(40)} color={Colors.BLUE} />
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
                  minimumTrackTintColor={Colors.BLUE}
                  maximumTrackTintColor="#C8CDD2"
                  thumbTintColor={Colors.BLUE}
                />
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },

  backButton: {
    position: "absolute",
    top: verticalScale(16),
    left: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  progressWrapper: {
    marginTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  progressTrack: {
    height: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressFill: {
    height: verticalScale(8),
    width: "23.52%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),

  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    marginBottom: verticalScale(6),
    marginTop: verticalScale(10),
    paddingTop: verticalScale(6.5),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    lineHeight: verticalScale(24),
    color: Colors.BLUE,
    marginBottom: verticalScale(20),
  },

  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(60),
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
    borderColor: Colors.BLUE,
  },
  pinCore: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  sliderWrapper: {
    width: "100%",
    marginTop: verticalScale(5),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    shadowColor: Colors.BLUE,
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
    fontSize: scale(16),
    color: Colors.INK,
  },

  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: Colors.BLUE,
    marginRight: scale(10),
  },
  unitSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(10),
    overflow: "hidden",
  },
  unitBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  unitBtnActive: {
    backgroundColor: Colors.BLUE,
  },
  unitText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.6)",
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
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});