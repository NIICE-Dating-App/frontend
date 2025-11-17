import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

// Theme constants
const BLUE = "#1B44CD";

interface GradientButtonProps {
  text: string;
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  text,
  onPress,
  colors = [BLUE, "#2E54E8"] as const,
  style,
  textStyle,
  disabled = false,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      RNAnimated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 150,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      disabled={disabled}
      style={[styles.container, style]}
    >
      <RNAnimated.View
        style={[
          styles.buttonWrapper,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabledWrapper,
        ]}
      >
        <LinearGradient
          colors={disabled ? (["#CCC", "#AAA"] as const) : colors}
          style={styles.gradient}
        >
          <Text style={[styles.text, textStyle]}>{text}</Text>
        </LinearGradient>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: scale(24),
    overflow: "hidden",
  },
  buttonWrapper: {
    borderRadius: scale(24),
    overflow: "hidden",
  },
  gradient: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  disabledWrapper: {
    opacity: 0.6,
  },
});