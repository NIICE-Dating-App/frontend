// components/map_components/FilterButton.tsx
// REDESIGNED: Clean filter button - NO GLASS EFFECTS
import React, { memo, useRef, useCallback } from "react";
import { View, Pressable, Animated as RNAnimated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale } from "@/utils/responsive";
import { BLUE, CARD_BG } from "./constants";
import { styles } from "./styles";

interface FilterButtonProps {
  onPress: () => void;
  hasActiveFilters: boolean;
}

export const FilterButton: React.FC<FilterButtonProps> = memo(({ onPress, hasActiveFilters }) => {
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
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
      <RNAnimated.View style={{ transform: [{ scale: pressScale }] }}>
        <View style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}>
          <Ionicons 
            name="options-outline" 
            size={scale(22)} 
            color={hasActiveFilters ? CARD_BG : BLUE} 
          />
          {hasActiveFilters && <View style={styles.filterBtnDot} />}
        </View>
      </RNAnimated.View>
    </Pressable>
  );
});