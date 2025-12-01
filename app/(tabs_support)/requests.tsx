// app/(tabs)/(up_tab)/requests.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

// ================== TYPES ==================
type MatchMode = "dating" | "friend";
type MatchStatus = "pending" | "accepted" | "denied" | "rejected";
type ConnectionVisibility = "full_profile" | "blind";
type PlaceRole = "none" | "requester" | "target";

interface MatchRequest {
  id: string;
  other_user_id: string;
  full_name: string | null;
  age: number | null;
  main_photo_url: string | null;
  match_mode: MatchMode;
  connection_visibility: ConnectionVisibility;
  status: MatchStatus;
  is_incoming: boolean;
  sender_message: string | null;
  place_role: PlaceRole | null;
  created_at: string;
}

// ================== UTILITY FUNCTIONS ==================
const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// ================== REQUEST ROW ==================
const RequestRow: React.FC<{ 
  request: MatchRequest; 
  onPress: () => void; 
  onAccept?: () => void; 
  onDecline?: () => void 
}> = ({ request, onPress, onAccept, onDecline }) => {
  const isBlind = request.connection_visibility === "blind";
  return (
    <TouchableOpacity style={styles.requestRow} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.requestAvatar, isBlind && styles.requestAvatarBlind]}>
        {isBlind ? (
          <LinearGradient colors={[BLUE, "#4E7DE9"]} style={styles.requestAvatarGradient}>
            <Ionicons name="eye-off" size={20} color="#FFFFFF" />
          </LinearGradient>
        ) : request.main_photo_url ? (
          <Image source={{ uri: request.main_photo_url }} style={styles.requestPhoto} />
        ) : (
          <View style={styles.requestPhotoPlaceholder}>
            <Ionicons name="person" size={20} color="rgba(10,14,26,0.4)" />
          </View>
        )}
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName} numberOfLines={1}>
          {isBlind ? "Mystery Person" : (request.full_name || "Someone")}
          {request.age && !isBlind ? `, ${request.age}` : ""}
        </Text>
        <Text style={styles.requestSubtext}>
          {isBlind ? "Blind meeting" : request.match_mode === "dating" ? "Date request" : "Friend request"}
        </Text>
        {request.sender_message && request.is_incoming && (
          <Text style={styles.requestMessage} numberOfLines={1}>"{request.sender_message}"</Text>
        )}
        <Text style={styles.requestTime}>{formatRelativeTime(request.created_at)}</Text>
      </View>
      {request.is_incoming && request.status === "pending" && onAccept && onDecline ? (
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.requestDeclineBtn} onPress={onDecline}>
            <Text style={styles.requestDeclineText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.requestAcceptBtn} onPress={onAccept}>
            <Text style={styles.requestAcceptText}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.requestStatusBadge, request.status === "accepted" && styles.requestStatusAccepted]}>
          <Text style={[styles.requestStatusText, request.status === "accepted" && styles.requestStatusTextAccepted]}>
            {request.status === "pending" ? "Pending" : request.status === "accepted" ? "Accepted" : "Declined"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ================== MAIN SCREEN ==================
function RequestsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<MatchRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestsTab, setRequestsTab] = useState<"incoming" | "outgoing">("incoming");

  // ================== DATA LOADING ==================
  const loadUserId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data?.user?.id ?? null);
    return data?.user?.id;
  }, []);

  const getUserPreview = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await supabase.rpc('get_matched_user_profile', { target_user_id: targetUserId });
      const row = Array.isArray(data) ? data[0] : data;
      let photoUrl = row?.main_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
        photoUrl = signedData?.signedUrl || null;
      }
      return { full_name: row?.full_name ?? null, age: row?.age ?? null, main_photo_url: photoUrl };
    } catch { 
      return { full_name: null, age: null, main_photo_url: null }; 
    }
  }, []);

  const loadRequests = useCallback(async (uid: string) => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase.from("match_requests")
        .select("id, requester_id, target_id, match_mode, connection_visibility, status, sender_message, place_role, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`)
        .in("status", ["pending", "accepted", "rejected"])
        .order("created_at", { ascending: false });
      
      if (error) { 
        setIncomingRequests([]); 
        setOutgoingRequests([]); 
        return; 
      }
      
      const incoming: MatchRequest[] = [];
      const outgoing: MatchRequest[] = [];
      
      for (const row of data || []) {
        const isIncoming = row.target_id === uid;
        const otherId = isIncoming ? row.requester_id : row.target_id;
        const preview = await getUserPreview(otherId);
        const req: MatchRequest = { 
          id: row.id, 
          other_user_id: otherId, 
          full_name: preview.full_name, 
          age: preview.age, 
          main_photo_url: preview.main_photo_url, 
          match_mode: row.match_mode, 
          connection_visibility: row.connection_visibility, 
          status: row.status, 
          is_incoming: isIncoming, 
          sender_message: row.sender_message, 
          place_role: row.place_role, 
          created_at: row.created_at 
        };
        if (isIncoming) incoming.push(req); 
        else outgoing.push(req);
      }
      
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err) { 
      setIncomingRequests([]); 
      setOutgoingRequests([]); 
    } finally { 
      setLoadingRequests(false); 
    }
  }, [getUserPreview]);

  // ================== EFFECTS ==================
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const uid = await loadUserId();
        if (uid) {
          await loadRequests(uid);
        }
      };
      init();
    }, [loadUserId, loadRequests])
  );

  // ================== HANDLERS ==================
  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      await loadRequests(userId);
    }
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request: MatchRequest) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('target_id', userId);
      
      if (!error) { 
        Alert.alert("Success", "Request accepted!"); 
        await loadRequests(userId); 
      }
    } catch (error) { 
      Alert.alert("Error", "Failed to accept request"); 
    }
  };

  const handleDeclineRequest = async (request: MatchRequest) => {
    if (!userId) return;
    try { 
      await supabase
        .from('match_requests')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', request.id)
        .eq('target_id', userId); 
      await loadRequests(userId); 
    } catch (error) { 
      console.error("Error declining:", error); 
    }
  };

  const handleViewProfile = (targetUserId: string) => {
    router.push({ pathname: "/profile", params: { userId: targetUserId } });
  };

  const pendingCount = incomingRequests.filter(r => r.status === "pending").length;
  const currentRequests = requestsTab === "incoming" ? incomingRequests : outgoingRequests;

  // ================== RENDER ==================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, requestsTab === "incoming" && styles.tabActive]} 
          onPress={() => setRequestsTab("incoming")}
          activeOpacity={0.8}
        >
          {requestsTab === "incoming" ? (
            <LinearGradient colors={[BLUE, "#4E7DE9"]} style={styles.tabGradient}>
              <Text style={styles.tabTextActive}>Incoming</Text>
              {pendingCount > 0 && (
                <View style={styles.tabBadgeActive}>
                  <Text style={styles.tabBadgeTextActive}>{pendingCount}</Text>
                </View>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.tabInner}>
              <Text style={styles.tabText}>Incoming</Text>
              {pendingCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, requestsTab === "outgoing" && styles.tabActive]} 
          onPress={() => setRequestsTab("outgoing")}
          activeOpacity={0.8}
        >
          {requestsTab === "outgoing" ? (
            <LinearGradient colors={[BLUE, "#4E7DE9"]} style={styles.tabGradient}>
              <Text style={styles.tabTextActive}>Outgoing</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tabInner}>
              <Text style={styles.tabText}>Outgoing</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />
        }
      >
        {loadingRequests ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : currentRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={requestsTab === "incoming" ? "mail-open-outline" : "paper-plane-outline"} 
                size={32} 
                color={BLUE} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {requestsTab === "incoming" ? "No incoming requests" : "No outgoing requests"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {requestsTab === "incoming" 
                ? "When someone sends you a request, it will appear here" 
                : "Requests you've sent will appear here"}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {currentRequests.map((r) => (
              <RequestRow 
                key={r.id} 
                request={r} 
                onPress={() => handleViewProfile(r.other_user_id)} 
                onAccept={r.is_incoming && r.status === "pending" ? () => handleAcceptRequest(r) : undefined} 
                onDecline={r.is_incoming && r.status === "pending" ? () => handleDeclineRequest(r) : undefined} 
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default RequestsScreen;

// ================== STYLES ==================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG 
  },
  
  // Header
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    paddingHorizontal: scale(16), 
    paddingVertical: verticalScale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: "rgba(27,68,205,0.06)" 
  },
  backButton: { 
    padding: scale(4) 
  },
  headerTitle: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: INK 
  },
  headerRight: { 
    width: scale(32) 
  },

  // Tab Toggle
  tabContainer: { 
    flexDirection: "row", 
    marginHorizontal: scale(16), 
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.04)", 
    borderRadius: scale(16), 
    padding: scale(4) 
  },
  tab: { 
    flex: 1, 
    borderRadius: scale(12), 
    overflow: "hidden" 
  },
  tabActive: {},
  tabGradient: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: verticalScale(12), 
    gap: scale(6),
    borderRadius: scale(12),
  },
  tabInner: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: verticalScale(12), 
    gap: scale(6) 
  },
  tabText: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.6)" 
  },
  tabTextActive: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: "#FFFFFF" 
  },
  tabBadge: { 
    backgroundColor: "rgba(10,14,26,0.1)", 
    borderRadius: scale(10), 
    paddingHorizontal: scale(6), 
    paddingVertical: verticalScale(2), 
    minWidth: scale(20), 
    alignItems: "center" 
  },
  tabBadgeActive: { 
    backgroundColor: "rgba(255,255,255,0.25)", 
    borderRadius: scale(10), 
    paddingHorizontal: scale(6), 
    paddingVertical: verticalScale(2), 
    minWidth: scale(20), 
    alignItems: "center" 
  },
  tabBadgeText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.5)" 
  },
  tabBadgeTextActive: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(11), 
    color: "#FFFFFF" 
  },

  // Scroll
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(40) 
  },

  // Loading
  loadingContainer: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: verticalScale(100) 
  },
  loadingText: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.5)", 
    marginTop: verticalScale(12) 
  },

  // Empty State
  emptyState: { 
    alignItems: "center", 
    paddingVertical: verticalScale(80), 
    paddingHorizontal: scale(32) 
  },
  emptyIconContainer: { 
    width: scale(72), 
    height: scale(72), 
    borderRadius: scale(36), 
    backgroundColor: "rgba(27,68,205,0.08)", 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: verticalScale(16) 
  },
  emptyTitle: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: INK, 
    marginBottom: verticalScale(8), 
    textAlign: "center" 
  },
  emptySubtitle: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.6)", 
    textAlign: "center" 
  },

  // Requests List
  requestsList: { 
    gap: verticalScale(8) 
  },
  requestRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FFFFFF", 
    borderRadius: scale(16), 
    padding: scale(14), 
    borderWidth: 1, 
    borderColor: "rgba(27,68,205,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  requestAvatar: { 
    width: scale(52), 
    height: scale(52), 
    borderRadius: scale(26), 
    overflow: "hidden", 
    backgroundColor: "#E8F4FF", 
    marginRight: scale(12) 
  },
  requestAvatarBlind: { 
    backgroundColor: "transparent" 
  },
  requestAvatarGradient: { 
    width: "100%", 
    height: "100%", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  requestPhoto: { 
    width: "100%", 
    height: "100%" 
  },
  requestPhotoPlaceholder: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  requestInfo: { 
    flex: 1, 
    marginRight: scale(8) 
  },
  requestName: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: INK, 
    marginBottom: verticalScale(2) 
  },
  requestSubtext: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(13), 
    color: "rgba(10,14,26,0.6)", 
    marginBottom: verticalScale(2) 
  },
  requestMessage: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(12), 
    color: "rgba(10,14,26,0.5)", 
    fontStyle: "italic",
    marginBottom: verticalScale(2)
  },
  requestTime: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.4)" 
  },
  requestActions: { 
    flexDirection: "row", 
    gap: scale(8) 
  },
  requestDeclineBtn: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    borderWidth: 1.5, 
    borderColor: "rgba(10,14,26,0.12)", 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  requestDeclineText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: "rgba(10,14,26,0.5)" 
  },
  requestAcceptBtn: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: BLUE, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  requestAcceptText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: "#FFFFFF" 
  },
  requestStatusBadge: { 
    paddingHorizontal: scale(12), 
    paddingVertical: verticalScale(6), 
    borderRadius: scale(12), 
    backgroundColor: "rgba(10,14,26,0.06)" 
  },
  requestStatusAccepted: { 
    backgroundColor: "rgba(34,197,94,0.1)" 
  },
  requestStatusText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(12), 
    color: "rgba(10,14,26,0.5)" 
  },
  requestStatusTextAccepted: { 
    color: "#22C55E" 
  },
});