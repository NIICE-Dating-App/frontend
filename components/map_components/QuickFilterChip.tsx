// components/map_components/QuickFilterChip.tsx
// Quick filter chip component - small rectangular chips for fast filtering
import React, { memo, useRef, useCallback } from "react";
import { Pressable, Text, Animated as RNAnimated } from "react-native";
import { scale, verticalScale } from "@/utils/responsive";
import { Fonts } from "@/constants/theme";
import { BLUE, CARD_BG, BORDER, INK } from "./constants";
import { blue } from "react-native-reanimated/lib/typescript/Colors";

interface QuickFilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export const QuickFilterChip: React.FC<QuickFilterChipProps> = memo(({ label, active, onPress }) => {
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  
  const onIn = useCallback(() => 
    RNAnimated.timing(pressScale, { toValue: 0.97, duration: 70, useNativeDriver: true }).start(), 
    [pressScale]
  );
  
  const onOut = useCallback(() => 
    RNAnimated.spring(pressScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }).start(), 
    [pressScale]
  );

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <RNAnimated.View style={[
        {
          paddingHorizontal: scale(14),
          paddingVertical: verticalScale(8),
          borderRadius: scale(20),
          backgroundColor: active ? "rgba(27, 68, 205, 0.08)" : CARD_BG,
          borderWidth: 1,
          borderColor: BLUE,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        { transform: [{ scale: pressScale }] }
      ]}>
        <Text style={{
          fontFamily: Fonts.bold,
          fontSize: scale(13),
          color: active ? BLUE : BLUE,
          letterSpacing: 0.2,
        }}>
          {label}
        </Text>
      </RNAnimated.View>
    </Pressable>
  );
});