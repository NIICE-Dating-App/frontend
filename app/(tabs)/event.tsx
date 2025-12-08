//EVENT.TSX
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

// Theme - matching profile.tsx
const BG = "#FFFFFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

// Event Categories with display names and icons
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

// Event type interface
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
  group_id?: string;
  group_name?: string;
  community_id?: string;
  community_name?: string;
  host_name?: string;
  host_photo_url?: string;
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

// Event Card Component - Horizontal
const EventCardHorizontal: React.FC<{
  event: Event;
  onPress: () => void;
  variant?: "default" | "compact";
}> = ({ event, onPress, variant = "default" }) => {
  const isCompact = variant === "compact";
  const cardWidth = isCompact ? scale(200) : scale(280);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.eventCardHorizontal, { width: cardWidth }]}
    >
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Category Badge */}
      <View style={styles.eventCategoryBadge}>
        <Ionicons
          name={getCategoryIcon(event.category) as any}
          size={12}
          color={BLUE}
        />
        <Text style={styles.eventCategoryText}>
          {getCategoryLabel(event.category)}
        </Text>
      </View>

      {/* Event Info */}
      <View style={styles.eventCardContent}>
        <Text style={styles.eventCardTitle} numberOfLines={2}>
          {event.event_name}
        </Text>

        <View style={styles.eventCardMeta}>
          <View style={styles.eventMetaRow}>
            <Ionicons name="calendar-outline" size={14} color="rgba(10,14,26,0.5)" />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {formatEventDate(event.time_start)}
            </Text>
          </View>

          <View style={styles.eventMetaRow}>
            <Ionicons name="location-outline" size={14} color="rgba(10,14,26,0.5)" />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>

          {event.current_attendees !== undefined && (
            <View style={styles.eventMetaRow}>
              <Ionicons name="people-outline" size={14} color="rgba(10,14,26,0.5)" />
              <Text style={styles.eventMetaText}>
                {event.current_attendees}/{event.capacity} attending
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Accent Line */}
      <View style={styles.eventCardAccent} />
    </TouchableOpacity>
  );
};

