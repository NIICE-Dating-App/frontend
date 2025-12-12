// components/map_components/EventMarker.tsx
// MaterialCommunityIcons KEPT - NO GRADIENTS
import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { scale } from "@/utils/responsive";
import { BLUE, categoryDisplayNames, eventTypeDisplayNames } from "./constants";
import { EventData } from "./types";
import { styles } from "./styles";

interface EventMarkerProps {
  event: EventData;
}

export const EventMarker: React.FC<EventMarkerProps> = ({ event }) => {
  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  const eventTypeInfo = eventTypeDisplayNames[event.event_type || 'public'];
  const isPrivate = event.event_type === 'private';
  
  return (
    <View style={styles.eventMarkerContainer}>
      <View style={[
        styles.eventMarkerBubble,
        isPrivate && { borderWidth: 2, borderColor: eventTypeInfo.color },
        // Use solid background instead of gradient
        { backgroundColor: isPrivate ? "#F3E8FF" : "#FFFFFF" }
      ]}>
        <MaterialCommunityIcons 
          name={categoryInfo.icon as any} 
          size={20} 
          color={isPrivate ? eventTypeInfo.color : BLUE}
        />
      </View>
      {/* Lock badge positioned outside the bubble */}
      {isPrivate && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: scale(36) / 2 - 14,
          backgroundColor: eventTypeInfo.color,
          borderRadius: 7,
          width: 14,
          height: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: '#FFFFFF',
          zIndex: 10,
        }}>
          <MaterialCommunityIcons name="lock" size={8} color="#FFFFFF" />
        </View>
      )}
      <View style={[
        styles.eventMarkerPin,
        isPrivate && { borderTopColor: eventTypeInfo.color }
      ]} />
    </View>
  );
};