import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
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

import {
    Colors,
    FloatingHeader,
} from "@/components";

import { supabase } from "@/lib/supabase";

const EDUCATION_LEVELS = [
  "High School",
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
];

export default function BackgroundEdit() {
  const [selectedEducation, setSelectedEducation] = useState<string | null>(null);
  const [institution, setInstitution] = useState("");
  const [otherEducation, setOtherEducation] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const animRefs = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.06, duration: 110, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_background_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setSelectedEducation(parsed.education || null);
        setInstitution(parsed.institution || "");
        setOtherEducation(parsed.otherEducation || "");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, education, institution")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.full_name || "");
      
      const edu = profileData?.education || null;
      
      // Check if education is one of the predefined levels
      if (edu && EDUCATION_LEVELS.includes(edu)) {
        setSelectedEducation(edu);
        setOtherEducation("");
      } else if (edu) {
        // It's a custom education level
        setSelectedEducation("Other");
        setOtherEducation(edu);
      } else {
        setSelectedEducation(null);
        setOtherEducation("");
      }
      
      setInstitution(profileData?.institution || "");
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const handleSelectEducation = (level: string) => {
    pulse(level);
    setSelectedEducation(level);
    if (level !== "Other") {
      setOtherEducation("");
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      // Determine final education value
      let finalEducation = selectedEducation;
      if (selectedEducation === "Other") {
        finalEducation = otherEducation.trim() || null;
      }

      const tempKey = `temp_background_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        education: finalEducation,
        institution: institution.trim(),
        otherEducation: selectedEducation === "Other" ? otherEducation.trim() : "",
        fullName
      }));

      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="Background" 
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
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            <View pointerEvents="none">
              <Text style={styles.pageTitle}>Your Education</Text>
              <Text style={styles.pageSubtitle}>
                Share your educational background
              </Text>
            </View>

            {/* Education Level Section */}
            <View style={styles.section}>
              <View pointerEvents="none">
                <Text style={styles.sectionTitle}>What is your education level?</Text>
              </View>

              <View style={styles.pillsContainer}>
                {EDUCATION_LEVELS.map((level) => {
                  const anim = ensureAnim(level);
                  const isSelected = selectedEducation === level;

                  return (
                    <Pressable 
                      key={level} 
                      onPress={() => handleSelectEducation(level)}
                      delayLongPress={70}
                    >
                      <Animated.View style={{ transform: [{ scale: anim }] }}>
                        <LinearGradient
                          colors={
                            isSelected
                              ? ["#1B44CD", "#3C6FFF"] as const
                              : ["#FFFFFF", "#F8FAFF"] as const
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.pillButton,
                            isSelected && styles.pillButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              isSelected && styles.pillTextSelected,
                            ]}
                          >
                            {level}
                          </Text>
                          <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={20}
                            color={isSelected ? "#FFFFFF" : Colors.BLUE}
                          />
                        </LinearGradient>
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Other Education Input */}
            {selectedEducation === "Other" && (
              <View style={styles.inputCard}>
                <LinearGradient
                  colors={["#FFFFFF", "#F8FAFF"] as const}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.inputLabel}>Specify your education</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Associate's, Bootcamp, Diploma..."
                  placeholderTextColor="rgba(10,14,26,0.4)"
                  value={otherEducation}
                  onChangeText={setOtherEducation}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            )}

            {/* Institution Section */}
            <View style={styles.inputCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"] as const}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.inputLabel}>Institution (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Add institution name..."
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={institution}
                onChangeText={setInstitution}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Text style={styles.helperText}>
                💡 Tip: Add your most recent or most relevant institution
              </Text>
            </View>

            <View style={styles.infoNote} pointerEvents="none">
              <Ionicons 
                name="information-circle-outline" 
                size={18} 
                color="rgba(10,14,26,0.5)" 
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Your educational background helps us find compatible matches with similar experiences.
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
    marginBottom: verticalScale(24),
  },
  section: {
    marginBottom: verticalScale(20),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(12),
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
  },
  pillButton: {
    borderRadius: scale(24),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(18),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    minWidth: scale(120),
  },
  pillButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  pillTextSelected: {
    color: "#FFFFFF",
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: verticalScale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(8),
  },
  textInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingVertical: verticalScale(8),
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  helperText: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(8),
    lineHeight: verticalScale(18),
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
  },
});