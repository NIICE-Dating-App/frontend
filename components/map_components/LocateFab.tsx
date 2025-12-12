// components/map_components/LocateFab.tsx
// REDESIGNED: Clean locate button - NO GLASS EFFECTS
import React, { memo, useRef, useCallback } from "react";
import { Pressable, Animated as RNAnimated, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale } from "@/utils/responsive";
import { BLUE } from "./constants";
import { styles } from "./styles";

interface LocateFabProps {
  onPress: () => void;
  spin: RNAnimated.AnimatedInterpolation<string>;
  bottom: number;
  right: number;
}

export const LocateFab: React.FC<LocateFabProps> = memo(({ onPress, spin, bottom, right }) => {
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  
  const onIn = useCallback(() => 
    RNAnimated.timing(pressScale, { toValue: 0.95, duration: 70, useNativeDriver: true }).start(), 
    [pressScale]
  );
  
  const onOut = useCallback(() => 
    RNAnimated.spring(pressScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }).start(), 
    [pressScale]
  );

  return (
    <Pressable 
      onPress={onPress} 
      onPressIn={onIn} 
      onPressOut={onOut} 
      style={{ position: "absolute", bottom, right }}
    >
      <RNAnimated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={styles.locateFab}>
          <RNAnimated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="locate" size={scale(24)} color={BLUE} />
          </RNAnimated.View>
        </View>
      </RNAnimated.View>
    </Pressable>
  );
});

// Alias for backward compatibility
export const GlassFab = LocateFab;