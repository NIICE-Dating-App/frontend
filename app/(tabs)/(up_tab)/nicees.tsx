// app/(tabs)/(up_tab)/nicees.tsx

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  Image,
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
const INK = Colors.INK;
const BLUE = Colors.BLUE;

type FilterKey = "recent" | "your_type" | "last_active" | "nearby";

type NiiceMatch = {
  id: string;
  other_user_id: string;
  full_name: string;
  age: number | null;
  main_photo_url: string | null;
  last_active_at: string | null;
  last_message_preview: string | null;
  distance_km: number | null;
};

// Set to true while backend is not ready so you see something
const USE_DEMO_MATCHES = true;

const DEMO_MATCHES: NiiceMatch[] = [
  {
    id: "demo-1",
    other_user_id: "demo-user-1",
    full_name: "Alex",
    age: 24,
    main_photo_url:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
    last_active_at: new Date().toISOString(),
    last_message_preview: "“You have a cool vibe.”",
    distance_km: 3,
  },
  {
    id: "demo-2",
    other_user_id: "demo-user-2",
    full_name: "Mia",
    age: 22,
    main_photo_url:
      "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
    last_active_at: new Date().toISOString(),
    last_message_preview: null,
    distance_km: 5,
  },
];

function NiceesScreen() {
  const [matches, setMatches] = useState<NiiceMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("recent");

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      // If user not logged in yet – just show demo or empty
      if (!userId) {
        setMatches(USE_DEMO_MATCHES ? DEMO_MATCHES : []);
        return;
      }

      // ⬇️ IMPORTANT:
      // Replace "matches_view" + column list with your real table / view.
      // Idea: one row per match for this user + info about the OTHER profile.
      const { data, error } = await supabase
        .from("matches_view") // TODO: change to your table / view
        .select(
          "id, user_id, other_user_id, full_name, age, main_photo_url, last_active_at, last_message_preview, distance_km"
        )
        .eq("user_id", userId)
        .order("last_active_at", { ascending: false });

      if (error) {
        console.log("Error loading niices:", error.message);
        setMatches(USE_DEMO_MATCHES ? DEMO_MATCHES : []);
        return;
      }

      const rows = (data || []) as any[];

      if (!rows.length && USE_DEMO_MATCHES) {
        setMatches(DEMO_MATCHES);
        return;
      }

      const mapped: NiiceMatch[] = rows.map((row) => ({
        id: row.id,
        other_user_id: row.other_user_id,
        full_name: row.full_name ?? "—",
        age: row.age ?? null,
        main_photo_url: row.main_photo_url ?? null,
        last_active_at: row.last_active_at ?? null,
        last_message_preview: row.last_message_preview ?? null,
        distance_km: row.distance_km ?? null,
      }));

      setMatches(mapped);
    } catch (err) {
      console.log("Unexpected error loading niices:", err);
      setMatches(USE_DEMO_MATCHES ? DEMO_MATCHES : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }, [loadMatches]);

  const filteredMatches = useMemo(() => {
    const list = [...matches];

    switch (activeFilter) {
      case "nearby":
        return list.sort(
          (a, b) =>
            (a.distance_km ?? Number.MAX_SAFE_INTEGER) -
            (b.distance_km ?? Number.MAX_SAFE_INTEGER)
        );
      // For now other filters just keep default order.
      default:
        return list;
    }
  }, [matches, activeFilter]);

  const hasMatches = filteredMatches.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>
              Mutual likes show up sooner
            </Text>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="rgba(10,14,26,0.6)"
              style={{ marginLeft: scale(4) }}
            />
          </View>
        </View>
      </View>

      {/* Filters row (Hinge-style) */}
      <View style={styles.filtersRow}>
        <View style={styles.filtersLeft}>
          <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name="swap-vertical"
              size={18}
              color={INK}
            />
          </TouchableOpacity>

          <FilterPill
            label="Recent"
            active={activeFilter === "recent"}
            onPress={() => setActiveFilter("recent")}
          />
          <FilterPill
            label="Your type"
            active={activeFilter === "your_type"}
            onPress={() => setActiveFilter("your_type")}
          />
        </View>

        <View style={styles.filtersRight}>
          <FilterPill
            label="Last active"
            small
            active={activeFilter === "last_active"}
            onPress={() => setActiveFilter("last_active")}
          />
          <FilterPill
            label="Nearby"
            small
            active={activeFilter === "nearby"}
            onPress={() => setActiveFilter("nearby")}
          />
        </View>
      </View>

      {/* Body */}
      {hasMatches ? (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
            />
          }
          renderItem={({ item }) => (
            <NiiceCard
              match={item}
              onPress={() => {
                // TODO: route to your 1-1 chat screen when ready
                router.push("/in_progress");
              }}
            />
          )}
        />
      ) : (
        <EmptyNiicesState
          loading={loading}
          onPrimaryPress={() => {
            // TODO: connect to boost flow when you build it
            router.push("/(tabs)/map");
          }}
          onSecondaryPress={() => {
            // TODO: connect to paywall / premium when you have it
            router.push("/in_progress");
          }}
        />
      )}
    </SafeAreaView>
  );
}

type FilterPillProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  small?: boolean;
};

const FilterPill: React.FC<FilterPillProps> = ({
  label,
  active,
  onPress,
  small,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.filterPill,
        small && styles.filterPillSmall,
        active && styles.filterPillActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.filterPillText,
          small && styles.filterPillTextSmall,
          active && styles.filterPillTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

type EmptyProps = {
  loading: boolean;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
};

const EmptyNiicesState: React.FC<EmptyProps> = ({
  loading,
  onPrimaryPress,
  onSecondaryPress,
}) => {
  return (
    <View style={styles.emptyContainer}>
      {/* Simple illustration instead of SVG to keep it light */}
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyCircle}>
          <Ionicons name="heart-outline" size={40} color={BLUE} />
        </View>
      </View>

      <Text style={styles.emptyTitle}>
        {loading ? "Loading your niices..." : "You're new, no niices yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        When a like is mutual, you’ll be able to chat with your niices here.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.85}
        onPress={onPrimaryPress}
      >
        <Ionicons
          name="flash-outline"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: scale(6) }}
        />
        <Text style={styles.primaryButtonText}>Boost your profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.85}
        onPress={onSecondaryPress}
      >
        <Text style={styles.secondaryButtonText}>
          Upgrade for more visibility
        </Text>
      </TouchableOpacity>
    </View>
  );
};

type NiiceCardProps = {
  match: NiiceMatch;
  onPress: () => void;
};

const NiiceCard: React.FC<NiiceCardProps> = ({ match, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.matchCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Small bubble like “Liked your photo” */}
      <View style={styles.matchBubble}>
        <Text style={styles.matchBubbleText}>You matched</Text>
      </View>

      <View style={styles.matchBody}>
        <View style={styles.matchPhotoWrapper}>
          {match.main_photo_url ? (
            <Image
              source={{ uri: match.main_photo_url }}
              style={styles.matchPhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.matchPhotoPlaceholder}>
              <Ionicons name="person" size={28} color="rgba(10,14,26,0.55)" />
            </View>
          )}
        </View>

        <View style={styles.matchInfo}>
          <Text style={styles.matchName} numberOfLines={1}>
            {match.full_name}
            {match.age != null ? `, ${match.age}` : ""}
          </Text>

          {match.last_message_preview ? (
            <Text style={styles.matchPreview} numberOfLines={2}>
              {match.last_message_preview}
            </Text>
          ) : (
            <Text style={styles.matchPreviewMuted} numberOfLines={1}>
              Say hi and break the ice 👋
            </Text>
          )}

          <View style={styles.matchMetaRow}>
            {match.distance_km != null && (
              <Text style={styles.matchMetaText}>
                {`${match.distance_km.toFixed(0)} km away`}
              </Text>
            )}
            {match.last_active_at && (
              <>
                {match.distance_km != null && <View style={styles.metaDot} />}
                <Text style={styles.matchMetaText}>Active recently</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default NiceesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(8),
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(28),
    color: INK,
    letterSpacing: 0.3,
  },
  headerSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  headerSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
  },

  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(8),
  },
  filtersLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  filtersRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  sortButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  filterPill: {
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    backgroundColor: "#F1F3FA",
  },
  filterPillSmall: {
    paddingHorizontal: scale(10),
  },
  filterPillActive: {
    backgroundColor: INK,
  },
  filterPillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.8)",
  },
  filterPillTextSmall: {
    fontSize: scale(12),
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },

  listContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(24),
  },

  matchCard: {
    borderRadius: scale(18),
    padding: scale(14),
    marginBottom: verticalScale(12),
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
  },
  matchBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F3FA",
    borderRadius: scale(14),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    marginBottom: verticalScale(8),
  },
  matchBubbleText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.7)",
  },
  matchBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchPhotoWrapper: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(16),
    overflow: "hidden",
    marginRight: scale(12),
    backgroundColor: "#E4EBFA",
  },
  matchPhoto: {
    width: "100%",
    height: "100%",
  },
  matchPhotoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: INK,
    marginBottom: verticalScale(4),
  },
  matchPreview: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.8)",
    marginBottom: verticalScale(6),
  },
  matchPreviewMuted: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(6),
  },
  matchMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchMetaText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.5)",
  },
  metaDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(10,14,26,0.3)",
    marginHorizontal: scale(6),
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  emptyIllustration: {
    marginBottom: verticalScale(20),
  },
  emptyCircle: {
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(6),
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
    marginBottom: verticalScale(18),
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(24),
    backgroundColor: BLUE,
    marginBottom: verticalScale(10),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
  },
  secondaryButton: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(9),
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.12)",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
  },
});
