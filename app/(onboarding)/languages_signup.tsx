// app/(onboarding)/(common)/languages_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    LayoutAnimation,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";

type Language = {
  id: number;
  code: string;
  label: string;
};

// ==========================================
// CHIP COMPONENT
// ==========================================
const LanguageChip = React.memo(
  ({
    label,
    selected,
    onPress,
  }: {
    label: string;
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
        <Animated.View
          style={[
            { transform: [{ scale: anim }] },
            styles.shadowWrapper,
            Platform.OS === "ios" && { shadowOpacity: selected ? 0.35 : 0.15 },
          ]}
        >
          <LinearGradient
            colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F8FAFF", "#EBF1FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.optionChip, selected && { transform: [{ scale: 1.02 }] }]}
          >
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
export default function LanguagesSignup() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch languages from languages_master table
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data, error } = await supabase
          .from("languages_master")
          .select("id, code, label")
          .order("label");

        if (error) throw error;
        setLanguages(data || []);
      } catch (e: any) {
        console.error("Error fetching languages:", e);
        Alert.alert("Error", "Failed to load languages");
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  const toggleLanguage = useCallback((id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 10) {
        Alert.alert("Limit reached", "You can select up to 10 languages.");
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleNext = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No active session");

      // Delete existing user languages first
      await supabase
        .from("user_languages")
        .delete()
        .eq("user_id", session.user.id);

      // Insert new selections if any
      if (selectedIds.length > 0) {
        const inserts = selectedIds.map((langId) => ({
          user_id: session.user.id,
          language_id: langId,
        }));

        const { error } = await supabase
          .from("user_languages")
          .insert(inserts);

        if (error) throw error;
      }

      router.push("/(onboarding)/vehicles_signup");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // Filter languages based on search
  const filteredLanguages = languages.filter((lang) =>
    lang.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </Pressable>

      {/* Skip Button */}
      <Pressable style={styles.skipButton} onPress={handleNext}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: scale(24),
          paddingBottom: verticalScale(110),
          paddingTop: verticalScale(35),
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>What languages do you speak?</Text>
        <Text style={styles.subtitle}>
          Select all that apply — this helps you connect with people who speak your language.
        </Text>

        {/* Selected Count */}
        {selectedIds.length > 0 && (
          <View style={styles.countBadge}>
            <Ionicons name="language" size={moderateScale(16)} color={BLUE} />
            <Text style={styles.countText}>{selectedIds.length} selected</Text>
          </View>
        )}

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={moderateScale(20)} color="#7A838E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            placeholderTextColor="#7A838E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={moderateScale(20)} color="#7A838E" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingText}>Loading languages...</Text>
          </View>
        ) : (
          <View style={styles.optionGroup}>
            {filteredLanguages.map((lang) => (
              <LanguageChip
                key={lang.id}
                label={lang.label}
                selected={selectedIds.includes(lang.id)}
                onPress={() => toggleLanguage(lang.id)}
              />
            ))}
            {filteredLanguages.length === 0 && (
              <Text style={styles.noResultsText}>No languages found</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Next Button */}
      <Pressable onPress={handleNext} style={styles.nextButton}>
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
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

  skipButton: {
    position: "absolute",
    top: verticalScale(58),
    right: scale(24),
    zIndex: 10,
  },
  skipText: {
    fontFamily: Fonts.bold,
    color: "#7A838E",
    fontSize: moderateScale(15),
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
    width: "86%", // Incrementing from hometown
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(28),
    lineHeight: verticalScale(42),
    color: INK,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    lineHeight: verticalScale(26),
    color: BLUE,
    marginBottom: verticalScale(16),
  },

  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: scale(6),
    backgroundColor: "#E4ECFF",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    marginBottom: verticalScale(12),
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: BLUE,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "#D4DAE1",
    gap: scale(10),
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: INK,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#7A838E",
    marginTop: verticalScale(12),
  },

  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: scale(10),
  },
  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderRadius: scale(30),
  },
  optionChip: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(18),
    borderRadius: scale(30),
    minWidth: scale(100),
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: "#1B2B44",
    textAlign: "center",
  },
  optionTextSelected: { color: "#FFFFFF" },

  noResultsText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#7A838E",
    textAlign: "center",
    width: "100%",
    paddingVertical: verticalScale(20),
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