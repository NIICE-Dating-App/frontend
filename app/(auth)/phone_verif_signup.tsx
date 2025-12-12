import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive"; // ADDED moderateScale
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
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

export default function VerifSignup() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6 && !isVerifying) {
      handleVerify();
    }
  }, [code]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");
    
    if (digit.length === 0) {
      // Backspace - clear current and move to previous
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      setError("");
      
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    
    // Set digit
    const newCode = [...code];
    newCode[index] = digit[0];
    setCode(newCode);
    setError("");
    
    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Last digit - dismiss keyboard
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      // If current box is empty and backspace pressed, focus previous
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) return;
    
    setIsVerifying(true);
    setError("");
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate success (90%) or error (10%)
    const success = Math.random() > 0.1;
    
    if (success) {
      router.push("/email_signup");
    } else {
      // Show error and shake
      setError("Invalid code. Please try again.");
      setIsVerifying(false);
      
      // Shake animation
      RNAnimated.sequence([
        RNAnimated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        RNAnimated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      
      // Clear code
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setCooldown(30);
    setError("");
    setCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  const isComplete = code.every(digit => digit.length > 0);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
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
              <Text style={styles.pageTitle}>Enter your code</Text>
              <Text style={styles.pageSubtitle}>
                We sent a 6-digit code to your phone
              </Text>
            </View>

            {/* Code Input Boxes */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              
              <RNAnimated.View 
                style={[
                  styles.codeBoxesContainer,
                  { transform: [{ translateX: shakeAnim }] }
                ]}
              >
                {code.map((digit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.codeBox,
                      digit.length > 0 && styles.codeBoxFilled,
                      error && styles.codeBoxError,
                    ]}
                  >
                    <TextInput
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      value={digit}
                      onChangeText={(value) => handleCodeChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={styles.codeBoxInput}
                      textAlign="center"
                      selectTextOnFocus
                      editable={!isVerifying}
                      selectionColor={Colors.BLUE}
                    />
                    {digit.length > 0 && (
                      <View style={styles.codeBoxDot} />
                    )}
                  </View>
                ))}
              </RNAnimated.View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={scale(16)} color={Colors.BLUE} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Resend Button */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || isVerifying}
              style={styles.resendButton}
              activeOpacity={0.7}
            >
              <View style={[
                styles.resendIconCircle,
                cooldown > 0 && styles.resendIconCircleDisabled
              ]}>
                <Ionicons
                  name="refresh"
                  size={scale(16)}
                  color={cooldown > 0 ? "rgba(27,68,205,0.4)" : Colors.BLUE}
                />
              </View>
              <Text
                style={[
                  styles.resendText,
                  cooldown > 0 && styles.resendDisabled,
                ]}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.nextButton,
                (!isComplete || isVerifying) && styles.nextButtonDisabled
              ]}
              onPress={handleVerify}
              disabled={!isComplete || isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <View style={styles.verifyingContainer}>
                  <RNAnimated.View style={styles.spinner}>
                    <Ionicons name="sync" size={scale(20)} color="#FFFFFF" />
                  </RNAnimated.View>
                  <Text style={styles.nextButtonText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.nextButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <View style={styles.infoIconCircle}>
                <Ionicons
                  name="information-circle"
                  size={scale(18)}
                  color={Colors.BLUE}
                />
              </View>
              <Text style={styles.infoNoteText}>
                Didn't receive the code? Check your spam folder or try resending
              </Text>
            </View>
          </View>
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
    marginBottom: verticalScale(24),
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
    marginBottom: verticalScale(16),
    letterSpacing: 0.3,
  },
  codeBoxesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(8),
  },
  codeBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: scale(50),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: "rgba(27,68,205,0.15)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  codeBoxFilled: {
    backgroundColor: "rgba(27,68,205,0.08)",
    borderColor: Colors.BLUE,
    borderWidth: 2.5,
  },
  codeBoxError: {
    borderColor: "rgba(27,68,205,0.4)",
    backgroundColor: "rgba(27,68,205,0.06)",
  },
  codeBoxInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    fontSize: moderateScale(24), // CHANGED
    fontFamily: Fonts.bold,
    color: "transparent",
  },
  codeBoxDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: Colors.BLUE,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(12),
    paddingHorizontal: scale(4),
  },
  errorText: {
    fontSize: moderateScale(13), // CHANGED
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    flex: 1,
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(24),
    gap: scale(8),
  },
  resendIconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  resendIconCircleDisabled: {
    backgroundColor: "rgba(27,68,205,0.04)",
  },
  resendText: {
    fontSize: moderateScale(15), // CHANGED
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    letterSpacing: 0.2,
  },
  resendDisabled: {
    color: "rgba(27,68,205,0.4)",
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
  verifyingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  spinner: {
    // Rotation animation can be added if needed
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  infoIconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoNoteText: {
    flex: 1,
    fontSize: moderateScale(12), // CHANGED
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(16),
    paddingTop: verticalScale(6),
  },
});