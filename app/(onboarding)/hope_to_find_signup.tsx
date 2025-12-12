// frontend/app/%28onboarding%29/hope_to_find_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

// ===========================================
// UNIFIED OPTIONS - All looking_for_enum values
// Organized by category for better UX
// ===========================================

const OPTIONS = [
  // Dating-focused
  { label: "Marriage", value: "marriage", category: "dating", icon: "heart" },
  { label: "Life partner", value: "life_partner", category: "dating", icon: "heart-outline" },
  { label: "Long-term relationship", value: "long_term_relationship", category: "dating", icon: "time" },
  { label: "Short-term relationship", value: "short_term_relationship", category: "dating", icon: "calendar" },
  { label: "Fun, casual dates", value: "casual_dates", category: "dating", icon: "cafe" },
  { label: "Intimacy", value: "intimacy", category: "dating", icon: "flame" },

  // Friendship-focused
  { label: "New friends nearby", value: "new_friends", category: "friendship", icon: "people" },
  { label: "Close friendships", value: "close_friendships", category: "friendship", icon: "heart-circle" },
  { label: "Casual hangouts", value: "casual_hangouts", category: "friendship", icon: "chatbubbles" },
  { label: "Professional networking", value: "professional_networking", category: "friendship", icon: "briefcase" },
  { label: "Workout/fitness buddy", value: "workout_fitness_buddy", category: "friendship", icon: "fitness" },
  { label: "Travel companions", value: "travel_companions", category: "friendship", icon: "airplane" },
  { label: "Activity/hobby partners", value: "activity_hobby_partners", category: "friendship", icon: "game-controller" },

  // Events & Activities (NEW)
  { label: "Event buddies", value: "event_buddies", category: "events", icon: "ticket" },
  { label: "Group activities", value: "group_activities", category: "events", icon: "people-circle" },
  { label: "Local exploration", value: "local_exploration", category: "events", icon: "compass" },
  { label: "Adventure partners", value: "adventure_partners", category: "events", icon: "rocket" },
  { label: "Cultural events", value: "cultural_events", category: "events", icon: "musical-notes" },
  { label: "Sports events", value: "sports_events", category: "events", icon: "football" },
  { label: "Food & drinks", value: "food_and_drinks", category: "events", icon: "restaurant" },
  { label: "Nightlife partners", value: "nightlife_partners", category: "events", icon: "moon" },
  { label: "Outdoor activities", value: "outdoor_activities", category: "events", icon: "leaf" },
  { label: "Learning together", value: "learning_together", category: "events", icon: "school" },

  // Neutral
  { label: "Figuring it out", value: "figuring_it_out", category: "neutral", icon: "help-circle" },
];

const MAX_SELECTIONS = 7;

export default function HopeToFindSignup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const animRefs = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const toggleOption = (value: string) => {
    pulse(value);
    if (selected.includes(value)) {
      setSelected(selected.filter((x) => x !== value));
    } else {
      if (selected.length >= MAX_SELECTIONS) {
        Alert.alert("Limit reached", `You can choose up to ${MAX_SELECTIONS} options.`);
        return;
      }
      setSelected([...selected, value]);
    }
  };

  const isSelected = (value: string) => selected.includes(value);

  const handleNext = async () => {
    if (selected.length === 0) {
      Alert.alert("Missing info", "Please select at least one option.");
      return;
    }

    try {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session?.user) throw new Error("Session not found");

      // ✅ Save to profiles.looking_for (unified field)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          looking_for: selected,
          onboarding_step: 3,
        })
        .eq("id", session.user.id);

      if (updateError) throw new Error(updateError.message);

      // Route to optional orientation page
      router.push("/(onboarding)/orientation_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Group options by category
  const datingOptions = OPTIONS.filter((o) => o.category === "dating");
  const friendshipOptions = OPTIONS.filter((o) => o.category === "friendship");
  const eventOptions = OPTIONS.filter((o) => o.category === "events");
  const neutralOptions = OPTIONS.filter((o) => o.category === "neutral");

  const renderOption = (opt: { label: string; value: string; icon: string }) => {
    const anim = ensureAnim(opt.value);
    const selectedState = isSelected(opt.value);

    return (
      <Pressable key={opt.value} onPress={() => toggleOption(opt.value)}>
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={selectedState ? ["#1B44CD", "#3C6FFF"] as const : ["#FFFFFF", "#F8FAFF"] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionButton, selectedState && styles.optionSelected]}
          >
            <View style={styles.optionContent}>
              <Ionicons
                name={opt.icon as any}
                size={20}
                color={selectedState ? "#FFFFFF" : Colors.BLUE}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionText, selectedState && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </View>
            <Ionicons
              name={selectedState ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={selectedState ? "#FFFFFF" : Colors.BLUE}
            />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  };

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

      {/* Progress */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What are you hoping to find?</Text>
        <Text style={styles.subtitle}>
          Choose up to {MAX_SELECTIONS} options — dating, friendship, events, or all of the above!
        </Text>

        {/* Selection Counter - UPDATED TO MATCH value_signup.tsx */}
        <View style={styles.counterContainer}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {selected.length} / {MAX_SELECTIONS}
            </Text>
          </View>
          <Text style={styles.counterLabel}>selected</Text>
        </View>

        {/* Events & Activities Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
           
            <Text style={styles.sectionLabel}>Events & Activities</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Find people to create or join events with
          </Text>
          {eventOptions.map(renderOption)}
        </View>

        {/* Friendship Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
           
            <Text style={styles.sectionLabel}>Friendship</Text>
          </View>
          {friendshipOptions.map(renderOption)}
        </View>

        {/* Dating Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            
            <Text style={styles.sectionLabel}>Dating</Text>
          </View>
          {datingOptions.map(renderOption)}
        </View>

        {/* Neutral Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>

            <Text style={styles.sectionLabel}>Not sure yet?</Text>
          </View>
          {neutralOptions.map(renderOption)}
        </View>

        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            This information will be shown on your profile and helps us suggest relevant events and connections.
          </Text>
        </View>
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, selected.length === 0 && { opacity: 0.5 }]}
        onPress={handleNext}
        disabled={loading || selected.length === 0}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
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
    width: "17.64%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(26),
    lineHeight: verticalScale(34),
    color: Colors.INK,
    marginBottom: verticalScale(8),
    paddingTop: verticalScale(4),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(16),
    lineHeight: verticalScale(22),
  },

  // UPDATED COUNTER STYLES - NOW MATCHING value_signup.tsx
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
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
    color: "rgba(10,14,26,0.6)",
  },

  sectionContainer: {
    marginBottom: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: Colors.INK,
    marginLeft: scale(8),
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(10),
    marginLeft: scale(26),
  },

  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  optionSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    marginRight: scale(12),
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
    flex: 1,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(16),
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