// frontend/app/(edit_profile)/vehicles_edit.tsx
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, FloatingHeader } from "@/components";
import { supabase } from "@/lib/supabase";

// Vehicle options matching vehicle_enum
const VEHICLE_OPTIONS = [
  { value: "car", label: "Car", icon: "car" },
  { value: "motorcycle", label: "Motorcycle", icon: "motorbike" },
  { value: "bicycle", label: "Bicycle", icon: "bicycle" },
  { value: "scooter", label: "Scooter", icon: "scooter" },
  { value: "boat", label: "Boat", icon: "sail-boat" },
  { value: "plane", label: "Plane", icon: "airplane" },
  { value: "none", label: "None", icon: "walk" },
];

export default function VehiclesEdit() {
  const [selected, setSelected] = useState<string[]>([]);
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
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_vehicles_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setSelected(parsed.selected || []);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, vehicles")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.full_name || "");
      setSelected(Array.isArray(profileData?.vehicles) ? profileData.vehicles : []);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const handleToggle = (value: string) => {
    pulse(value);
    
    // If selecting "none", clear all others
    if (value === "none") {
      setSelected((prev) => (prev.includes("none") ? [] : ["none"]));
      return;
    }

    // If selecting something other than "none", remove "none" if present
    setSelected((prev) => {
      const withoutNone = prev.filter((v) => v !== "none");
      
      if (withoutNone.includes(value)) {
        return withoutNone.filter((v) => v !== value);
      } else {
        return [...withoutNone, value];
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      // Save directly to profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ vehicles: selected.length > 0 ? selected : null })
        .eq("id", user.id);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      // Also save to temp storage for edit_main to pick up immediately
      const tempKey = `temp_vehicles_${user.id}`;
      await AsyncStorage.setItem(
        tempKey,
        JSON.stringify({
          selected,
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
      setLoading(false);
    }
  };

  const renderIcon = (iconName: string, isSelected: boolean) => {
    return (
      <MaterialCommunityIcons
        name={iconName as any}
        size={28}
        color={isSelected ? "#FFFFFF" : Colors.BLUE}
      />
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader
          title="Vehicles"
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
              <Text style={styles.pageTitle}>What do you drive?</Text>
              <Text style={styles.pageSubtitle}>
                Select all the vehicles you have access to
              </Text>
            </View>

            <View style={styles.optionsGrid}>
              {VEHICLE_OPTIONS.map((option) => {
                const anim = ensureAnim(option.value);
                const isSelected = selected.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleToggle(option.value)}
                    delayLongPress={70}
                    style={styles.optionWrapper}
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
                        <View style={styles.iconContainer}>
                          {renderIcon(option.icon, isSelected)}
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        )}
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.infoNote} pointerEvents="none">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="rgba(10,14,26,0.5)"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Sharing your transportation options can help with planning activities and meetups.
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
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(12),
    justifyContent: "space-between",
  },
  optionWrapper: {
    width: "47%",
  },
  optionButton: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(16),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  optionButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconContainer: {
    marginBottom: verticalScale(10),
  },
  optionText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    textAlign: "center",
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  checkmark: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
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