// components/map_components/CreateEventButton.tsx
// REDESIGNED: Clean circular button replacing diamond shape - NO GRADIENTS
import React, { memo, forwardRef, useRef, useCallback } from "react";
import { View, Pressable, Animated as RNAnimated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale } from "@/utils/responsive";
import { CARD_BG } from "./constants";
import { styles } from "./styles";

interface CreateEventButtonProps {
  onPress: () => void;
}

export const CreateEventButton = memo(forwardRef<View, CreateEventButtonProps>(({ onPress }, ref) => {
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
    <View ref={ref} collapsable={false}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <RNAnimated.View style={{ transform: [{ scale: pressScale }] }}>
          <View style={styles.createEventBtn}>
            <Ionicons name="add" size={scale(28)} color={CARD_BG} />
          </View>
        </RNAnimated.View>
      </Pressable>
    </View>
  );
}));

// Alias for backward compatibility
export const PlusChipDiamond = CreateEventButton;