// frontend/app/(edit_profile)/languages_edit.tsx
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, FloatingHeader } from "@/components";
import { supabase } from "@/lib/supabase";

type Language = {
  id: number;
  code: string;
  label: string;
};

const MAX_LANGUAGES = 5;

export default function LanguagesEdit() {
  const [allLanguages, setAllLanguages] = useState<Language[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const animRefs = useRef<Record<number, Animated.Value>>({});

  const ensureAnim = (id: number) => {
    if (!animRefs.current[id]) animRefs.current[id] = new Animated.Value(1);
    return animRefs.current[id];
  };

  const pulse = (id: number) => {
    const a = ensureAnim(id);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's full name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setFullName(profileData?.full_name || "");

      // Get all available languages
      const { data: languagesData, error: languagesError } = await supabase
        .from("languages_master")
        .select("id, code, label")
        .order("label");

      if (languagesError) throw languagesError;
      setAllLanguages(languagesData || []);

      // Check temp storage first
      const tempKey = `temp_languages_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setSelectedIds(parsed.selectedIds || []);
      } else {
        // Get user's current languages
        const { data: userLanguages, error: userLangError } = await supabase
          .from("user_languages")
          .select("language_id")
          .eq("user_id", user.id);

        if (userLangError) throw userLangError;
        setSelectedIds((userLanguages || []).map((ul) => ul.language_id));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load languages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    pulse(id);

    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((lid) => lid !== id);
      } else {
        if (prev.length >= MAX_LANGUAGES) {
          Alert.alert("Limit Reached", `You can select up to ${MAX_LANGUAGES} languages.`);
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setSaving(false);
        return;
      }

      // Delete existing user languages
      const { error: deleteError } = await supabase
        .from("user_languages")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw deleteError;
      }

      // Insert new selections
      if (selectedIds.length > 0) {
        const insertData = selectedIds.map((langId) => ({
          user_id: user.id,
          language_id: langId,
        }));

        const { error: insertError } = await supabase
          .from("user_languages")
          .insert(insertData);

        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }
      }

      // Save to temp storage for edit_main to pick up immediately
      const tempKey = `temp_languages_${user.id}`;
      const selectedLabels = allLanguages
        .filter((l) => selectedIds.includes(l.id))
        .map((l) => l.label);

      await AsyncStorage.setItem(
        tempKey,
        JSON.stringify({
          selectedIds,
          selectedLabels,
          fullName,
        })
      );

      // Clear temp storage after successful save
      await AsyncStorage.removeItem(tempKey);

      router.back();
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredLanguages = allLanguages.filter((lang) =>
    lang.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort selected languages to top
  const sortedLanguages = [...filteredLanguages].sort((a, b) => {
    const aSelected = selectedIds.includes(a.id);
    const bSelected = selectedIds.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader title="Languages" fullName={fullName} onSave={() => {}} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.BLUE} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader
          title="Languages"
          fullName={fullName}
          onSave={handleSave}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
          >
            <View pointerEvents="none">
              <Text style={styles.pageTitle}>What languages do you speak?</Text>
              <Text style={styles.pageSubtitle}>
                Select up to {MAX_LANGUAGES} languages ({selectedIds.length}/{MAX_LANGUAGES})
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="rgba(10,14,26,0.4)"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="rgba(10,14,26,0.4)" />
                </Pressable>
              )}
            </View>

            {/* Selected Languages Summary */}
            {selectedIds.length > 0 && (
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryLabel}>Selected:</Text>
                <View style={styles.selectedChips}>
                  {allLanguages
                    .filter((l) => selectedIds.includes(l.id))
                    .map((lang) => (
                      <Pressable
                        key={lang.id}
                        onPress={() => handleToggle(lang.id)}
                        style={styles.selectedChip}
                      >
                        <Text style={styles.selectedChipText}>{lang.label}</Text>
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            {/* Language Options */}
            <View style={styles.optionsContainer}>
              {sortedLanguages.map((lang) => {
                const anim = ensureAnim(lang.id);
                const isSelected = selectedIds.includes(lang.id);

                return (
                  <Pressable
                    key={lang.id}
                    onPress={() => handleToggle(lang.id)}
                    delayLongPress={70}
                  >
                    <Animated.View style={{ transform: [{ scale: anim }] }}>
                      <LinearGradient
                        colors={
                          isSelected
                            ? (["#1B44CD", "#3C6FFF"] as const)
                            : (["#FFFFFF", "#F8FAFF"] as const)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                      >
                        <View style={styles.optionContent}>
                          <Text style={styles.languageCode}>{lang.code.toUpperCase()}</Text>
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && styles.optionTextSelected,
                            ]}
                          >
                            {lang.label}
                          </Text>
                        </View>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={isSelected ? "#FFFFFF" : Colors.BLUE}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            {filteredLanguages.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="language-outline" size={48} color="rgba(10,14,26,0.2)" />
                <Text style={styles.noResultsText}>No languages found</Text>
              </View>
            )}

            <View style={styles.infoNote} pointerEvents="none">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="rgba(10,14,26,0.5)"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Adding your languages helps you connect with people who speak the same languages.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(100),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  pageTitle: {
    fontSize: scale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(16),
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: scale(10),
  },
  searchInput: {
    flex: 1,
    paddingVertical: verticalScale(14),
    fontSize: scale(16),
    fontFamily: Fonts.primary,
    color: Colors.INK,
  },
  clearButton: {
    padding: scale(4),
  },
  selectedSummary: {
    marginBottom: verticalScale(16),
  },
  selectedSummaryLabel: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(8),
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BLUE,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    gap: scale(6),
  },
  selectedChipText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  optionsContainer: {
    gap: verticalScale(10),
  },
  optionButton: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  languageCode: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.4)",
    backgroundColor: "rgba(10,14,26,0.06)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    marginRight: scale(12),
    overflow: "hidden",
  },
  optionText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  noResultsText: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(12),
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(20),
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
  },
});