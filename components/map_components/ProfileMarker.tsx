// components/map_components/ProfileMarker.tsx
// REDESIGNED: Clean profile marker - NO GRADIENTS
import React, { memo } from "react";
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, Path, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { PulseRing } from "./PulseRing";
import { MARKER_BOX, PHOTO_SIZE, RING_SIZE, RING_OFFSET, BLUE, BLUES, CARD_BG } from "./constants";
import { scale } from "@/utils/responsive";

// Direction Cone Component
const DirectionCone: React.FC<{ degrees: number }> = memo(({ degrees }) => (
  <View style={{ position: "absolute", width: MARKER_BOX, height: MARKER_BOX, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
    <View style={{ transform: [{ rotate: `${degrees}deg` }], alignItems: "center", justifyContent: "center" }}>
      <Svg width={scale(96)} height={scale(96)} viewBox="0 0 96 96">
        <Defs>
          <SvgLinearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(27,68,205,0.26)" />
            <Stop offset="1" stopColor="rgba(27,68,205,0.02)" />
          </SvgLinearGradient>
        </Defs>
        <Path d="M48 5 L64 42 L32 42 Z" fill="url(#cone)" />
      </Svg>
    </View>
  </View>
));

interface ProfileMarkerProps {
  photoUrl: string | null;
  headingDeg?: number;
}

export const ProfileMarker: React.FC<ProfileMarkerProps> = memo(({ photoUrl, headingDeg = 0 }) => (
  <View
    style={{
      width: MARKER_BOX, 
      height: MARKER_BOX, 
      alignItems: "center", 
      justifyContent: "center",
    }}
    collapsable={false} 
    pointerEvents="none"
  >
    <DirectionCone degrees={headingDeg} />
    <PulseRing size={RING_SIZE} delay={0} left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={800} ringColor="rgba(27,68,205,0.18)" left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={1600} ringColor="rgba(27,68,205,0.12)" left={RING_OFFSET} top={RING_OFFSET} />

    <View style={{ 
      width: PHOTO_SIZE, 
      height: PHOTO_SIZE, 
      borderRadius: PHOTO_SIZE / 2, 
      borderWidth: 3, 
      borderColor: BLUE,
      backgroundColor: CARD_BG,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }} 
          resizeMode="cover"
          style={{ 
            width: PHOTO_SIZE - 6, 
            height: PHOTO_SIZE - 6, 
            borderRadius: (PHOTO_SIZE - 6) / 2 
          }}
        />
      ) : (
        <View style={{ 
          width: PHOTO_SIZE - 6, 
          height: PHOTO_SIZE - 6, 
          borderRadius: (PHOTO_SIZE - 6) / 2, 
          backgroundColor: BLUES.b100,
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Ionicons name="person" size={scale(24)} color={CARD_BG} />
        </View>
      )}
    </View>
  </View>
));