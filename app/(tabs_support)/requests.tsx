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
import type { ProfileAccessLevel } from "@/types/profile";
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
  bio: string | null;
  looking_for: string[] | null;
  status: MatchStatus;
  is_incoming: boolean;
  sender_message: string | null;
  created_at: string;
  access_level: ProfileAccessLevel;
}

interface GroupInvite {
  invite_id: string;
  group_id: string;
  group_name: string;
  group_description: string | null;
  group_cover_image_url: string | null;
  group_member_count: number;
  invited_by_id: string;
  invited_by_name: string;
  invited_by_photo_url: string | null;
  role: 'member' | 'admin';
  message: string | null;
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
  const isLimited = request.access_level === 'limited';
  
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
          { transform: [{ scale: scaleAnim }] },
          isLimited && styles.requestRowLimited
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
          {/* Limited access indicator on avatar */}
          {isLimited && (
            <View style={styles.limitedBadge}>
              <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.requestInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.requestName} numberOfLines={1}>
              {capitalizeName(request.full_name) || "Someone"}
              {request.age ? `, ${request.age}` : ""}
            </Text>
            {isLimited && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>Private</Text>
              </View>
            )}
          </View>
          <Text style={styles.requestSubtext}>
            Connection request
          </Text>
          {/* Show bio snippet for limited profiles (part of LIMITED access fields) */}
          {isLimited && request.bio && (
            <Text style={styles.requestBioSnippet} numberOfLines={1}>
              {request.bio}
            </Text>
          )}
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
          <View style={styles.rightSection}>
            {/* Show chevron for full access profiles */}
            {request.access_level === 'full' && (
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="rgba(10,14,26,0.3)" 
                style={styles.chevron}
              />
            )}
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
          </View>
        )}
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

// ================== GROUP INVITE ROW ==================
const GroupInviteRow: React.FC<{ 
  invite: GroupInvite; 
  onPress: () => void; 
  onAccept: () => void; 
  onDecline: () => void 
}> = ({ invite, onPress, onAccept, onDecline }) => {
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
          styles.groupInviteRow,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.requestAvatar}>
          {invite.group_cover_image_url ? (
            <Image source={{ uri: invite.group_cover_image_url }} style={styles.requestPhoto} />
          ) : (
            <View style={[styles.requestPhotoPlaceholder, styles.groupPhotoPlaceholder]}>
              <Ionicons name="people" size={20} color={BLUE} />
            </View>
          )}
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={10} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.requestInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.requestName} numberOfLines={1}>
              {invite.group_name}
            </Text>
            <View style={styles.groupTagBadge}>
              <Text style={styles.groupTagBadgeText}>Group</Text>
            </View>
          </View>
          <Text style={styles.requestSubtext}>
            {capitalizeName(invite.invited_by_name)} invited you as {invite.role}
          </Text>
          {invite.message && (
            <Text style={styles.requestMessage} numberOfLines={1}>"{invite.message}"</Text>
          )}
          <View style={styles.groupMetaRow}>
            <Ionicons name="people-outline" size={12} color="rgba(10,14,26,0.4)" />
            <Text style={styles.groupMetaText}>{invite.group_member_count} members</Text>
          </View>
          <Text style={styles.requestTime}>{formatRelativeTime(invite.created_at)}</Text>
        </View>
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
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

