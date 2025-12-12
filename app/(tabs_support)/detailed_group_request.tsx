// app/(tabs_support)/detailed_group_request.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface GroupMember {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
}

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  maxMembers: number;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}

interface GroupInvite {
  id: string;
  groupId: string;
  invitedBy: string;
  inviterName: string | null;
  role: "member" | "admin";
  message: string | null;
  createdAt: string;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Utilities
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const signPhotoUrl = async (urlOrPath: string | null, bucket = "user_photos"): Promise<string | null> => {
  if (!urlOrPath) return null;
  
  if (urlOrPath.startsWith("http") && urlOrPath.includes("?token=")) {
    return urlOrPath;
  }
  
  // If it's already a full public URL, return as is
  if (urlOrPath.startsWith("http") && !urlOrPath.includes("?token=")) {
    return urlOrPath;
  }
  
  let storagePath = urlOrPath;
  if (urlOrPath.startsWith("http")) {
    const markers = [`/object/sign/${bucket}/`, `/object/public/${bucket}/`, `/${bucket}/`];
    for (const m of markers) {
      const i = urlOrPath.indexOf(m);
      if (i !== -1) {
        storagePath = decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
        break;
      }
    }
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);
  
  if (error) {
    console.warn("signPhotoUrl error:", error.message);
    return urlOrPath;
  }
  
  return data?.signedUrl ?? urlOrPath;
};

const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return "Unknown";
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Member Row Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const MemberRow: React.FC<{ member: GroupMember }> = ({ member }) => {
  const roleColors = {
    owner: { bg: "#F59E0B", text: "#FFFFFF" },
    admin: { bg: BLUE, text: "#FFFFFF" },
    member: { bg: "#F0F4F9", text: "rgba(10,14,26,0.6)" },
  };
  
  const roleLabels = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
  };

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <Ionicons name="person" size={20} color="rgba(10,14,26,0.3)" />
          </View>
        )}
        {member.status === "pending" && (
          <View style={styles.pendingBadge}>
            <Ionicons name="time" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.fullName}</Text>
        {member.status === "pending" && (
          <Text style={styles.pendingText}>Pending invite</Text>
        )}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: roleColors[member.role].bg }]}>
        <Text style={[styles.roleBadgeText, { color: roleColors[member.role].text }]}>
          {roleLabels[member.role]}
        </Text>
      </View>
    </View>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function DetailedGroupRequestScreen() {
  const params = useLocalSearchParams<{ inviteId?: string }>();
  const inviteId = params.inviteId;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GroupMember[]>([]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Load Data
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const loadData = useCallback(async () => {
    if (!inviteId) {
      Alert.alert("Error", "No invite ID provided");
      router.back();
      return;
    }

    setLoading(true);
    try {
      // Get invite details
      const { data: inviteData, error: inviteError } = await supabase
        .from("group_invites")
        .select(`
          id,
          group_id,
          invited_by,
          role,
          message,
          status,
          created_at
        `)
        .eq("id", inviteId)
        .single();

      if (inviteError || !inviteData) {
        Alert.alert("Error", "Invite not found");
        router.back();
        return;
      }

      if (inviteData.status !== "pending") {
        Alert.alert("Notice", "This invite has already been responded to");
        router.back();
        return;
      }

      // Get inviter's name
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", inviteData.invited_by)
        .single();

      setInvite({
        id: inviteData.id,
        groupId: inviteData.group_id,
        invitedBy: inviteData.invited_by,
        inviterName: capitalizeName(inviterProfile?.full_name),
        role: inviteData.role,
        message: inviteData.message,
        createdAt: inviteData.created_at,
      });

      // Get group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          cover_image_url,
          member_count,
          max_members,
          is_private,
          created_by,
          created_at
        `)
        .eq("id", inviteData.group_id)
        .single();

      if (groupError || !groupData) {
        Alert.alert("Error", "Group not found");
        router.back();
        return;
      }

      // Sign cover image URL
      let coverUrl = groupData.cover_image_url;
      if (coverUrl) {
        coverUrl = await signPhotoUrl(coverUrl, "group_photos");
      }

      setGroup({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        coverImageUrl: coverUrl,
        memberCount: groupData.member_count,
        maxMembers: groupData.max_members,
        isPrivate: groupData.is_private,
        createdBy: groupData.created_by,
        createdAt: groupData.created_at,
      });

      // Get current members using RPC function (works for invitees too)
      const { data: membersData, error: membersError } = await supabase
        .rpc("get_group_members_for_invitee", {
          p_group_id: inviteData.group_id,
        });

      if (membersError) {
        console.warn("Error fetching members:", membersError.message);
      }

      if (membersData && membersData.length > 0) {
        const membersList: GroupMember[] = [];
        for (const m of membersData) {
          const signedUrl = await signPhotoUrl(m.avatar_url || null);

          membersList.push({
            id: m.user_id,
            userId: m.user_id,
            fullName: capitalizeName(m.full_name),
            avatarUrl: signedUrl,
            role: m.role as "owner" | "admin" | "member",
            status: "active",
          });
        }

        // Already sorted by RPC, but keep sort for safety
        membersList.sort((a, b) => {
          const order = { owner: 0, admin: 1, member: 2 };
          return order[a.role] - order[b.role];
        });

        setMembers(membersList);
      }

      // Get pending invites using RPC function (other people also invited)
      const { data: pendingData, error: pendingError } = await supabase
        .rpc("get_group_pending_invites_for_invitee", {
          p_group_id: inviteData.group_id,
          p_exclude_invite_id: inviteId,
        });

      if (pendingError) {
        console.warn("Error fetching pending invites:", pendingError.message);
      }

      if (pendingData && pendingData.length > 0) {
        const pendingList: GroupMember[] = [];
        for (const p of pendingData) {
          const signedUrl = await signPhotoUrl(p.avatar_url || null);

          pendingList.push({
            id: p.invite_id,
            userId: p.user_id,
            fullName: capitalizeName(p.full_name),
            avatarUrl: signedUrl,
            role: p.role as "admin" | "member",
            status: "pending",
          });
        }
        setPendingInvites(pendingList);
      }
    } catch (error) {
      console.error("Error loading group request:", error);
      Alert.alert("Error", "Failed to load group details");
    } finally {
      setLoading(false);
    }
  }, [inviteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Actions
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const handleAccept = async () => {
    if (!invite) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("accept_group_invite", {
        p_invite_id: invite.id,
      });

      if (error) {
        Alert.alert("Error", error.message || "Failed to accept invite");
        return;
      }

      Alert.alert("Success", `You've joined ${group?.name}!`, [
        { text: "OK", onPress: () => router.replace("/(tabs)/chat") }
      ]);
    } catch (error) {
      console.error("Error accepting invite:", error);
      Alert.alert("Error", "Failed to accept invite");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invite) return;

    Alert.alert(
      "Decline Invite",
      `Are you sure you want to decline the invite to ${group?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from("group_invites")
                .update({ status: "declined", responded_at: new Date().toISOString() })
                .eq("id", invite.id);

              if (error) {
                Alert.alert("Error", "Failed to decline invite");
                return;
              }

              router.back();
            } catch (error) {
              console.error("Error declining invite:", error);
              Alert.alert("Error", "Failed to decline invite");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Render
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group || !invite) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="rgba(10,14,26,0.3)" />
          <Text style={styles.errorText}>Group not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Invite</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Cover & Info */}
        <View style={styles.groupHeader}>
          <View style={styles.groupCoverContainer}>
            {group.coverImageUrl ? (
              <Image source={{ uri: group.coverImageUrl }} style={styles.groupCover} />
            ) : (
              <LinearGradient
                colors={[BLUE, "#6366F1"]}
                style={styles.groupCoverPlaceholder}
              >
                <Ionicons name="people" size={48} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
          </View>
          
          <Text style={styles.groupName}>{group.name}</Text>
          
          <View style={styles.groupMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={16} color="rgba(10,14,26,0.5)" />
              <Text style={styles.metaText}>
                {group.memberCount} / {group.maxMembers} members
              </Text>
            </View>
            {group.isPrivate && (
              <View style={styles.metaItem}>
                <Ionicons name="lock-closed" size={14} color="rgba(10,14,26,0.5)" />
                <Text style={styles.metaText}>Private</Text>
              </View>
            )}
          </View>

          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
        </View>

        {/* Invite Info */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteHeader}>
            <Ionicons name="mail" size={20} color={BLUE} />
            <Text style={styles.inviteTitle}>Invitation</Text>
          </View>
          <Text style={styles.inviteText}>
            <Text style={styles.inviterName}>{invite.inviterName}</Text>
            {" invited you to join as "}
            <Text style={styles.inviteRole}>{invite.role}</Text>
          </Text>
          {invite.message && (
            <View style={styles.inviteMessageBox}>
              <Text style={styles.inviteMessage}>"{invite.message}"</Text>
            </View>
          )}
          <Text style={styles.inviteTime}>{formatRelativeTime(invite.createdAt)}</Text>
        </View>

        {/* Members List */}
        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            Members ({members.length})
          </Text>
          <View style={styles.membersList}>
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </View>
        </View>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>
              Pending Invites ({pendingInvites.length})
            </Text>
            <View style={styles.membersList}>
              {pendingInvites.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.declineButton}
          onPress={handleDecline}
          disabled={processing}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Styles
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.05)",
  },
  headerBackBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: scale(40),
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
    paddingHorizontal: scale(40),
  },
  errorText: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
  },
  backButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: BLUE,
  },
  backButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(24),
  },

  // Group Header
  groupHeader: {
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  groupCoverContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    overflow: "hidden",
    marginBottom: verticalScale(16),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  groupCover: {
    width: "100%",
    height: "100%",
  },
  groupCoverPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(16),
    marginBottom: verticalScale(12),
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  metaText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
  groupDescription: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.7)",
    textAlign: "center",
    lineHeight: scale(22),
    paddingHorizontal: scale(20),
  },

  // Invite Card
  inviteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  inviteTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  inviteText: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.7)",
    lineHeight: scale(22),
  },
  inviterName: {
    fontFamily: Fonts.bold,
    color: INK,
  },
  inviteRole: {
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  inviteMessageBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: scale(12),
    padding: scale(14),
    marginTop: verticalScale(12),
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  inviteMessage: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    fontStyle: "italic",
  },
  inviteTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(12),
  },

  // Members Section
  membersSection: {
    marginBottom: verticalScale(24),
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    marginBottom: verticalScale(12),
    letterSpacing: -0.3,
  },
  membersList: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Member Row
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.05)",
  },
  memberAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    marginRight: scale(12),
    position: "relative",
  },
  memberAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(22),
  },
  memberAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: scale(22),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: -0.2,
  },
  pendingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "#F59E0B",
    marginTop: verticalScale(2),
  },
  roleBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  roleBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: "row",
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(24),
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: "rgba(10,14,26,0.05)",
  },
  declineButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    borderRadius: scale(16),
    backgroundColor: "rgba(10,14,26,0.08)",
  },
  declineButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "rgba(10,14,26,0.6)",
    letterSpacing: -0.3,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(16),
    borderRadius: scale(16),
    backgroundColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
});