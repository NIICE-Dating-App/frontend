import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// COMMUNITY OPTIONS
// ==========================================
const OPTIONS = [
  { label: "Environmentalism", icon: "leaf" },
  { label: "Social justice", icon: "megaphone" },
  { label: "LGBTQIA+", icon: "heart" },
  { label: "Feminism", icon: "female" },
  { label: "Mental health awareness", icon: "pulse" },
  { label: "Black community", icon: "people" },
  { label: "Asian community", icon: "people" },
  { label: "Latino/Hispanic community", icon: "people" },
  { label: "Jewish community", icon: "star" },
  { label: "Muslim community", icon: "moon" },
  { label: "Disability awareness", icon: "accessibility" },
  { label: "Body positivity", icon: "heart" },
  { label: "Animal rights", icon: "paw" },
  { label: "Climate action", icon: "earth" },
  { label: "Other", icon: "ellipsis-horizontal" },
];

const MAX_SELECTIONS = 4;

// ==========================================
// CHIP COMPONENT
// ==========================================
const OptionChip = React.memo(
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
      <Pressable onPress={handlePress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={selected ? (["#1B44CD", "#3C6FFF"] as const) : (["#FFFFFF", "#F8FAFF"] as const)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionChip, selected && styles.optionSelected]}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={selected ? "#FFFFFF" : Colors.BLUE}
              style={styles.chipIcon}
            />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Communities4Signup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleOption = useCallback((optionLabel: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected((prev) => {
      const has = prev.includes(optionLabel);

      // Deselect
      if (has) return prev.filter((x) => x !== optionLabel);

      // Prevent selecting more than 4
      if (prev.length >= MAX_SELECTIONS) {
        Alert.alert("Limit reached", `You can select up to ${MAX_SELECTIONS} communities.`);
        return prev;
      }

      return [...prev, optionLabel];
    });
  }, []);

  const handleNext = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      const finalSelections = selected.includes("Other")
        ? [...selected.filter((x) => x !== "Other"), otherText.trim() || "Other"]
        : selected;

      const payload = {
        user_id: session.user.id,
        communities: finalSelections.length > 0 ? finalSelections : null,
      };

      const { error } = await supabase
        .from("lifestyle")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      router.push("/(onboarding)/maritial_status_signup");
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Pick the communities you support</Text>
          <View style={styles.counterRow}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {selected.length} / {MAX_SELECTIONS}
              </Text>
            </View>
            <Text style={styles.counterLabel}>selected</Text>
          </View>
        </View>

        <View style={styles.optionGroup}>
          {OPTIONS.map((opt) => (
            <React.Fragment key={opt.label}>
              <OptionChip
                label={opt.label}
                icon={opt.icon}
                selected={selected.includes(opt.label)}
                onPress={() => toggleOption(opt.label)}
              />
              {opt.label === "Other" && selected.includes("Other") && (
                <View style={styles.otherInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your community..."
                    placeholderTextColor="rgba(10,14,26,0.4)"
                    value={otherText}
                    onChangeText={setOtherText}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              )}
            </React.Fragment>
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
            This helps you connect with like-minded people who share your values.
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
    width: "76.44%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },

  headerSection: {
    marginBottom: verticalScale(20),
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    marginBottom: verticalScale(12),
    paddingTop: verticalScale(6.5),
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  counterBadge: {
      backgroundColor: Colors.BLUE,
      paddingVertical: verticalScale(6),
      paddingHorizontal: scale(12),
      borderRadius: scale(20),
      shadowColor: Colors.BLUE,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },
  counterLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },

  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },

  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(24),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipIcon: {
    marginRight: scale(6),
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: Colors.INK,
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },

  otherInputContainer: {
    width: "100%",
    marginTop: verticalScale(4),
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.2)",
    borderRadius: scale(14),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: Colors.INK,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(24),
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
    paddingTop: verticalScale(0.5),
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