import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive"; // ADDED moderateScale
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
  const [isFocused, setIsFocused] = useState(false);

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCountry(country);
    setPickerVisible(false);
    // Clear phone when changing countries
    setPhoneNumber("");
  };

  // Get max digits allowed for country
  const getMaxDigits = (callingCode?: string[]): number => {
    if (!callingCode || callingCode.length === 0) return 15;
    
    const code = callingCode[0];
    
    // Country-specific limits
    const limits: Record<string, number> = {
      '1': 10,   // US/Canada
      '44': 10,  // UK
      '33': 9,   // France
      '49': 11,  // Germany
      '39': 10,  // Italy
      '34': 9,   // Spain
      '91': 10,  // India
      '86': 11,  // China
      '81': 10,  // Japan
      '82': 10,  // South Korea
      '61': 9,   // Australia
      '55': 11,  // Brazil
      '7': 10,   // Russia
    };
    
    return limits[code] || 15; // Default 15 for others
  };

  // Format phone number based on country
  const formatPhoneNumber = (cleaned: string, callingCode?: string[]): string => {
    if (!cleaned) return "";
    
    const code = callingCode?.[0];
    
    // US/Canada format: (123) 456-7890
    if (code === '1') {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
    
    // UK format: 020 1234 5678
    if (code === '44') {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 7) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 10)}`;
    }
    
    // Default international: space every 3 digits
    return cleaned.match(/.{1,3}/g)?.join(' ') || cleaned;
  };

  const handlePhoneChange = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Get max digits for current country
    const maxDigits = getMaxDigits(country?.callingCode);
    
    // Limit to max digits
    const limited = cleaned.slice(0, maxDigits);
    
    // Format and set
    const formatted = formatPhoneNumber(limited, country?.callingCode);
    setPhoneNumber(formatted);
  };

  // Validation
  const cleanedPhone = phoneNumber.replace(/\D/g, '');
  const minDigits = country?.callingCode?.[0] === '1' ? 10 : 8; // US needs 10, others need at least 8
  const isValidPhone = cleanedPhone.length >= minDigits;
  const showError = phoneNumber.length > 0 && !isValidPhone && !isFocused;

  // Get placeholder
  const getPlaceholder = () => {
    const code = country?.callingCode?.[0];
    if (code === '1') return "(555) 123-4567";
    if (code === '44') return "020 1234 5678";
    return "123 456 789";
  };

  const handleContinue = () => {
    if (isValidPhone) {
      Keyboard.dismiss();
      setTimeout(() => router.push("/phone_verif_signup"), 100);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={scale(24)} color={Colors.INK} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Your Phone Number</Text>
            <Text style={styles.pageSubtitle}>
              We'll send you a verification code
            </Text>
          </View>

          {/* Input Card */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
              {/* Country Selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.flagCircle}>
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
                </View>
                <Text style={styles.callingCode}>
                  {country?.callingCode?.[0] ? `+${country.callingCode[0]}` : "+1"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={scale(16)}
                  color={Colors.BLUE}
                  style={{ marginLeft: scale(4) }}
                />
              </TouchableOpacity>

              {/* Phone Input */}
              <TextInput
                style={styles.phoneInput}
                placeholder={getPlaceholder()}
                placeholderTextColor="rgba(10,14,26,0.4)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
            </View>
          </View>

          {/* Validation Error */}
          {showError && (
            <View style={styles.errorMessage}>
              <Ionicons name="alert-circle" size={scale(16)} color={Colors.BLUE} />
              <Text style={styles.errorText}>
                Please enter at least {minDigits} digits
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.nextButton, !isValidPhone && styles.nextButtonDisabled]}
            onPress={handleContinue}
            disabled={!isValidPhone}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, !isValidPhone && styles.nextButtonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>

          {/* Security Badge */}
          <View style={styles.securityBadge}>
            <View style={styles.securityIconCircle}>
              <Ionicons name="shield-checkmark" size={scale(20)} color={Colors.BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Secure & Private</Text>
              <Text style={styles.securityText}>
                Your phone number is encrypted and never shared. Standard rates may apply.
              </Text>
            </View>
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
    fontSize: moderateScale(28), // CHANGED
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: moderateScale(15), // CHANGED
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(22),
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: moderateScale(14), // CHANGED
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(12),
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "rgba(27,68,205,0.2)",
    paddingBottom: verticalScale(8),
  },
  inputRowFocused: {
    borderBottomColor: Colors.BLUE,
    borderBottomWidth: 2.5,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: scale(12),
    borderRightWidth: 1,
    borderRightColor: "rgba(10,14,26,0.12)",
    marginRight: scale(12),
    gap: scale(8),
  },
  flagCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  callingCode: {
    fontSize: moderateScale(17), // CHANGED
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  phoneInput: {
    flex: 1,
    fontSize: moderateScale(17), // CHANGED
    fontFamily: Fonts.bold,
    color: Colors.INK,
    paddingVertical: 0,
  },
  errorMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(4),
  },
  errorText: {
    fontSize: moderateScale(13), // CHANGED
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    flex: 1,
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
  nextButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: moderateScale(16), // CHANGED
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  nextButtonTextDisabled: {
    opacity: 0.6,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  securityIconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontSize: moderateScale(14), // CHANGED
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    marginBottom: verticalScale(2),
    letterSpacing: 0.2,
  },
  securityText: {
    fontSize: moderateScale(12), // CHANGED
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(16),
  },
});