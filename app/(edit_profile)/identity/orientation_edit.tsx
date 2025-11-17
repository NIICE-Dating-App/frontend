import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    AnimatedPressable,
    Colors,
    FloatingHeader,
} from "@/components";

import { supabase } from "@/lib/supabase";

export default function OrientationEdit() {
  const [selectedOrientation, setSelectedOrientation] = useState<string | null>(null);
  const [customOrientation, setCustomOrientation] = useState("");
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");

  const orientations = [
    "Straight",
    "Gay",
    "Lesbian",
    "Bisexual",
    "Pansexual",
    "Omnisexual",
    "Asexual",
    "Demisexual",
    "Aromantic",
    "Queer",
    "Questioning",
    "Not listed",
  ];

  useEffect(() => {
    loadCurrentOrientation();
  }, []);

  const loadCurrentOrientation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_orientation_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setSelectedOrientation(parsed.selectedOrientation || null);
        setCustomOrientation(parsed.customOrientation || "");
        setShowOnProfile(parsed.showOnProfile ?? true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("sexual_orientation, orientation_custom, show_orientation_on_profile, full_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setShowOnProfile(data.show_orientation_on_profile ?? true);
        
        if (data.sexual_orientation) {
          const orientation = data.sexual_orientation
            .split("_")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          setSelectedOrientation(orientation);
        }
        
        if (data.orientation_custom) {
          setCustomOrientation(data.orientation_custom);
        }
      }
    } catch (error) {
      console.error("Error loading orientation:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!selectedOrientation) {
      Alert.alert("Missing Info", "Please select your sexual orientation.");
      return;
    }

    if (selectedOrientation === "Not listed" && customOrientation.trim().length === 0) {
      Alert.alert(
        "Please Specify", 
        "Please describe your orientation or select another option."
      );
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      const normalizedOrientation = selectedOrientation
        .toLowerCase()
        .replace(/\s+/g, "_");

      const tempKey = `temp_orientation_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        selectedOrientation,
        customOrientation,
        showOnProfile,
        fullName,
        normalizedOrientation
      }));

      router.back();
    } catch (err) {
      console.error("Orientation update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="Sexual Orientation" 
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
            <Text style={styles.title}>What is your sexual orientation?</Text>

            <View style={styles.optionsContainer}>
              {orientations.map((option) => {
                const isSelected = selectedOrientation === option;
                
                return (
                  <View key={option}>
                    <AnimatedPressable
                      onPress={() => setSelectedOrientation(option)}
                      scaleValue={0.98}
                      animationDuration={150}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? ["#1B44CD", "#3C6FFF"] as const
                            : ["#FFFFFF", "#F8FAFF"] as const
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={isSelected ? "#FFFFFF" : Colors.BLUE}
                        />
                      </LinearGradient>
                    </AnimatedPressable>

                    {selectedOrientation === "Not listed" && option === "Not listed" && (
                      <View style={styles.customInputWrapper}>
                        <TextInput
                          style={styles.customInput}
                          placeholder="Please share how you identify"
                          placeholderTextColor="rgba(10,14,26,0.4)"
                          value={customOrientation}
                          onChangeText={setCustomOrientation}
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                          autoCapitalize="sentences"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.profileToggleSection}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"] as const}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.toggleDescription}>
                Choose whether to display your sexual orientation on your profile.
              </Text>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Ionicons 
                    name="eye-outline" 
                    size={20} 
                    color={Colors.BLUE} 
                    style={{ marginRight: scale(8) }}
                  />
                  <Text style={styles.switchLabel}>Show on my profile</Text>
                </View>
                <Switch
                  value={showOnProfile}
                  onValueChange={setShowOnProfile}
                  trackColor={{ false: "#C8CDD2", true: Colors.BLUE }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#C8CDD2"
                />
              </View>
            </View>

            <View style={styles.infoNote}>
              <Ionicons 
                name="information-circle-outline" 
                size={18} 
                color="rgba(10,14,26,0.5)" 
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Your orientation helps us show you more compatible matches.
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
  title: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(24),
    lineHeight: verticalScale(32),
  },
  optionsContainer: {
    gap: verticalScale(12),
  },
  optionButton: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
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
  optionText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  customInputWrapper: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(4),
  },
  customInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: Colors.INK,
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  profileToggleSection: {
    marginTop: verticalScale(32),
    padding: scale(20),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  toggleDescription: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.7)",
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(16),
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
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