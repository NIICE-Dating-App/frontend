// app/(tabs_support)/host_applications.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const BG = "#EEF7FF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

const BLUES = {
  b40: "#1840B8",
  b60: "#2D58D6",
  b80: "#4E7DE9",
  b100: "#86A9F5",
} as const;

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface ApplicationData {
  application_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
  applicant_name: string;
  applicant_age: number | null;
  applicant_photo_url: string | null;
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)", icon: "hourglass-outline" },
  approved: { label: "Approved", color: "#22C55E", bgColor: "rgba(34, 197, 94, 0.1)", icon: "checkmark-circle" },
  rejected: { label: "Rejected", color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)", icon: "close-circle" },
  cancelled: { label: "Cancelled", color: "#6B7280", bgColor: "rgba(107, 114, 128, 0.1)", icon: "ban" },
};

const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

export default function HostApplicationsScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventName, setEventName] = useState<string>("");
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'all'>('pending');

  const loadData = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const { data: eventData } = await supabase
        .from("events")
        .select("event_name")
        .eq("id", eventId)
        .single();

      if (eventData) setEventName(eventData.event_name);

      const { data: appData, error: appError } = await supabase
        .rpc('get_event_applications_for_host', { p_event_id: eventId });

      if (appError) {
        Alert.alert("Error", appError.message || "Could not load applications");
        return;
      }

      const apps = (appData || []) as ApplicationData[];
      setApplications(apps);

      const signedMap: Record<string, string> = {};
      for (const app of apps) {
        if (app.applicant_photo_url) {
          const signed = await signPath(toStoragePath(app.applicant_photo_url));
          if (signed) signedMap[app.applicant_id] = signed;
        }
      }
      setSignedPhotos(signedMap);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("event_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", applicationId);

      if (error) {
        Alert.alert("Error", error.message || "Failed to update");
        return;
      }

      setApplications(prev =>
        prev.map(app => app.application_id === applicationId ? { ...app, status: newStatus } : app)
      );
      Alert.alert("Success", `Application ${newStatus}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAction = (applicationId: string, applicantName: string, action: 'approved' | 'rejected') => {
    Alert.alert(
      `${action === 'approved' ? 'Approve' : 'Reject'}?`,
      `${applicantName} will ${action === 'approved' ? 'be added to' : 'not be able to join'} this event.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: action === 'approved' ? 'Approve' : 'Reject', style: action === 'rejected' ? "destructive" : "default",
          onPress: () => handleUpdateStatus(applicationId, action) },
      ]
    );
  };

  const handleViewProfile = (userId: string) => {
    router.push({ pathname: "/(tabs_support)/other_profile", params: { userId } });
  };

  const filteredApplications = applications.filter(app => activeFilter === 'all' || app.status === activeFilter);

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const formatDate = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return new Date(dateString).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const renderApplicationCard = ({ item }: { item: ApplicationData }) => {
    const config = statusConfig[item.status];
    const isProcessing = processingId === item.application_id;
    const isPending = item.status === 'pending';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleViewProfile(item.applicant_id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={styles.photoWrap}>
            {signedPhotos[item.applicant_id] ? (
              <Image source={{ uri: signedPhotos[item.applicant_id] }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={scale(22)} color={BLUES.b100} />
              </View>
            )}
          </View>
          
          <View style={styles.info}>
            <Text style={styles.name}>
              {item.applicant_name}{item.applicant_age ? `, ${item.applicant_age}` : ''}
            </Text>
            <Text style={styles.time}>{formatDate(item.created_at)}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon as any} size={scale(12)} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => confirmAction(item.application_id, item.applicant_name, 'rejected')}
              disabled={isProcessing}
            >
              {isProcessing ? <ActivityIndicator size="small" color="#EF4444" /> : (
                <>
                  <Ionicons name="close" size={scale(16)} color="#EF4444" />
                  <Text style={styles.rejectText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => confirmAction(item.application_id, item.applicant_name, 'approved')}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.approveGradient}>
                {isProcessing ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark" size={scale(16)} color="#FFF" />
                    <Text style={styles.approveText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={INK} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Applications</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{eventName}</Text>
          </View>
          <View style={{ width: scale(40) }} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{counts.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#22C55E" }]}>{counts.approved}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>{counts.rejected}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const count = filter === 'all' ? counts.all : counts[filter];
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
              >
                {isActive ? (
                  <LinearGradient colors={[BLUES.b60, BLUES.b80]} style={styles.filterGradient}>
                    <Text style={styles.filterTextActive}>{filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.filterText}>{filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.application_id}
          renderItem={renderApplicationCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={scale(40)} color={BLUES.b100} />
              <Text style={styles.emptyTitle}>No Applications</Text>
            </View>
          }
          contentContainerStyle={filteredApplications.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "rgba(27, 68, 205, 0.08)", backgroundColor: "#FFF" },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: "center", justifyContent: "center", backgroundColor: "rgba(27, 68, 205, 0.06)" },
  headerTitleWrap: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontFamily: Fonts.bold, fontSize: scale(20), color: INK },
  headerSubtitle: { fontFamily: Fonts.primary, fontSize: scale(13), color: BLUE, marginTop: verticalScale(2) },
  summaryCard: { flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: scale(16), marginTop: verticalScale(16), borderRadius: scale(16), padding: scale(16), elevation: 4 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNumber: { fontFamily: Fonts.bold, fontSize: scale(28), color: BLUE },
  summaryLabel: { fontFamily: Fonts.primary, fontSize: scale(12), color: INK, opacity: 0.6, marginTop: verticalScale(4) },
  divider: { width: 1, backgroundColor: "rgba(27, 68, 205, 0.1)", marginVertical: verticalScale(4) },
  filterRow: { flexDirection: "row", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), gap: scale(8) },
  filterTab: { flex: 1, borderRadius: scale(12), overflow: "hidden", backgroundColor: "rgba(27, 68, 205, 0.06)", borderWidth: 1, borderColor: "rgba(27, 68, 205, 0.12)" },
  filterTabActive: { borderColor: "transparent" },
  filterGradient: { paddingVertical: verticalScale(10), alignItems: "center", justifyContent: "center" },
  filterText: { fontFamily: Fonts.bold, fontSize: scale(11), color: BLUES.b40, textAlign: "center", paddingVertical: verticalScale(10) },
  filterTextActive: { fontFamily: Fonts.bold, fontSize: scale(11), color: "#FFF" },
  listContent: { paddingHorizontal: scale(16), paddingBottom: verticalScale(100) },
  listEmpty: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "#FFF", borderRadius: scale(14), padding: scale(12), marginBottom: verticalScale(10), elevation: 2, borderWidth: 1, borderColor: "rgba(27, 68, 205, 0.06)" },
  cardRow: { flexDirection: "row", alignItems: "center" },
  photoWrap: { width: scale(46), height: scale(46), borderRadius: scale(23), overflow: "hidden", borderWidth: 2, borderColor: "rgba(27, 68, 205, 0.15)" },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { width: "100%", height: "100%", backgroundColor: "rgba(27, 68, 205, 0.08)", alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginLeft: scale(10) },
  name: { fontFamily: Fonts.bold, fontSize: scale(15), color: INK },
  time: { fontFamily: Fonts.primary, fontSize: scale(11), color: INK, opacity: 0.5, marginTop: verticalScale(2) },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: scale(10), gap: scale(4) },
  statusText: { fontFamily: Fonts.bold, fontSize: scale(10) },
  actionRow: { flexDirection: "row", marginTop: verticalScale(10), paddingTop: verticalScale(10), borderTopWidth: 1, borderTopColor: "rgba(27, 68, 205, 0.08)", gap: scale(10) },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(8), borderRadius: scale(8), backgroundColor: "rgba(239, 68, 68, 0.08)", gap: scale(4) },
  rejectText: { fontFamily: Fonts.bold, fontSize: scale(12), color: "#EF4444" },
  approveBtn: { flex: 1, borderRadius: scale(8), overflow: "hidden" },
  approveGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(8), gap: scale(4) },
  approveText: { fontFamily: Fonts.bold, fontSize: scale(12), color: "#FFF" },
  emptyContainer: { alignItems: "center", gap: verticalScale(12) },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: scale(16), color: INK },
});