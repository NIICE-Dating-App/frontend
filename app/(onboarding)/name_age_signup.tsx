import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useState } from "react";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function NameAgeSignup() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate maximum date (18 years ago)
  const getMaxDate = () => {
    const today = new Date();
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  };

  // Calculate minimum date (100 years ago)
  const getMinDate = () => {
    const today = new Date();
    return new Date(today.getFullYear() - 100, 0, 1);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Select your birthday";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleNext = async () => {
    if (!name.trim()) {
      return Alert.alert("Missing info", "Please enter your name.");
    }
    
    if (!birthDate) {
      return Alert.alert("Missing info", "Please select your birthday.");
    }

    // Calculate age
    const today = new Date();
    const age =
      today.getFullYear() -
      birthDate.getFullYear() -
      (today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
        ? 1
        : 0);

    if (age < 18) {
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

        {/* Progress Bar - KEEPING EXACT SAME PERCENTAGE */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(1)}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentWrapper}>
              <Text style={styles.title}>
                Let's start with{"\n"}these simple questions
              </Text>

              {/* First Name */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Your first name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(10,14,26,0.3)"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* Birthday Section */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Your birthday</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.datePickerText,
                    !birthDate && styles.datePickerPlaceholder
                  ]}>
                    {formatDate(birthDate)}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={birthDate ? Colors.BLUE : "rgba(10,14,26,0.3)"}
                  />
                </TouchableOpacity>
              </View>

              {/* iOS-style Date Picker */}
              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(false)}
                      style={styles.datePickerDone}
                    >
                      <Text style={styles.datePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={birthDate || getMaxDate()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={getMaxDate()}
                    minimumDate={getMinDate()}
                    textColor={Colors.INK}
                    style={styles.datePicker}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
    width: "5.88%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(100),
  },
  contentWrapper: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
  },
  title: {
    fontSize: scale(28),
    lineHeight: verticalScale(38),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(32),
    paddingTop: verticalScale(6.5),
  },
  inputBlock: {
    marginBottom: verticalScale(32),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: Colors.INK,
    marginBottom: verticalScale(12),
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    paddingVertical: verticalScale(10),
    color: Colors.INK,
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingVertical: verticalScale(10),
  },
  datePickerText: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: Colors.INK,
  },
  datePickerPlaceholder: {
    color: "rgba(10,14,26,0.3)",
  },
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    marginTop: verticalScale(-15),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.1)",
  },
  datePickerDone: {
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(12),
  },
  datePickerDoneText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: Colors.BLUE,
  },
  datePicker: {
    height: verticalScale(200),
    backgroundColor: "#FFFFFF",
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