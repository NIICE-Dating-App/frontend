import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BORDER = "rgba(27, 68, 205, 0.08)";

interface InfoRowProps {
  label: string;
  value: string;
  onPress?: () => void;
  showArrow?: boolean;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  onPress,
  showArrow = false,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      RNAnimated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }
  };

  const content = (
    <RNAnimated.View
      style={[styles.infoRow, { transform: [{ scale: scaleAnim }] }]}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text
          style={[
            styles.infoValue,
            !value.includes("Add") && styles.infoValueSet,
          ]}
        >
          {value}
        </Text>
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color="rgba(10,14,26,0.3)"
            style={{ marginLeft: scale(8) }}
          />
        )}
      </View>
    </RNAnimated.View>
  );

  return onPress ? (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {content}
    </TouchableOpacity>
  ) : (
    content
  );
};

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  infoLabel: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.7)",
  },
  infoRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoValue: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },
  infoValueSet: {
    fontFamily: Fonts.bold,
    color: INK,
  },
});