// Section Header Component
const SectionHeader: React.FC<{
  title: string;
  onSeeAll?: () => void;
  icon?: string;
}> = ({ title, onSeeAll, icon }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {icon && (
        <Ionicons name={icon as any} size={22} color={BLUE} style={styles.sectionIcon} />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
        <Text style={styles.seeAllText}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Empty State Component
const EmptyState: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}> = ({ icon, title, subtitle, action }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrapper}>
      <Ionicons name={icon as any} size={32} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {action && (
      <TouchableOpacity
        style={styles.emptyAction}
        onPress={action.onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyActionText}>{action.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Main Component
export default function EventScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Event data states
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [groupEvents, setGroupEvents] = useState<Event[]>([]);
  const [communityEvents, setCommunityEvents] = useState<Event[]>([]);

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  // Fetch upcoming events (user has joined)
  const fetchUpcomingEvents = async (userId: string) => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("event_applications")
        .select(`
          event_id,
          events (
            id,
            host_id,
            event_name,
            category,
            event_description,
            location_name,
            time_start,
            time_end,
            capacity,
            status,
            event_type
          )
        `)
        .eq("applicant_id", userId)
        .eq("status", "approved");

      if (error) throw error;

      const events = (data || [])
        .map((item: any) => item.events)
        .filter((event: any) => event && event.status === "active" && new Date(event.time_start) > new Date(now))
        .sort((a: any, b: any) => new Date(a.time_start).getTime() - new Date(b.time_start).getTime());

      // Fetch attendee counts for each event
      const eventsWithCounts = await Promise.all(
        events.map(async (event: any) => {
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

      setUpcomingEvents(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      setUpcomingEvents([]);
    }
  };

  // Fetch nearby events
  const fetchNearbyEvents = async (userId: string, location: { lat: number; lng: number } | null) => {
    try {
      if (!location) {
        setNearbyEvents([]);
        return;
      }

      const { data, error } = await supabase.rpc("get_nearby_events_with_coordinates", {
        p_user_lat: location.lat,
        p_user_lng: location.lng,
        p_radius_meters: 30000, // 30km radius
        p_status: "active",
      });

      if (error) throw error;

      // Filter out events user has already joined and calculate distance
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

      setNearbyEvents(filteredEvents);
    } catch (error) {
      console.error("Error fetching nearby events:", error);
      setNearbyEvents([]);
    }
  };

  // Fetch group events
  const fetchGroupEvents = async (userId: string) => {
    try {
      // First get user's groups
      const { data: userGroups, error: groupsError } = await supabase
        .from("group_members")
        .select("group_id, groups(name)")
        .eq("user_id", userId);

      if (groupsError) throw groupsError;

      if (!userGroups || userGroups.length === 0) {
        setGroupEvents([]);
        return;
      }

      const groupIds = userGroups.map((g: any) => g.group_id);

      // Fetch events for those groups
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("group_id", groupIds)
        .eq("status", "active")
        .eq("event_type", "group_event")
        .gte("time_start", new Date().toISOString())
        .order("time_start", { ascending: true });

      if (error) throw error;

      // Add group names and attendee counts
      const eventsWithDetails = await Promise.all(
        (data || []).map(async (event: any) => {
          const group = userGroups.find((g: any) => g.group_id === event.group_id);
          
          const { count } = await supabase
            .from("event_applications")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "approved");

          return {
            ...event,
            group_name: group?.groups?.name || "Group",
            current_attendees: count || 0,
          };
        })
      );

      setGroupEvents(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching group events:", error);
      setGroupEvents([]);
    }
  };

  // Fetch community events
  const fetchCommunityEvents = async (userId: string) => {
    try {
      // First get user's communities
      const { data: userCommunities, error: communitiesError } = await supabase
        .from("community_members")
        .select("community_id, communities(name)")
        .eq("user_id", userId);

      if (communitiesError) throw communitiesError;

      if (!userCommunities || userCommunities.length === 0) {
        setCommunityEvents([]);
        return;
      }

      const communityIds = userCommunities.map((c: any) => c.community_id);

      // Fetch events for those communities
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .in("community_id", communityIds)
        .eq("status", "active")
        .eq("event_type", "community_event")
        .gte("time_start", new Date().toISOString())
        .order("time_start", { ascending: true });

      if (error) throw error;

      // Add community names and attendee counts
      const eventsWithDetails = await Promise.all(
        (data || []).map(async (event: any) => {
          const community = userCommunities.find((c: any) => c.community_id === event.community_id);
          
          const { count } = await supabase
            .from("event_applications")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "approved");

          return {
            ...event,
            community_name: community?.communities?.name || "Community",
            current_attendees: count || 0,
          };
        })
      );

      setCommunityEvents(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching community events:", error);
      setCommunityEvents([]);
    }
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

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const location = await fetchUserLocation(userId);
      
      await Promise.all([
        fetchUpcomingEvents(userId),
        fetchNearbyEvents(userId, location),
        fetchGroupEvents(userId),
        fetchCommunityEvents(userId),
      ]);
    } catch (error) {
      console.error("Error loading event data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Filter nearby events by category
  const filteredNearbyEvents = useMemo(() => {
    if (selectedCategory === "all") return nearbyEvents;
    return nearbyEvents.filter((event) => event.category === selectedCategory);
  }, [nearbyEvents, selectedCategory]);

  // Navigate to event details
  const navigateToEvent = (eventId: string) => {
    router.push({
      pathname: "/(events)/event_details",
      params: { id: eventId },
    });
  };

  // Navigate to see all screens
  const navigateToUpcomingAll = () => {
    router.push("/(events)/upcoming_events");
  };

  const navigateToNearbyAll = () => {
    router.push("/(events)/nearby_events");
  };

  const navigateToGroupEventsAll = () => {
    router.push("/(events)/group_events");
  };

  const navigateToCommunityEventsAll = () => {
    router.push("/(events)/community_events");
  };

  const navigateToCreateEvent = () => {
    router.push("/(events)/add_event");
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

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Events</Text>
        <TouchableOpacity
          style={styles.createEventButton}
          activeOpacity={0.8}
          onPress={navigateToCreateEvent}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createEventText}>Create</Text>
        </TouchableOpacity>
      </View>

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
        {/* Upcoming Events Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Upcoming Events"
            icon="calendar-outline"
            onSeeAll={upcomingEvents.length > 0 ? navigateToUpcomingAll : undefined}
          />

          {upcomingEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              decelerationRate="fast"
              snapToInterval={scale(290)}
            >
              {upcomingEvents.slice(0, 5).map((event) => (
                <EventCardHorizontal
                  key={event.id}
                  event={event}
                  onPress={() => navigateToEvent(event.id)}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No upcoming events"
              subtitle="Join events to see them here"
              action={{ label: "Explore Events", onPress: navigateToNearbyAll }}
            />
          )}
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
                  size={16}
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

        {/* Events Near You Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Events Near You"
            icon="location-outline"
            onSeeAll={filteredNearbyEvents.length > 0 ? navigateToNearbyAll : undefined}
          />

          {filteredNearbyEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              decelerationRate="fast"
              snapToInterval={scale(290)}
            >
              {filteredNearbyEvents.slice(0, 8).map((event) => (
                <EventCardHorizontal
                  key={event.id}
                  event={event}
                  onPress={() => navigateToEvent(event.id)}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              icon="location-outline"
              title={selectedCategory === "all" ? "No events nearby" : `No ${getCategoryLabel(selectedCategory).toLowerCase()} events nearby`}
              subtitle="Check back later or try a different category"
            />
          )}
        </View>

        {/* Group Events Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Your Group Events"
            icon="people-outline"
            onSeeAll={groupEvents.length > 0 ? navigateToGroupEventsAll : undefined}
          />

          {groupEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              decelerationRate="fast"
              snapToInterval={scale(210)}
            >
              {groupEvents.slice(0, 5).map((event) => (
                <View key={event.id}>
                  <EventCardHorizontal
                    event={event}
                    onPress={() => navigateToEvent(event.id)}
                    variant="compact"
                  />
                  {event.group_name && (
                    <View style={styles.groupBadge}>
                      <Ionicons name="people" size={12} color={BLUE} />
                      <Text style={styles.groupBadgeText} numberOfLines={1}>
                        {event.group_name}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No group events"
              subtitle="Join a group to see their events"
            />
          )}
        </View>

        {/* Community Events Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Community Events"
            icon="globe-outline"
            onSeeAll={communityEvents.length > 0 ? navigateToCommunityEventsAll : undefined}
          />

          {communityEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              decelerationRate="fast"
              snapToInterval={scale(210)}
            >
              {communityEvents.slice(0, 5).map((event) => (
                <View key={event.id}>
                  <EventCardHorizontal
                    event={event}
                    onPress={() => navigateToEvent(event.id)}
                    variant="compact"
                  />
                  {event.community_name && (
                    <View style={styles.communityBadge}>
                      <Ionicons name="globe" size={12} color="#10B981" />
                      <Text style={styles.communityBadgeText} numberOfLines={1}>
                        {event.community_name}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              icon="globe-outline"
              title="No community events"
              subtitle="Join a community to see their events"
            />
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: verticalScale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
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

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(12),
    backgroundColor: BG,
  },

  pageTitle: {
    fontSize: scale(28),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },

  createEventButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  createEventText: {
    marginLeft: scale(4),
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: verticalScale(8),
  },

  section: {
    marginBottom: verticalScale(24),
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(12),
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    marginRight: scale(8),
  },

  sectionTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },

  seeAllText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.3,
  },

  horizontalScroll: {
    paddingHorizontal: scale(20),
    gap: scale(12),
  },

  // Event Card Horizontal
  eventCardHorizontal: {
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    padding: scale(14),
    minHeight: verticalScale(140),
  },

  eventCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(12),
    alignSelf: "flex-start",
    marginBottom: verticalScale(10),
  },

  eventCategoryText: {
    marginLeft: scale(4),
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.2,
  },

  eventCardContent: {
    flex: 1,
  },

  eventCardTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
    marginBottom: verticalScale(8),
  },

  eventCardMeta: {
    gap: verticalScale(4),
  },

  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },

  eventMetaText: {
    flex: 1,
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
  },

  eventCardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(4),
    backgroundColor: BLUE,
    borderTopLeftRadius: scale(16),
    borderBottomLeftRadius: scale(16),
  },

  // Category Section
  categorySection: {
    marginBottom: verticalScale(16),
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
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
    gap: scale(6),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },

  categoryChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  categoryChipText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.2,
  },

  categoryChipTextActive: {
    color: "#FFFFFF",
  },

  // Group/Community Badges
  groupBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    marginTop: verticalScale(6),
    marginHorizontal: scale(4),
    gap: scale(4),
  },

  groupBadgeText: {
    flex: 1,
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    color: BLUE,
  },

  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    marginTop: verticalScale(6),
    marginHorizontal: scale(4),
    gap: scale(4),
  },

  communityBadgeText: {
    flex: 1,
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    color: "#10B981",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(32),
    paddingHorizontal: scale(20),
    marginHorizontal: scale(20),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
    borderStyle: "dashed",
  },

  emptyIconWrapper: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(12),
  },

  emptyTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(4),
  },

  emptySubtitle: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },

  emptyAction: {
    backgroundColor: BLUE,
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(20),
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  emptyActionText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});