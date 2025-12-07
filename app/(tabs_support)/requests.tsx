// app/(tabs)/(up_tab)/requests.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  Animated as RNAnimated,
  ScrollView,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

// ================== TYPES ==================
type MatchStatus = "pending" | "accepted" | "denied" | "rejected";

interface MatchRequest {
  id: string;
  other_user_id: string;
  full_name: string | null;
  age: number | null;
  main_photo_url: string | null;
  status: MatchStatus;
  is_incoming: boolean;
  sender_message: string | null;
  created_at: string;
}

// ================== UTILITY FUNCTIONS ==================
const capitalizeName = (name: string | null): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

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
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  
  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <TouchableOpacity 
      style={styles.requestRowWrapper} 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <RNAnimated.View 
        style={[
          styles.requestRow,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.requestAvatar}>
          {request.main_photo_url ? (
            <Image source={{ uri: request.main_photo_url }} style={styles.requestPhoto} />
          ) : (
            <View style={styles.requestPhotoPlaceholder}>
              <Ionicons name="person" size={20} color="rgba(10,14,26,0.4)" />
            </View>
          )}
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName} numberOfLines={1}>
            {capitalizeName(request.full_name) || "Someone"}
            {request.age ? `, ${request.age}` : ""}
          </Text>
          <Text style={styles.requestSubtext}>
            Connection request
          </Text>
          {request.sender_message && request.is_incoming && (
            <Text style={styles.requestMessage} numberOfLines={1}>"{request.sender_message}"</Text>
          )}
          <Text style={styles.requestTime}>{formatRelativeTime(request.created_at)}</Text>
        </View>
        {request.is_incoming && request.status === "pending" && onAccept && onDecline ? (
          <View style={styles.requestActions}>
            <TouchableOpacity 
              style={styles.requestDeclineBtn} 
              onPress={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="rgba(10,14,26,0.5)" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.requestAcceptBtn} 
              onPress={(e) => {
                e.stopPropagation();
                onAccept();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.requestStatusBadge, 
            request.status === "accepted" && styles.requestStatusAccepted
          ]}>
            <Text style={[
              styles.requestStatusText, 
              request.status === "accepted" && styles.requestStatusTextAccepted
            ]}>
              {request.status === "pending" ? "Pending" : request.status === "accepted" ? "Accepted" : "Declined"}
            </Text>
          </View>
        )}
      </RNAnimated.View>
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
        .select("id, requester_id, target_id, status, sender_message, created_at")
        .or(`requester_id.eq.${uid},target_id.eq.${uid}`)
        .eq("status", "pending")
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
          status: row.status, 
          is_incoming: isIncoming, 
          sender_message: row.sender_message, 
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
          <View style={styles.backButtonInner}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => setRequestsTab("incoming")}
          activeOpacity={0.9}
        >
          <View style={[
            styles.tabInner, 
            requestsTab === "incoming" && styles.tabInnerActive
          ]}>
            <Text style={requestsTab === "incoming" ? styles.tabTextActive : styles.tabText}>
              Incoming
            </Text>
            {pendingCount > 0 && (
              <View style={[
                styles.tabBadge, 
                requestsTab === "incoming" && styles.tabBadgeActive
              ]}>
                <Text style={requestsTab === "incoming" ? styles.tabBadgeTextActive : styles.tabBadgeText}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => setRequestsTab("outgoing")}
          activeOpacity={0.9}
        >
          <View style={[
            styles.tabInner, 
            requestsTab === "outgoing" && styles.tabInnerActive
          ]}>
            <Text style={requestsTab === "outgoing" ? styles.tabTextActive : styles.tabText}>
              Outgoing
            </Text>
          </View>
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
    paddingHorizontal: scale(20), 
    paddingVertical: verticalScale(16), 
  },
  backButton: { 
    width: scale(36),
    height: scale(36),
  },
  backButtonInner: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#000910",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: INK 
  },
  headerRight: { 
    width: scale(36) 
  },

  // Tab Toggle
  tabContainer: { 
    flexDirection: "row", 
    marginHorizontal: scale(20), 
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
    backgroundColor: "rgba(27,68,205,0.08)", 
    borderRadius: scale(24), 
    padding: scale(4) 
  },
  tab: { 
    flex: 1, 
    borderRadius: scale(20), 
    overflow: "hidden" 
  },
  tabInner: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: verticalScale(10), 
    paddingHorizontal: scale(8),
    borderRadius: scale(20),
    overflow: "hidden",
  },
  tabInnerActive: {
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  tabText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.6)" 
  },
  tabTextActive: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(14), 
    color: "#FFFFFF" 
  },
  tabBadge: { 
    marginLeft: scale(6),
    backgroundColor: "rgba(10,14,26,0.1)", 
    borderRadius: scale(12), 
    paddingHorizontal: scale(8), 
    paddingVertical: verticalScale(2), 
    minWidth: scale(20), 
    alignItems: "center" 
  },
  tabBadgeActive: { 
    backgroundColor: "rgba(255,255,255,0.25)", 
  },
  tabBadgeText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.6)" 
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
    paddingHorizontal: scale(20),
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
    textAlign: "center",
    lineHeight: verticalScale(20),
  },

  // Requests List
  requestsList: { 
    gap: verticalScale(12) 
  },

  // Request Row
  requestRowWrapper: {
    borderRadius: scale(20),
  },
  requestRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderRadius: scale(20), 
    padding: scale(16), 
    overflow: "hidden",
    borderWidth: 1, 
    borderColor: "rgba(27,68,205,0.08)",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  requestAvatar: { 
    width: scale(56), 
    height: scale(56), 
    borderRadius: scale(28), 
    overflow: "hidden", 
    backgroundColor: "#E8F4FF", 
    marginRight: scale(14) 
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
    marginRight: scale(12) 
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

  // Actions
  requestActions: { 
    flexDirection: "row", 
    gap: scale(10) 
  },
  requestDeclineBtn: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: "rgba(27,68,205,0.08)", 
    alignItems: "center", 
    justifyContent: "center",
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  // Status Badge
  requestStatusBadge: { 
    paddingHorizontal: scale(12), 
    paddingVertical: verticalScale(6), 
    borderRadius: scale(16), 
    backgroundColor: "rgba(10,14,26,0.08)" 
  },
  requestStatusAccepted: { 
    backgroundColor: "rgba(34,197,94,0.1)" 
  },
  requestStatusText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(12), 
    color: "rgba(10,14,26,0.6)" 
  },
  requestStatusTextAccepted: { 
    color: "#22C55E" 
  },
});