// frontend/app/(edit_profile)/hometown_edit.tsx
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
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, FloatingHeader } from "@/components";
import { supabase } from "@/lib/supabase";

export default function HometownEdit() {
  const [hometown, setHometown] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_hometown_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setHometown(parsed.hometown || "");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, hometown")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setFullName(profileData?.full_name || "");
      setHometown(profileData?.hometown || "");
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
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
        .update({ hometown: hometown.trim() || null })
        .eq("id", user.id);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      // Also save to temp storage for edit_main to pick up immediately
      const tempKey = `temp_hometown_${user.id}`;
      await AsyncStorage.setItem(
        tempKey,
        JSON.stringify({
          hometown: hometown.trim(),
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader
          title="Hometown"
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
              <Text style={styles.pageTitle}>Where are you from?</Text>
              <Text style={styles.pageSubtitle}>
                Share your hometown or where you grew up
              </Text>
            </View>

            <View style={styles.inputCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"] as const}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.inputHeader}>
                <Ionicons name="home-outline" size={24} color={Colors.BLUE} />
                <Text style={styles.inputLabel}>Hometown</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Istanbul, New York, Tokyo..."
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={hometown}
                onChangeText={setHometown}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                autoCapitalize="words"
                maxLength={100}
              />
              <Text style={styles.characterCount}>
                {hometown.length}/100
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
                Your hometown helps others find common ground and start conversations about places you know.
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
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginLeft: scale(10),
  },
  textInput: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingVertical: verticalScale(12),
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  characterCount: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    textAlign: "right",
    marginTop: verticalScale(8),
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