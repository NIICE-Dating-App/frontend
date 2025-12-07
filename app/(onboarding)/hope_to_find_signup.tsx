import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
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
      Animated.timing(a, { toValue: 1.07, duration: 100, useNativeDriver: true }),
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
        <Animated.View style={[{ transform: [{ scale: anim }] }, styles.shadowWrapper]}>
          <LinearGradient
            colors={selectedState ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F9FBFF", "#EEF3FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionButton, selectedState && styles.optionSelected]}
          >
            <View style={styles.optionContent}>
              <Ionicons
                name={opt.icon as any}
                size={moderateScale(20)}
                color={selectedState ? "#FFFFFF" : "#1B44CD"}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionText, selectedState && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </View>
            <Ionicons
              name={selectedState ? "checkmark-circle" : "ellipse-outline"}
              size={moderateScale(22)}
              color={selectedState ? "#FFFFFF" : "#1B2B44"}
            />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
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

        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {selected.length} / {MAX_SELECTIONS} selected
          </Text>
        </View>

        {/* Dating Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={moderateScale(18)} color={BLUE} />
            <Text style={styles.sectionLabel}>Dating</Text>
          </View>
          {datingOptions.map(renderOption)}
        </View>

        {/* Friendship Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={moderateScale(18)} color={BLUE} />
            <Text style={styles.sectionLabel}>Friendship</Text>
          </View>
          {friendshipOptions.map(renderOption)}
        </View>

        {/* Events & Activities Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={moderateScale(18)} color={BLUE} />
            <Text style={styles.sectionLabel}>Events & Activities</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Find people to create or join events with
          </Text>
          {eventOptions.map(renderOption)}
        </View>

        {/* Neutral Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={moderateScale(18)} color={BLUE} />
            <Text style={styles.sectionLabel}>Not sure yet?</Text>
          </View>
          {neutralOptions.map(renderOption)}
        </View>

        <Text style={styles.note}>
          This information will be shown on your profile and helps us suggest relevant events and connections.
        </Text>
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, selected.length === 0 && { opacity: 0.5 }]}
        onPress={handleNext}
        disabled={loading || selected.length === 0}
      >
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

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

  progressWrapper: { marginTop: verticalScale(88), paddingHorizontal: scale(24) },
  progressTrack: { height: verticalScale(6), backgroundColor: "#C8CDD2", borderRadius: scale(3) },
  progressFill: { height: verticalScale(6), width: "17.64%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(28), paddingBottom: verticalScale(120) },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(38),
    color: INK,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#6C757D",
    marginBottom: verticalScale(12),
    lineHeight: verticalScale(22),
  },

  counterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: BLUE,
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
    fontSize: moderateScale(16),
    color: BLUE,
    marginLeft: scale(8),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: "#8E99A4",
    marginBottom: verticalScale(10),
    marginLeft: scale(26),
  },

  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: verticalScale(8),
  },

  optionButton: {
    borderRadius: scale(12),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionSelected: { 
    shadowOpacity: 0.35, 
    shadowRadius: 8, 
    transform: [{ scale: 1.02 }] 
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
    fontSize: moderateScale(15), 
    color: "#1B2B44",
    flex: 1,
  },
  optionTextSelected: { color: "#FFFFFF" },

  note: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: "#6C757D",
    marginTop: verticalScale(16),
    lineHeight: verticalScale(20),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(68),
    height: verticalScale(68),
    borderRadius: scale(34),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
});