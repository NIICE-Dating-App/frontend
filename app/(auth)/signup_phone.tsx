import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function SignupPhone() {
  const [countryCode, setCountryCode] = useState<CountryCode>("US");
  const [country, setCountry] = useState<Country | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCountry(country);
    setPickerVisible(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.INK} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Your Phone Number</Text>
            <Text style={styles.pageSubtitle}>
              We'll send you a verification code
            </Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setPickerVisible(true)}
              >
                <CountryPicker
                  withFlag
                  withCallingCode
                  withFilter
                  withEmoji
                  countryCode={countryCode}
                  onSelect={onSelect}
                  visible={pickerVisible}
                  onClose={() => setPickerVisible(false)}
                />
                <Text style={styles.callingCode}>
                  {country?.callingCode ? `+${country.callingCode}` : "Code"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color="rgba(10,14,26,0.4)"
                  style={{ marginLeft: scale(4) }}
                />
              </TouchableOpacity>

              <TextInput
                style={styles.phoneInput}
                placeholder="Enter phone number"
                placeholderTextColor="rgba(10,14,26,0.4)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => router.push("/phone_verif_signup")}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.infoNote}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="rgba(10,14,26,0.5)"
              style={{ marginRight: scale(8) }}
            />
            <Text style={styles.infoNoteText}>
              Standard message and data rates may apply
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(32),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerSection: {
    marginBottom: verticalScale(32),
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
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(24),
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
    marginBottom: verticalScale(12),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.BLUE,
    paddingBottom: verticalScale(8),
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: scale(12),
    borderRightWidth: 1,
    borderRightColor: "rgba(10,14,26,0.12)",
    marginRight: scale(12),
  },
  callingCode: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginLeft: scale(8),
  },
  phoneInput: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    paddingVertical: 0,
  },
  nextButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: verticalScale(24),
  },
  nextButtonText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    paddingTop: verticalScale(4.5),
  },
});