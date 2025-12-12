// see_all_nearby.tsx - All Nearby Events with distance
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - scale(20) * 2 - scale(12)) / 2;

// Theme
const BG = "#FFFFFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

// Event Categories
const EVENT_CATEGORIES = [
  { key: "all", label: "All", icon: "apps" },
  { key: "food_drinks", label: "Food & Drinks", icon: "restaurant" },
  { key: "nightlife_party", label: "Nightlife", icon: "moon" },
  { key: "outdoors_nature", label: "Outdoors", icon: "leaf" },
  { key: "sports_fitness", label: "Sports", icon: "fitness" },
  { key: "games_hobbies", label: "Games", icon: "game-controller" },
  { key: "arts_culture_entertainment", label: "Arts & Culture", icon: "color-palette" },
  { key: "learning_career", label: "Learning", icon: "school" },
  { key: "community_volunteering", label: "Volunteering", icon: "heart" },
  { key: "romantic_dating", label: "Dating", icon: "heart-circle" },
  { key: "travel_adventure", label: "Travel", icon: "airplane" },
  { key: "online_virtual", label: "Online", icon: "globe" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal" },
] as const;

interface Event {
  id: string;
  host_id: string;
  event_name: string;
  category: string;
  event_description: string;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  status: string;
  event_type: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  current_attendees?: number;
}

// Utils
const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (isTomorrow) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)}km away`;
};

const getCategoryIcon = (category: string): string => {
  const found = EVENT_CATEGORIES.find((c) => c.key === category);
  return found?.icon || "calendar";
};

const getCategoryLabel = (category: string): string => {
  const found = EVENT_CATEGORIES.find((c) => c.key === category);
  return found?.label || "Event";
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Event Card Component - Grid version with distance
const EventCardGrid: React.FC<{
  event: Event;
  onPress: () => void;
}> = ({ event, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.eventCard}
    >
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Distance Badge */}
      {event.distance_km !== undefined && (
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate" size={10} color={BLUE} />
          <Text style={styles.distanceBadgeText}>
            {formatDistance(event.distance_km)}
          </Text>
        </View>
      )}
      
      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Ionicons
          name={getCategoryIcon(event.category) as any}
          size={11}
          color={BLUE}
        />
        <Text style={styles.categoryText}>
          {getCategoryLabel(event.category)}
        </Text>
      </View>

      {/* Event Info */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {event.event_name}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color="rgba(10,14,26,0.5)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {formatEventDate(event.time_start)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="rgba(10,14,26,0.5)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>

          {event.current_attendees !== undefined && (
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color="rgba(10,14,26,0.5)" />
              <Text style={styles.metaText}>
                {event.current_attendees}/{event.capacity}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Accent Line */}
      <View style={styles.cardAccent} />
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrapper}>
      <Ionicons name={icon as any} size={40} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

export default function SeeAllNearbyEvents() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categoryScrollRef = useRef<ScrollView>(null);

  // Fetch user location from profile
  const fetchUserLocation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("lat, lng")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data?.lat && data?.lng) {
        setUserLocation({ lat: data.lat, lng: data.lng });
        return { lat: data.lat, lng: data.lng };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user location:", error);
      return null;
    }
  };

  // Fetch nearby events
  const fetchNearbyEvents = async (location: { lat: number; lng: number } | null) => {
    try {
      if (!location) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase.rpc("get_nearby_events_with_coordinates", {
        p_user_lat: location.lat,
        p_user_lng: location.lng,
        p_radius_meters: 50000, // 50km radius for See All
        p_status: "active",
      });

      if (error) throw error;

      const filteredEvents = (data || [])
        .filter((event: any) => new Date(event.time_start) > new Date())
        .map((event: any) => ({
          ...event,
          current_attendees: event.accepted_count || 0,
          distance_km: calculateDistance(
            location.lat,
            location.lng,
            event.latitude,
            event.longitude
          ),
        }))
        .sort((a: any, b: any) => a.distance_km - b.distance_km);

      setEvents(filteredEvents);
    } catch (error) {
      console.error("Error fetching nearby events:", error);
      setEvents([]);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const location = await fetchUserLocation(userId);
      await fetchNearbyEvents(location);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filter events by category
  const filteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter((event) => event.category === selectedCategory);
  }, [events, selectedCategory]);

  const navigateToEvent = (eventId: string) => {
    router.push({
      pathname: "/(events)/event_details",
      params: { id: eventId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events Near You</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Category Filter */}
      <View style={styles.categorySection}>
        <ScrollView
          ref={categoryScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {EVENT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.key}
              activeOpacity={0.8}
              onPress={() => setSelectedCategory(category.key)}
              style={[
                styles.categoryChip,
                selectedCategory === category.key && styles.categoryChipActive,
              ]}
            >
              <Ionicons
                name={category.icon as any}
                size={14}
                color={selectedCategory === category.key ? "#FFFFFF" : BLUE}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category.key && styles.categoryChipTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"} nearby
        </Text>
      </View>

      {filteredEvents.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
              colors={[BLUE]}
            />
          }
        >
          <View style={styles.grid}>
            {filteredEvents.map((event) => (
              <EventCardGrid
                key={event.id}
                event={event}
                onPress={() => navigateToEvent(event.id)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <EmptyState
          icon="location-outline"
          title={selectedCategory === "all" ? "No events nearby" : `No ${getCategoryLabel(selectedCategory).toLowerCase()} events nearby`}
          subtitle="Check back later or try a different category"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.06)",
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(20),
    backgroundColor: "rgba(10,14,26,0.04)",
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  headerRight: {
    width: scale(40),
  },
  categorySection: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.06)",
  },
  categoryScroll: {
    paddingHorizontal: scale(20),
    gap: scale(8),
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    gap: scale(4),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },
  categoryChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  categoryChipText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.2,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  countText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(100),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(12),
  },
  eventCard: {
    width: CARD_WIDTH,
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    padding: scale(12),
    minHeight: verticalScale(175),
  },
  distanceBadge: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.1)",
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(6),
    borderRadius: scale(8),
    gap: scale(3),
  },
  distanceBadgeText: {
    fontSize: scale(9),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(6),
    borderRadius: scale(10),
    alignSelf: "flex-start",
    marginBottom: verticalScale(8),
    gap: scale(3),
  },
  categoryText: {
    fontSize: scale(10),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
    marginBottom: verticalScale(8),
  },
  cardMeta: {
    gap: verticalScale(4),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  metaText: {
    flex: 1,
    fontSize: scale(11),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(3),
    backgroundColor: BLUE,
    borderTopLeftRadius: scale(16),
    borderBottomLeftRadius: scale(16),
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(40),
  },
  emptyIconWrapper: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
  },
});