// see_all.tsx - All Upcoming Events (Hosting + Joining)
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
  current_attendees?: number;
  isHosting?: boolean;
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

const getCategoryIcon = (category: string): string => {
  const found = EVENT_CATEGORIES.find((c) => c.key === category);
  return found?.icon || "calendar";
};

const getCategoryLabel = (category: string): string => {
  const found = EVENT_CATEGORIES.find((c) => c.key === category);
  return found?.label || "Event";
};

// Event Card Component - Grid version
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
      
      {/* Status Badge */}
      {event.isHosting && (
        <View style={styles.hostingBadge}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.hostingBadgeText}>Hosting</Text>
        </View>
      )}
      
      {!event.isHosting && (
        <View style={styles.joiningBadge}>
          <Ionicons name="checkmark-circle" size={10} color="#10B981" />
          <Text style={styles.joiningBadgeText}>Joined</Text>
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
      <View style={[styles.cardAccent, event.isHosting && styles.cardAccentHosting]} />
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

export default function SeeAllUpcomingEvents() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch all upcoming events (hosting + joining)
  const fetchAllUpcomingEvents = async (userId: string) => {
    try {
      const now = new Date().toISOString();

      // Fetch events user is hosting
      const { data: hostedEvents, error: hostError } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", userId)
        .eq("status", "active")
        .gte("time_start", now)
        .order("time_start", { ascending: true });

      if (hostError) throw hostError;

      // Fetch events user has joined
      const { data: joinedData, error: joinError } = await supabase
        .from("event_applications")
        .select(`
          event_id,
          events (*)
        `)
        .eq("applicant_id", userId)
        .eq("status", "approved");

      if (joinError) throw joinError;

      const joinedEvents = (joinedData || [])
        .map((item: any) => item.events)
        .filter((event: any) => 
          event && 
          event.status === "active" && 
          new Date(event.time_start) > new Date(now) &&
          event.host_id !== userId // Exclude events user is hosting
        );

      // Add attendee counts for all events
      const allEvents = [
        ...(hostedEvents || []).map((e: any) => ({ ...e, isHosting: true })),
        ...joinedEvents.map((e: any) => ({ ...e, isHosting: false })),
      ];

      const eventsWithCounts = await Promise.all(
        allEvents.map(async (event: any) => {
          const { count } = await supabase
            .from("event_applications")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "approved");

          return {
            ...event,
            current_attendees: count || 0,
          };
        })
      );

      // Sort by time_start
      eventsWithCounts.sort((a, b) => 
        new Date(a.time_start).getTime() - new Date(b.time_start).getTime()
      );

      setEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      setEvents([]);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      setCurrentUserId(userId);
      await fetchAllUpcomingEvents(userId);
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
        <Text style={styles.headerTitle}>Upcoming Events</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Events Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {events.length} {events.length === 1 ? "event" : "events"}
        </Text>
      </View>

      {events.length > 0 ? (
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
            {events.map((event, index) => (
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
          icon="calendar-outline"
          title="No upcoming events"
          subtitle="Create an event or join one to see it here"
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
    minHeight: verticalScale(160),
  },
  hostingBadge: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(6),
    borderRadius: scale(8),
    gap: scale(3),
  },
  hostingBadgeText: {
    fontSize: scale(9),
    fontFamily: Fonts.bold,
    color: "#F59E0B",
  },
  joiningBadge: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(6),
    borderRadius: scale(8),
    gap: scale(3),
  },
  joiningBadgeText: {
    fontSize: scale(9),
    fontFamily: Fonts.bold,
    color: "#10B981",
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
  cardAccentHosting: {
    backgroundColor: "#F59E0B",
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