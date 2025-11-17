import { scale, verticalScale } from "@/utils/responsive";
import React from "react";
import { StyleSheet, View } from "react-native";

interface ModalHandleProps {
  color?: string;
}

export const ModalHandle: React.FC<ModalHandleProps> = ({
  color = "rgba(10,14,26,0.15)",
}) => (
  <View style={[styles.handle, { backgroundColor: color }]} />
);

const styles = StyleSheet.create({
  handle: {
    width: scale(36),
    height: verticalScale(4),
    borderRadius: scale(2),
    alignSelf: "center",
    marginTop: verticalScale(12),
  },
});