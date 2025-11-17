import { scale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
    Animated as RNAnimated,
    StyleSheet,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

// Theme constants
const BLUE = "#1B44CD";

interface CircularIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
  useGradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  disabled?: boolean;
}

export const CircularIconButton: React.FC<CircularIconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  backgroundColor = BLUE,
  useGradient = false,
  gradientColors = [BLUE, "#2E54E8"] as const,
  style,
  disabled = false,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const scaledSize = scale(size);

  const handlePressIn = () => {
    if (!disabled) {
      RNAnimated.spring(scaleAnim, {
        toValue: 0.9,
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

  const buttonStyle = {
    width: scaledSize,
    height: scaledSize,
    borderRadius: scaledSize / 2,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      disabled={disabled}
      style={style}
    >
      <RNAnimated.View
        style={[
          buttonStyle,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.disabled,
        ]}
      >
        {useGradient ? (
          <LinearGradient
            colors={disabled ? (["#CCC", "#AAA"] as const) : gradientColors}
            style={[styles.content, buttonStyle]}
          >
            {icon}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.content,
              buttonStyle,
              {
                backgroundColor: disabled ? "#CCC" : backgroundColor,
              },
            ]}
          >
            {icon}
          </View>
        )}
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
});