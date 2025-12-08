import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Alert,
    Animated,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

// ==========================================
// VEHICLE OPTIONS (matches vehicle_enum)
// ==========================================
const OPTIONS = [
  { value: "car", label: "Car", icon: "car" },
  { value: "motorcycle", label: "Motorcycle", icon: "motorbike" },
  { value: "bicycle", label: "Bicycle", icon: "bicycle" },
  { value: "scooter", label: "Scooter", icon: "scooter" },
  { value: "boat", label: "Boat", icon: "sail-boat" },
  { value: "plane", label: "Plane", icon: "airplane" },
  { value: "none", label: "None / Walking", icon: "walk" },
];

// ==========================================
// CHIP COMPONENT
// ==========================================
const VehicleChip = React.memo(
  ({
    label,
    icon,
    selected,
    onPress,
  }: {
    label: string;
    icon: string;
    selected: boolean;
    onPress: () => void;
  }) => {
    const anim = useRef(new Animated.Value(1)).current;
    const handlePress = useCallback(() => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.06, duration: 95, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
      onPress();
    }, [anim, onPress]);

    return (
      <Pressable
        onPress={handlePress}
        hitSlop={6}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={
              selected
                ? (["#1B44CD", "#3C6FFF"] as const)
                : (["#FFFFFF", "#F8FAFF"] as const)
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionChip, selected && styles.optionChipSelected]}
          >
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color={selected ? "#FFFFFF" : Colors.BLUE}
              style={{ marginRight: scale(6) }}
            />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {label}
            </Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function VehiclesSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleOption = useCallback((value: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) => {
      // If selecting "none", clear everything and only select "none"
      if (value === "none") {
        return prev.includes("none") ? [] : ["none"];
      }

      // If selecting something else, remove "none" if it's selected
      const withoutNone = prev.filter((x) => x !== "none");

      if (withoutNone.includes(value)) {
        return withoutNone.filter((x) => x !== value);
      }

      // Max 5 vehicles (excluding none)
      if (withoutNone.length >= 5) {
        Alert.alert("Limit reached", "You can select up to 5 vehicles.");
        return prev;
      }

      return [...withoutNone, value];
    });
  }, []);

  const handleNext = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Only update if user selected something
      if (selected.length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update({ vehicles: selected })
          .eq("id", session.user.id);

        if (error) throw error;
      }

      router.push("/(onboarding)/(common)/prompt_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
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

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleNext} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>How do you get around?</Text>
        <Text style={styles.subtitle}>
          Select your transportation options — helps with planning meetups!
        </Text>

        <View style={styles.optionGroup}>
          {OPTIONS.map((opt) => (
            <VehicleChip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={selected.includes(opt.value)}
              onPress={() => toggleOption(opt.value)}
            />
          ))}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            Select all that apply. Choose "None" if you prefer walking or public transit. You
            can select up to 5 vehicles.
          </Text>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleNext}
        disabled={loading}
        style={[styles.nextButton, loading && { opacity: 0.5 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
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

  skipButton: {
    position: "absolute",
    top: verticalScale(16),
    right: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
    padding: scale(8),
  },
  skipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.BLUE,
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
    width: "90%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
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
    marginBottom: verticalScale(8),
    paddingTop: verticalScale(6.5),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(20),
    lineHeight: verticalScale(22),
  },

  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(24),
    minWidth: scale(140),
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  optionChipSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
    paddingTop: verticalScale(2),
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