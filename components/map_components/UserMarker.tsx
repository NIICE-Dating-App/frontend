// components/map_components/UserMarker.tsx
// MODERN REDESIGN: Clean age badge with better spacing and visual hierarchy
import React, { memo } from "react";
import { View, Image, Text } from "react-native";
import { Fonts } from "@/constants/theme";
import { BLUE, BLUES, CARD_BG, INK } from "./constants";
import { UserMapCard } from "./types";
import { scale } from "@/utils/responsive";
import { blue } from "react-native-reanimated/lib/typescript/Colors";

interface UserMarkerProps {
  user: UserMapCard;
  hasFrame: boolean;
}

export const UserMarker: React.FC<UserMarkerProps> = memo(({ user, hasFrame }) => {
  const USER_MARKER_SIZE = scale(48);
  const USER_RING_SIZE = scale(54);
  
  // Check if user is currently online (active in last 2 minutes)
  const isOnline = user.last_seen && 
    (Date.now() - new Date(user.last_seen).getTime()) < 2 * 60 * 1000;
  
  return (
  <View style={{ alignItems: "center", justifyContent: "center", width: scale(64), height: scale(72) }}>
    {/* Online indicator dot */}
    {isOnline && (
      <View style={{
        position: "absolute",
        top: 0,
        right: scale(8),
        width: scale(12),
        height: scale(12),
        borderRadius: scale(6),
        backgroundColor: "#22C55E",
        borderWidth: 2,
        borderColor: CARD_BG,
        zIndex: 10,
      }} />
    )}
    
    {/* Frame indicator ring wrapping avatar (matches niices.tsx style) */}
    {hasFrame ? (
      <View style={{
        width: USER_RING_SIZE,
        height: USER_RING_SIZE,
        borderRadius: USER_RING_SIZE / 2,
        borderWidth: 2,
        borderColor: BLUE,
        padding: 2,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {user.main_photo_url ? (
          <Image
            source={{ uri: user.main_photo_url }}
            resizeMode="cover"
            style={{
              width: USER_MARKER_SIZE,
              height: USER_MARKER_SIZE,
              borderRadius: USER_MARKER_SIZE / 2,
              backgroundColor: CARD_BG,
              opacity: isOnline ? 1 : 0.9,
            }}
          />
        ) : (
          <View style={{
            width: USER_MARKER_SIZE,
            height: USER_MARKER_SIZE,
            borderRadius: USER_MARKER_SIZE / 2,
            backgroundColor: BLUES.b120,
            alignItems: "center",
            justifyContent: "center",
            opacity: isOnline ? 1 : 0.9,
          }}>
            <Text style={{
              fontSize: scale(16),
              fontFamily: Fonts.bold,
              color: BLUE,
            }}>
              {user.full_name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </View>
    ) : (
      <>
        {/* User photo without frame ring */}
        {user.main_photo_url ? (
          <Image
            source={{ uri: user.main_photo_url }}
            resizeMode="cover"
            style={{
              width: USER_MARKER_SIZE,
              height: USER_MARKER_SIZE,
              borderRadius: USER_MARKER_SIZE / 2,
              backgroundColor: CARD_BG,
              borderWidth: 0.8,
              borderColor: BLUE,
              opacity: isOnline ? 1 : 0.9,
            }}
          />
        ) : (
          <View style={{
            width: USER_MARKER_SIZE,
            height: USER_MARKER_SIZE,
            borderRadius: USER_MARKER_SIZE / 2,
            backgroundColor: BLUES.b120,
            borderWidth: 2,
            borderColor: BLUE,
            alignItems: "center",
            justifyContent: "center",
            opacity: isOnline ? 1 : 0.9,
          }}>
            <Text style={{
              fontSize: scale(16),
              fontFamily: Fonts.bold,
              color: BLUE,
            }}>
              {user.full_name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </>
    )}
    
    {/* REDESIGNED Age badge - Modern card style */}
    <View style={{
      position: "absolute",
      bottom: 0,
      width: scale(28),
      height: scale(18),
      backgroundColor: CARD_BG,
      paddingHorizontal: scale(8),
      paddingVertical: scale(4),
      borderRadius: scale(999), // Fully rounded pill shape
      borderWidth: 1,
      borderColor: BLUE,
      minWidth: scale(28),
      alignItems: "center",
      justifyContent: "center",
      // Modern shadow
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
      paddingTop: scale(-9),
      paddingLeft: scale(8),
      marginBottom: scale(3),
      paddingBottom: scale(2),
      paddingRight: scale(7.5),
    }}>
      <Text style={{
        fontSize: scale(9),
        fontFamily: Fonts.bold,
        color: INK,
        letterSpacing: 0.2,
      }}>
        {user.age}
      </Text>
    </View>
  </View>
);
});