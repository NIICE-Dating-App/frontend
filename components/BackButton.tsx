import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

interface BackButtonProps {
  color?: string;   // icon color
  backgroundColor?: string; // circle background
  size?: number;    // icon size
  onPress?: () => void; // custom handler if needed
  style?: object;   // allow extra styling
}

export const BackButton: React.FC<BackButtonProps> = ({
  color = "#FFFFFF",
  backgroundColor = "#000910",
  size = 24,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress ? onPress : () => router.back()}
    >
      <Ionicons name="chevron-back" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
