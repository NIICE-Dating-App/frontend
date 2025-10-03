import { router } from "expo-router";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { Fonts } from "../constants/theme";

export default function SignupPhone() {
  const [countryCode, setCountryCode] = useState<CountryCode>("TR");
  const [country, setCountry] = useState<Country | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCountry(country);
    setPickerVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <BackButton style={styles.backButton} />

      {/* Title */}
      <View style={styles.titleWrapper}>
        <Text style={styles.titleBlue}>Let's start</Text>
        <Text style={styles.titleBlack}>with your number</Text>
      </View>

      {/* Country + Phone Input */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.countryBox}
          onPress={() => setPickerVisible(true)}
        >
          <CountryPicker
            withFlag
            withCallingCode   // ✅ show +90
            withFilter
            withEmoji
            countryCode={countryCode}
            onSelect={onSelect}
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
          />
          <Text style={styles.callingCodeText}>
            {country?.callingCode ? `+${country.callingCode}` : "+90"}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.phoneInput}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/phone_verif_signup")}
        >
        <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF7FF",
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 40,
  },
  titleBlue: {
    color: "#1A44CC",
    fontSize: 56,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    lineHeight: 80,   // just above fontSize (prevents clipping)
  },
  titleBlack: {
    color: "#000910",
    fontSize: 30,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    lineHeight: 45,
    marginTop: -6,    // pulls it closer under the blue text
  },
  titleWrapper: {
    marginBottom: 28, // keeps input field close after the title
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#1A44CC",
    marginBottom: 40,
    paddingBottom: 6,
  },
  countryBox: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  callingCodeText: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
    color: "#000910",
    marginLeft: 6,
  },
  phoneInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold", // ✅ matches design
    fontFamily: Fonts.bold,
    color: "#000910",
  },
  button: {
    height: 56, // ✅ same as login button
    backgroundColor: "#000910",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#00000040",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#EEF7FF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.bold,
  },
});
