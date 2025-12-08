// app/(tabs_support)/host_applications_public.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BLUE = "#1B44CD";
const BLUES = { b100: "#86A9F5", b120: "#C4D5FC" };

interface Participant {
  id: string;
  applicant_id: string;
  joined_at: string;
  full_name: string;
  age: number | null;
  photo_url: string | null;
}

const formatJoinedDate = (dateString: string): string => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function EventParticipantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventName, setEventName] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!eventId) return;

    try {
      const { data: eventData } = await supabase
        .from("events")
        .select("event_name, capacity, host_id")
        .eq("id", eventId)
        .single();

      if (eventData) {
        setEventName(eventData.event_name);
        setCapacity(eventData.capacity);
        setHostId(eventData.host_id);
      }

      const { data: appData } = await supabase
        .from("event_applications")
        .select("id, applicant_id, created_at")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (!appData || appData.length === 0) {
        setParticipants([]);
        return;
      }

      const userIds = appData.map(p => p.applicant_id);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, age")
        .in("id", userIds);

      const { data: photosData } = await supabase
        .from("user_photos")
        .select("user_id, photo_url")
        .in("user_id", userIds)
        .eq("is_main", true);

      const profileMap: Record<string, { full_name: string; age: number | null }> = {};
      profilesData?.forEach(p => { profileMap[p.id] = { full_name: p.full_name, age: p.age }; });

      const photoMap: Record<string, string> = {};
      photosData?.forEach(p => { photoMap[p.user_id] = p.photo_url; });

      const results: Participant[] = await Promise.all(
        appData.map(async (app) => {
          let signedUrl: string | null = null;
          const rawUrl = photoMap[app.applicant_id];
          if (rawUrl) {
            const path = rawUrl.startsWith("http") ? null : rawUrl.replace(/^\/+/, "");
            if (path) {
              const { data } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
              signedUrl = data?.signedUrl || null;
            } else {
              signedUrl = rawUrl;
            }
          }
          return {
            id: app.id,
            applicant_id: app.applicant_id,
            joined_at: app.created_at,
            full_name: profileMap[app.applicant_id]?.full_name || "Unknown",
            age: profileMap[app.applicant_id]?.age ?? null,
            photo_url: signedUrl,
          };
        })
      );

      setParticipants(results);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleRemove = useCallback((p: Participant) => {
    Alert.alert("Remove Participant", `Remove ${p.full_name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("event_applications").delete().eq("id", p.id);
        if (!error) setParticipants(prev => prev.filter(x => x.id !== p.id));
        else Alert.alert("Error", "Could not remove");
      }},
    ]);
  }, []);

  const handleViewProfile = (userId: string) => {
    router.push({ pathname: "/(tabs_support)/other_profile", params: { userId } });
  };

  const isHost = hostId === currentUserId;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0A0E1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Participants</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0A0E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Participants</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.eventName} numberOfLines={1}>{eventName}</Text>
        <View style={styles.statsRow}>
          <Ionicons name="people" size={16} color={BLUE} />
          <Text style={styles.statsText}>{participants.length} / {capacity}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min((participants.length / capacity) * 100, 100)}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >
        {participants.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={BLUES.b100} />
            <Text style={styles.emptyTitle}>No Participants Yet</Text>
          </View>
        ) : (
          participants.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => handleViewProfile(p.applicant_id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <View style={styles.avatarWrap}>
                  {p.photo_url ? (
                    <Image source={{ uri: p.photo_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitial}>{p.full_name?.charAt(0)?.toUpperCase() || "?"}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{p.full_name}{p.age ? `, ${p.age}` : ''}</Text>
                  <Text style={styles.joinedText}>Joined {formatJoinedDate(p.joined_at)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
              </View>

              {isHost && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(p)}>
                  <Ionicons name="close-circle-outline" size={18} color="#D5222B" />
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "rgba(27,68,205,0.08)" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(10,14,26,0.05)" },
  headerTitle: { fontSize: scale(18), fontFamily: Fonts.bold, color: "#0A0E1A" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  infoCard: { backgroundColor: "#FFF", marginHorizontal: scale(16), marginTop: verticalScale(16), borderRadius: scale(16), padding: scale(16), elevation: 3 },
  eventName: { fontSize: scale(18), fontFamily: Fonts.bold, color: "#0A0E1A", marginBottom: verticalScale(6) },
  statsRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  statsText: { fontSize: scale(14), fontFamily: Fonts.bold, color: BLUE },
  progressBar: { height: 6, backgroundColor: "rgba(27,68,205,0.1)", borderRadius: 3, marginTop: verticalScale(10), overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: BLUE, borderRadius: 3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(16), paddingTop: verticalScale(16) },
  emptyState: { alignItems: "center", paddingVertical: verticalScale(60) },
  emptyTitle: { fontSize: scale(18), fontFamily: Fonts.bold, color: "#0A0E1A", marginTop: verticalScale(12) },
  card: { backgroundColor: "#FFF", borderRadius: scale(14), padding: scale(12), marginBottom: verticalScale(10), elevation: 2, borderWidth: 1, borderColor: "rgba(27,68,205,0.06)" },
  cardRow: { flexDirection: "row", alignItems: "center" },
  avatarWrap: { marginRight: scale(12) },
  avatar: { width: scale(48), height: scale(48), borderRadius: scale(24), borderWidth: 2, borderColor: BLUES.b100 },
  avatarPlaceholder: { backgroundColor: BLUES.b120, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: scale(18), fontFamily: Fonts.bold, color: BLUE },
  info: { flex: 1 },
  name: { fontSize: scale(15), fontFamily: Fonts.bold, color: "#0A0E1A" },
  joinedText: { fontSize: scale(12), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)", marginTop: verticalScale(2) },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: verticalScale(10), paddingTop: verticalScale(10), borderTopWidth: 1, borderTopColor: "rgba(10,14,26,0.06)", gap: scale(4) },
  removeText: { fontSize: scale(12), fontFamily: Fonts.bold, color: "#D5222B" },
});