// ================== MAIN SCREEN ==================
function RequestsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<MatchRequest[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestsTab, setRequestsTab] = useState<"incoming" | "outgoing">("incoming");

  // ================== DATA LOADING ==================
  const loadUserId = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data?.user?.id ?? null);
    return data?.user?.id;
  }, []);

  const getUserPreview = useCallback(async (targetUserId: string): Promise<{
    full_name: string | null;
    age: number | null;
    main_photo_url: string | null;
    bio: string | null;
    looking_for: string[] | null;
    access_level: ProfileAccessLevel;
  }> => {
    try {
      // Use get_profile_for_viewer which respects access levels
      const { data, error } = await supabase.rpc('get_profile_for_viewer', { 
        p_target_user_id: targetUserId 
      });
      
      if (error || !data) {
        return { 
          full_name: null, 
          age: null, 
          main_photo_url: null,
          bio: null,
          looking_for: null,
          access_level: 'none' 
        };
      }

      // Handle photo URL signing if needed
      let photoUrl = data.main_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signedData } = await supabase.storage
          .from("user_photos")
          .createSignedUrl(photoUrl, 3600);
        photoUrl = signedData?.signedUrl || null;
      }

      return { 
        full_name: data.full_name ?? null, 
        age: data.age ?? null, 
        main_photo_url: photoUrl,
        bio: data.bio ?? null,
        looking_for: data.looking_for ?? null,
        access_level: data.access_level as ProfileAccessLevel
      };
    } catch { 
      return { 
        full_name: null, 
        age: null, 
        main_photo_url: null,
        bio: null,
        looking_for: null,
        access_level: 'none' 
      }; 
    }
  }, []);

  const loadGroupInvites = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_pending_group_invites');
      
      if (error) {
        console.error("Error loading group invites:", error);
        setGroupInvites([]);
        return;
      }
      
      // Sign photo URLs if needed
      const invites = await Promise.all((data || []).map(async (invite: any) => {
        let photoUrl = invite.invited_by_photo_url;
        let coverUrl = invite.group_cover_image_url;
        
        // Sign URLs if they're storage paths
        if (photoUrl && !photoUrl.startsWith('http')) {
          const { data: signedData } = await supabase.storage
            .from("user_photos")
            .createSignedUrl(photoUrl, 3600);
          photoUrl = signedData?.signedUrl || null;
        }
        
        if (coverUrl && !coverUrl.startsWith('http')) {
          const { data: signedData } = await supabase.storage
            .from("group_photos")
            .createSignedUrl(coverUrl, 3600);
          coverUrl = signedData?.signedUrl || null;
        }
        
        return {
          invite_id: invite.invite_id,
          group_id: invite.group_id,
          group_name: invite.group_name,
          group_description: invite.group_description,
          group_cover_image_url: coverUrl,
          group_member_count: invite.group_member_count,
          invited_by_id: invite.invited_by_id,
          invited_by_name: invite.invited_by_name,
          invited_by_photo_url: photoUrl,
          role: invite.role,
          message: invite.message,
          created_at: invite.created_at,
        };
      }));
      
      setGroupInvites(invites);
    } catch (err) {
      console.error("Error in loadGroupInvites:", err);
      setGroupInvites([]);
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
        
        // Skip if no access
        if (preview.access_level === 'none') continue;
        
        const req: MatchRequest = { 
          id: row.id, 
          other_user_id: otherId, 
          full_name: preview.full_name, 
          age: preview.age, 
          main_photo_url: preview.main_photo_url,
          bio: preview.bio,
          looking_for: preview.looking_for,
          status: row.status, 
          is_incoming: isIncoming, 
          sender_message: row.sender_message, 
          created_at: row.created_at,
          access_level: preview.access_level
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
          await Promise.all([
            loadRequests(uid),
            loadGroupInvites()
          ]);
        }
      };
      init();
    }, [loadUserId, loadRequests, loadGroupInvites])
  );

  // ================== HANDLERS ==================
  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      await Promise.all([
        loadRequests(userId),
        loadGroupInvites()
      ]);
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

  const handleAcceptGroupInvite = async (invite: GroupInvite) => {
    try {
      const { data, error } = await supabase.rpc('accept_group_invite', {
        p_invite_id: invite.invite_id
      });
      
      if (error) {
        console.error("Error accepting group invite:", error);
        Alert.alert("Error", "Failed to accept group invite");
        return;
      }
      
      Alert.alert("Success", `You've joined ${invite.group_name}!`);
      await loadGroupInvites();
    } catch (error) {
      console.error("Error accepting group invite:", error);
      Alert.alert("Error", "Failed to accept group invite");
    }
  };

  const handleDeclineGroupInvite = async (invite: GroupInvite) => {
    try {
      const { error } = await supabase.rpc('decline_group_invite', {
        p_invite_id: invite.invite_id
      });
      
      if (error) {
        console.error("Error declining group invite:", error);
        Alert.alert("Error", "Failed to decline group invite");
        return;
      }
      
      await loadGroupInvites();
    } catch (error) {
      console.error("Error declining group invite:", error);
      Alert.alert("Error", "Failed to decline group invite");
    }
  };

  const handleViewProfile = (request: MatchRequest) => {
    // Only navigate to full profile for users with 'full' access
    if (request.access_level === 'full') {
      router.push({ 
        pathname: "/(tabs_support)/other_profile", 
        params: { userId: request.other_user_id } 
      });
    } else if (request.access_level === 'limited') {
      // Show limited info alert for private profiles
      Alert.alert(
        "Private Profile",
        `${capitalizeName(request.full_name) || "This user"} has a private profile. You can see limited information until they accept your request or you become connected.`,
        [
          { text: "OK", style: "default" }
        ]
      );
    }
  };

  const handleViewGroupInvite = (invite: GroupInvite) => {
    router.push({
      pathname: "/(tabs_support)/detailed_group_request",
      params: { inviteId: invite.invite_id }
    });
  };

  const pendingCount = incomingRequests.filter(r => r.status === "pending").length + groupInvites.length;
  const currentRequests = requestsTab === "incoming" ? incomingRequests : outgoingRequests;
  const hasIncomingContent = currentRequests.length > 0 || (requestsTab === "incoming" && groupInvites.length > 0);

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
        ) : !hasIncomingContent ? (
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
            {/* Group Invites Section - Only show in incoming tab */}
            {requestsTab === "incoming" && groupInvites.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Group Invites</Text>
                {groupInvites.map((invite) => (
                  <GroupInviteRow
                    key={invite.invite_id}
                    invite={invite}
                    onPress={() => handleViewGroupInvite(invite)}
                    onAccept={() => handleAcceptGroupInvite(invite)}
                    onDecline={() => handleDeclineGroupInvite(invite)}
                  />
                ))}
                {currentRequests.length > 0 && (
                  <Text style={[styles.sectionTitle, { marginTop: verticalScale(16) }]}>Connection Requests</Text>
                )}
              </>
            )}
            
            {/* Connection Requests */}
            {currentRequests.map((r) => (
              <RequestRow 
                key={r.id} 
                request={r} 
                onPress={() => handleViewProfile(r)} 
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

  // Section Title
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(8),
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  requestRowLimited: {
    borderColor: "rgba(156,163,175,0.2)",
    backgroundColor: "#FAFAFA",
  },
  groupInviteRow: {
    borderColor: "rgba(27,68,205,0.15)",
    backgroundColor: "#FAFBFF",
  },
  requestAvatar: { 
    width: scale(56), 
    height: scale(56), 
    borderRadius: scale(28), 
    overflow: "hidden", 
    backgroundColor: "#E8F4FF", 
    marginRight: scale(14),
    position: "relative",
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
  groupPhotoPlaceholder: {
    backgroundColor: "rgba(27,68,205,0.1)",
  },
  limitedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: "rgba(107,114,128,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  groupBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  requestInfo: { 
    flex: 1, 
    marginRight: scale(12) 
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(2),
  },
  requestName: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: INK,
    flexShrink: 1,
  },
  privateBadge: {
    backgroundColor: "rgba(107,114,128,0.1)",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  privateBadgeText: {
    fontFamily: Fonts.primary,
    fontSize: scale(10),
    color: "rgba(107,114,128,0.8)",
  },
  groupTagBadge: {
    backgroundColor: "rgba(27,68,205,0.1)",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  groupTagBadgeText: {
    fontFamily: Fonts.primary,
    fontSize: scale(10),
    color: BLUE,
  },
  requestSubtext: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(13), 
    color: "rgba(10,14,26,0.6)", 
    marginBottom: verticalScale(2) 
  },
  requestBioSnippet: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(2),
  },
  requestMessage: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(12), 
    color: "rgba(10,14,26,0.5)", 
    fontStyle: "italic",
    marginBottom: verticalScale(2)
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginBottom: verticalScale(2),
  },
  groupMetaText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: "rgba(10,14,26,0.4)",
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

  // Right Section
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: {
    marginRight: scale(8),
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