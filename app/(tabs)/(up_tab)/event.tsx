// app/(tabs)/(up_tab)/event.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const BG = Colors.BG;
const INK = Colors.INK; // simple string (e.g. "#0A0E1A")
const BLUE = Colors.BLUE;

type NiiceEvent = {
  id: string;
  creator_id: string | null;
  event_name: string;
  category: string | null;
  description: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  time_start: string;
  time_end: string;
  created_at: string;
};

export default function EventsScreen() {
  const [events, setEvents] = useState<NiiceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      console.log("🔍 Fetching events list...");
      setLoading(true);

      const nowIso = new Date().toISOString();

      // IMPORTANT: no RPC, no SQL function calls here.
      // We only read directly from the "events" table.
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          creator_id,
          event_name,
          category,
          description,
          location_name,
          location_lat,
          location_lng,
          time_start,
          time_end,
          created_at
        `
        )
        // Only future / ongoing events
        .gte("time_end", nowIso)
        // Soonest events first
        .order("time_start", { ascending: true });

      if (error) {
        console.log(
          "❌ Error fetching events list:",
          JSON.stringify(error, null, 2)
        );
        return;
      }

      const safeEvents = (data ?? []) as NiiceEvent[];
      setEvents(safeEvents);
      console.log(`✅ Loaded ${safeEvents.length} events`);
    } catch (err: any) {
      console.log(
        "❌ Error fetching events list (JS):",
        JSON.stringify(err, null, 2)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // refresh events whenever screen gains focus
      fetchEvents();
    }, [fetchEvents])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="calendar-outline" size={scale(32)} color={BLUE} />
        </View>
        <Text style={styles.emptyTitle}>No events yet</Text>
        <Text style={styles.emptySubtitle}>
          Create an event from the map screen and it will appear here.
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: NiiceEvent }) => {
    const start = new Date(item.time_start);
    const end = new Date(item.time_end);

    const dateLabel = start.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

    const timeLabel =
      start.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " – " +
      end.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });

    return (
      <TouchableOpacity activeOpacity={0.7} style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.category ? item.category.replace("_", " ") : "event"}
            </Text>
          </View>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.event_name}
        </Text>

        {item.description ? (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardFooterRow}>
          <View style={styles.locationRow}>
            <Ionicons
              name="location-sharp"
              size={scale(14)}
              color={BLUE}
              style={{ marginRight: scale(4) }}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location_name || "Location TBA"}
            </Text>
          </View>

          <View style={styles.timePill}>
            <Ionicons
              name="time-outline"
              size={scale(14)}
              color={INK}
              style={{ marginRight: scale(4) }}
            />
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Events</Text>
          <View style={styles.headerIconRight}>
            <Ionicons name="calendar-outline" size={scale(22)} color={INK} />
          </View>
        </View>

        {/* Content */}
        {loading && events.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={BLUE} />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              events.length === 0 ? styles.listEmptyContent : styles.listContent
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  screenTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
  },
  headerIconRight: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: verticalScale(24),
  },
  listEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: verticalScale(24),
  },
  card: {
    backgroundColor: BG,
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(10),
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(6),
  },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(999),
    backgroundColor: BLUE,
  },
  badgeText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: "#ffffff",
    textTransform: "uppercase",
  },
  dateLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
    opacity: 0.7,
  },
  eventTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    marginBottom: verticalScale(4),
  },
  eventDescription: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: INK,
    opacity: 0.8,
    marginBottom: verticalScale(8),
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(8),
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: scale(4),
  },
  locationText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(999),
    backgroundColor: BG,
  },
  timeText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: INK,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  emptyIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
    marginBottom: verticalScale(12),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    marginBottom: verticalScale(4),
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: INK,
    opacity: 0.8,
    textAlign: "center",
  },
});
