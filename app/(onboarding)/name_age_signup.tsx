import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NameAgeSignup() {
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const isValidDate = (d: number, m: number, y: number) => {
    const date = new Date(y, m - 1, d);
    return (
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    );
  };

  const handleNext = async () => {
    if (!name.trim()) return Alert.alert("Missing info", "Please enter your name.");
    if (!day || !month || !year)
      return Alert.alert("Missing info", "Please enter your full birthday.");

    const birthDay = parseInt(day);
    const birthMonth = parseInt(month);
    const birthYear = parseInt(year);

    if (
      isNaN(birthDay) ||
      isNaN(birthMonth) ||
      isNaN(birthYear) ||
      birthMonth < 1 ||
      birthMonth > 12 ||
      birthDay < 1 ||
      birthYear < 1900 ||
      birthYear > new Date().getFullYear()
    ) {
      return Alert.alert("Invalid date", "Please enter a valid date of birth.");
    }

    if (!isValidDate(birthDay, birthMonth, birthYear)) {
      return Alert.alert("Invalid date", "This date does not exist.");
    }

    const today = new Date();
    const age =
      today.getFullYear() -
      birthYear -
      (today.getMonth() < birthMonth - 1 ||
      (today.getMonth() === birthMonth - 1 && today.getDate() < birthDay)
        ? 1
        : 0);

    if (isNaN(age) || age < 18) {
      return Alert.alert("Invalid age", "You must be at least 18 years old.");
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          age,
          onboarding_step: 1,
        })
        .eq("id", session.user.id);

      if (updateError) {
        Alert.alert("Error", updateError.message);
        return;
      }

      router.push({ pathname: "/(onboarding)/gender_signup", params: { name } });
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Keyboard-aware scroll container */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(1)} // adjusts how far it pushes up
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentWrapper}>
              <Text style={styles.title}>
                Let’s start with{"\n"}these simple questions
              </Text>

              {/* First Name */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Your first name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder=""
                  placeholderTextColor="#A0A0A0"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* Birthday Section */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Your birthday</Text>
                <View style={styles.birthdayRow}>
                  {/* Day */}
                  <View style={styles.birthdayField}>
                    <Text style={styles.birthdayLabel}>Day</Text>
                    <TextInput
                      style={styles.birthdayInput}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      maxLength={2}
                      value={day}
                      onChangeText={(text) => {
                        setDay(text);
                        if (text.length === 2) monthRef.current?.focus();
                      }}
                      blurOnSubmit={false}
                      onSubmitEditing={() => monthRef.current?.focus()}
                    />
                  </View>

                  {/* Month */}
                  <View style={styles.birthdayField}>
                    <Text style={styles.birthdayLabel}>Month</Text>
                    <TextInput
                      ref={monthRef}
                      style={styles.birthdayInput}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      maxLength={2}
                      value={month}
                      onChangeText={(text) => {
                        setMonth(text);
                        if (text.length === 2) yearRef.current?.focus();
                      }}
                      blurOnSubmit={false}
                      onSubmitEditing={() => yearRef.current?.focus()}
                    />
                  </View>

                  {/* Year */}
                  <View style={styles.birthdayField}>
                    <Text style={styles.birthdayLabel}>Year</Text>
                    <TextInput
                      ref={yearRef}
                      style={styles.birthdayInput}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={4}
                      value={year}
                      onChangeText={setYear}
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    width: "6.25%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(100),
  },
  contentWrapper: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(20),
  },
  title: {
    fontSize: moderateScale(30),
    lineHeight: verticalScale(48),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(30),
  },
  inputBlock: { marginBottom: verticalScale(32) },
  label: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: INK,
    marginBottom: verticalScale(10),
  },
  input: {
    borderBottomWidth: scale(3),
    borderBottomColor: BLUE,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    paddingVertical: verticalScale(6),
    color: INK,
  },
  birthdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(8),
  },
  birthdayField: {
    flex: 1,
    marginRight: scale(10),
  },
  birthdayLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#6C757D",
    marginBottom: verticalScale(4),
  },
  birthdayInput: {
    borderBottomWidth: scale(3),
    borderBottomColor: BLUE,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    paddingVertical: verticalScale(6),
    color: INK,
    width: "90%",
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
  },
});
