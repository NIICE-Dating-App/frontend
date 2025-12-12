// app/(tabs_support)/group_details.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
  joinedAt: string;
  accessLevel: "full" | "limited" | "none";
  isMatched: boolean;
  canSendRequest: boolean;
  hasPendingRequest: boolean;
  age?: number;
  bio?: string;
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
  inviteCode: string;
}

interface MatchedUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

interface PendingInvite {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  invitedAt: string;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Utilities
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const signPhotoUrl = async (urlOrPath: string | null, bucket = "user_photos"): Promise<string | null> => {
  if (!urlOrPath) return null;
  
  if (urlOrPath.startsWith("http") && urlOrPath.includes("?token=")) {
    return urlOrPath;
  }
  
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

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Member Row Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const MemberRow: React.FC<{
  member: GroupMember;
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId: string;
  onRemove: (userId: string) => void;
  onChangeRole: (userId: string, newRole: "admin" | "member") => void;
  onPress: (member: GroupMember) => void;
}> = ({ member, isAdmin, isOwner, currentUserId, onRemove, onChangeRole, onPress }) => {
  const canManage = (isOwner || isAdmin) && member.userId !== currentUserId && member.role !== "owner";
  const isSelf = member.userId === currentUserId;
  
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

  const handlePress = () => {
    if (!isSelf) {
      onPress(member);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.memberRow} 
      onPress={handlePress}
      disabled={isSelf}
      activeOpacity={isSelf ? 1 : 0.7}
    >
      <View style={styles.memberAvatar}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} />
        ) : (
          <View style={styles.memberAvatarPlaceholder}>
            <Ionicons name="person" size={20} color="rgba(10,14,26,0.3)" />
          </View>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.fullName}
          {isSelf && " (You)"}
        </Text>
        <Text style={styles.memberJoined}>Joined {formatDate(member.joinedAt)}</Text>
      </View>
      <View style={styles.memberActions}>
        <View style={[styles.roleBadge, { backgroundColor: roleColors[member.role].bg }]}>
          <Text style={[styles.roleBadgeText, { color: roleColors[member.role].text }]}>
            {roleLabels[member.role]}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.memberMenuBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Alert.alert(
                member.fullName,
                "Choose an action",
                [
                  member.role === "member" && isOwner
                    ? { text: "Make Admin", onPress: () => onChangeRole(member.userId, "admin") }
                    : null,
                  member.role === "admin" && isOwner
                    ? { text: "Remove Admin", onPress: () => onChangeRole(member.userId, "member") }
                    : null,
                  { text: "Remove from Group", style: "destructive", onPress: () => onRemove(member.userId) },
                  { text: "Cancel", style: "cancel" },
                ].filter(Boolean) as any[]
              );
            }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="rgba(10,14,26,0.4)" />
          </TouchableOpacity>
        )}
        {!isSelf && !canManage && (
          <Ionicons name="chevron-forward" size={18} color="rgba(10,14,26,0.3)" />
        )}
      </View>
    </TouchableOpacity>
  );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function GroupDetailsScreen() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const groupId = params.groupId;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"owner" | "admin" | "member" | null>(null);
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin" || isOwner;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Load Data
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const loadData = useCallback(async () => {
    if (!groupId) {
      Alert.alert("Error", "No group ID provided");
      router.back();
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Not authenticated");
        router.back();
        return;
      }
      setCurrentUserId(user.id);

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
          created_at,
          invite_code
        `)
        .eq("id", groupId)
        .single();

      if (groupError || !groupData) {
        Alert.alert("Error", "Group not found");
        router.back();
        return;
      }

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
        inviteCode: groupData.invite_code,
      });

      // Get members using RPC function for proper access levels
      const { data: membersData, error: membersError } = await supabase
        .rpc("get_group_members_with_connections", {
          p_group_id: groupId,
        });

      if (membersError) {
        console.warn("Error fetching members via RPC:", membersError.message);
      }

      // Also get current user's membership info
      const { data: currentUserMembership } = await supabase
        .from("group_members")
        .select(`
          user_id,
          role,
          joined_at,
          profiles (
            id,
            full_name
          )
        `)
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

      const membersList: GroupMember[] = [];

      // Add current user first
      if (currentUserMembership) {
        const profile = currentUserMembership.profiles as any;
        
        const { data: photoData } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", user.id)
          .eq("is_main", true)
          .maybeSingle();

        const signedUrl = await signPhotoUrl(photoData?.photo_url || null);

        membersList.push({
          id: user.id,
          userId: user.id,
          fullName: capitalizeName(profile?.full_name),
          avatarUrl: signedUrl,
          role: currentUserMembership.role as "owner" | "admin" | "member",
          joinedAt: currentUserMembership.joined_at,
          accessLevel: "full",
          isMatched: false,
          canSendRequest: false,
          hasPendingRequest: false,
        });

        setCurrentUserRole(currentUserMembership.role as "owner" | "admin" | "member");
      }

      // Add other members from RPC result
      if (membersData && membersData.length > 0) {
        for (const m of membersData) {
          const signedUrl = await signPhotoUrl(m.main_photo_url || null);

          membersList.push({
            id: m.user_id,
            userId: m.user_id,
            fullName: capitalizeName(m.full_name),
            avatarUrl: signedUrl,
            role: m.role as "owner" | "admin" | "member",
            joinedAt: m.joined_at,
            accessLevel: m.access_level as "full" | "limited" | "none",
            isMatched: m.is_matched,
            canSendRequest: m.can_send_request,
            hasPendingRequest: m.has_pending_request,
            age: m.age,
            bio: m.bio,
          });
        }
      }

      // Sort: owner first, then admins, then members
      membersList.sort((a, b) => {
        const order = { owner: 0, admin: 1, member: 2 };
        return order[a.role] - order[b.role];
      });

      setMembers(membersList);

      // Load pending invites for this group
      const { data: pendingData } = await supabase
        .from("group_invites")
        .select("id, invited_user_id, role, created_at")
        .eq("group_id", groupId)
        .eq("status", "pending");

      if (pendingData && pendingData.length > 0) {
        const pendingList: PendingInvite[] = [];
        
        for (const p of pendingData) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", p.invited_user_id)
            .single();

          const { data: photoData } = await supabase
            .from("user_photos")
            .select("photo_url")
            .eq("user_id", p.invited_user_id)
            .eq("is_main", true)
            .maybeSingle();

          const signedUrl = await signPhotoUrl(photoData?.photo_url || null);

          pendingList.push({
            id: p.id,
            userId: p.invited_user_id,
            fullName: capitalizeName(profileData?.full_name),
            avatarUrl: signedUrl,
            role: p.role as "admin" | "member",
            invitedAt: p.created_at,
          });
        }
        
        setPendingInvites(pendingList);
      } else {
        setPendingInvites([]);
      }
    } catch (error) {
      console.error("Error loading group details:", error);
      Alert.alert("Error", "Failed to load group details");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Load Matched Users for Inviting
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const loadMatchedUsers = useCallback(async () => {
    if (!currentUserId || !groupId) return;

    setLoadingMatches(true);
    try {
      // Get all accepted matches
      const { data: matchData } = await supabase
        .from("match_requests")
        .select("requester_id, target_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`);

      if (!matchData) {
        setMatchedUsers([]);
        return;
      }

      // Get other user IDs from matches
      const otherUserIds = matchData.map(m => 
        m.requester_id === currentUserId ? m.target_id : m.requester_id
      );

      // Filter out users who are already members
      const memberIds = members.map(m => m.userId);
      const eligibleUserIds = otherUserIds.filter(id => !memberIds.includes(id));

      // Get pending invites for this group
      const { data: pendingInvitesData } = await supabase
        .from("group_invites")
        .select("invited_user_id")
        .eq("group_id", groupId)
        .eq("status", "pending");

      const pendingUserIds = pendingInvitesData?.map(i => i.invited_user_id) || [];
      const finalEligibleIds = eligibleUserIds.filter(id => !pendingUserIds.includes(id));

      // Get profiles for eligible users
      const users: MatchedUser[] = [];
      for (const userId of finalEligibleIds) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", userId)
          .single();

        const { data: photoData } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", userId)
          .eq("is_main", true)
          .maybeSingle();

        const signedUrl = await signPhotoUrl(photoData?.photo_url || null);

        users.push({
          id: userId,
          fullName: capitalizeName(profileData?.full_name),
          avatarUrl: signedUrl,
        });
      }

      setMatchedUsers(users);
    } catch (error) {
      console.error("Error loading matched users:", error);
    } finally {
      setLoadingMatches(false);
    }
  }, [currentUserId, groupId, members]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Actions
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const handleInviteUser = async (userId: string) => {
    if (!currentUserId || !groupId) return;

    setInviting(true);
    try {
      const { data: insertedInvite, error } = await supabase
        .from("group_invites")
        .insert({
          group_id: groupId,
          invited_by: currentUserId,
          invited_user_id: userId,
          role: "member",
        })
        .select("id, created_at")
        .single();

      if (error) {
        Alert.alert("Error", "Failed to send invite");
        return;
      }

      // Find the user from matchedUsers to add to pendingInvites
      const invitedUser = matchedUsers.find(u => u.id === userId);
      if (invitedUser && insertedInvite) {
        setPendingInvites(prev => [...prev, {
          id: insertedInvite.id,
          userId: userId,
          fullName: invitedUser.fullName,
          avatarUrl: invitedUser.avatarUrl,
          role: "member",
          invitedAt: insertedInvite.created_at,
        }]);
      }

      // Remove from available users
      setMatchedUsers(prev => prev.filter(u => u.id !== userId));
      Alert.alert("Success", "Invitation sent!");
    } catch (error) {
      console.error("Error inviting user:", error);
      Alert.alert("Error", "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("group_members")
                .delete()
                .eq("group_id", groupId)
                .eq("user_id", userId);

              if (error) {
                Alert.alert("Error", "Failed to remove member");
                return;
              }

              setMembers(prev => prev.filter(m => m.userId !== userId));
              
              // Update member count
              if (group) {
                setGroup({ ...group, memberCount: group.memberCount - 1 });
              }
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (userId: string, newRole: "admin" | "member") => {
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) {
        Alert.alert("Error", "Failed to update role");
        return;
      }

      setMembers(prev => prev.map(m => 
        m.userId === userId ? { ...m, role: newRole } : m
      ));
    } catch (error) {
      console.error("Error changing role:", error);
      Alert.alert("Error", "Failed to update role");
    }
  };

  const handleMemberPress = (member: GroupMember) => {
    // Navigate to other_profile with the member's user ID
    // Group members can always view each other's profiles
    router.push({
      pathname: "/(tabs_support)/other_profile",
      params: { 
        userId: member.userId,
        fromGroup: groupId, // Pass group context for potential match actions
      },
    });
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId || !groupId) return;

    if (isOwner) {
      Alert.alert(
        "Cannot Leave",
        "As the owner, you must delete the group or transfer ownership before leaving."
      );
      return;
    }

    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("group_members")
                .delete()
                .eq("group_id", groupId)
                .eq("user_id", currentUserId);

              if (error) {
                Alert.alert("Error", "Failed to leave group");
                return;
              }

              router.replace("/(tabs)/chat");
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave group");
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;

    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("groups")
                .delete()
                .eq("id", groupId);

              if (error) {
                Alert.alert("Error", "Failed to delete group");
                return;
              }

              router.replace("/(tabs)/chat");
            } catch (error) {
              console.error("Error deleting group:", error);
              Alert.alert("Error", "Failed to delete group");
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

  if (!group) {
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

  const filteredUsers = matchedUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Header */}
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

          <Text style={styles.createdText}>
            Created {formatDate(group.createdAt)}
          </Text>
        </View>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => {
                loadMatchedUsers();
                setShowInviteModal(true);
              }}
            >
              <View style={styles.adminButtonIcon}>
                <Ionicons name="person-add" size={20} color={BLUE} />
              </View>
              <View style={styles.adminButtonInfo}>
                <Text style={styles.adminButtonTitle}>Invite People</Text>
                <Text style={styles.adminButtonSubtitle}>Add your matches to this group</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          <View style={styles.membersList}>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isAdmin={isAdmin}
                isOwner={isOwner}
                currentUserId={currentUserId || ""}
                onRemove={handleRemoveMember}
                onChangeRole={handleChangeRole}
                onPress={handleMemberPress}
              />
            ))}
          </View>
        </View>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <View style={styles.membersSection}>
            <Text style={styles.sectionTitle}>Pending Invites ({pendingInvites.length})</Text>
            <View style={styles.membersList}>
              {pendingInvites.map((invite) => (
                <View key={invite.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    {invite.avatarUrl ? (
                      <Image source={{ uri: invite.avatarUrl }} style={styles.memberAvatarImage} />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color="rgba(10,14,26,0.3)" />
                      </View>
                    )}
                    {/* Pending indicator */}
                    <View style={styles.pendingIndicator}>
                      <Ionicons name="time" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{invite.fullName}</Text>
                      <View style={[styles.roleBadge, styles.pendingBadge]}>
                        <Text style={[styles.roleBadgeText, styles.pendingBadgeText]}>Pending</Text>
                      </View>
                      {invite.role === "admin" && (
                        <View style={[styles.roleBadge, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
                          <Text style={[styles.roleBadgeText, { color: "#3B82F6" }]}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberSubtext}>Invited â€¢ Awaiting response</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.sectionTitleDanger}>Danger Zone</Text>
          
          {!isOwner && (
            <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveGroup}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Leave Group</Text>
            </TouchableOpacity>
          )}
          
          {isOwner && (
            <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteGroup}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Delete Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={28} color={INK} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite People</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(10,14,26,0.4)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your matches..."
              placeholderTextColor="rgba(10,14,26,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loadingMatches ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={BLUE} />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyMatches}>
              <Ionicons name="people-outline" size={48} color="rgba(10,14,26,0.2)" />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matches found" : "No eligible matches to invite"}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? "Try a different search" : "All your matches are already members or have pending invites"}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalList}>
              {filteredUsers.map((user) => (
                <View key={user.id} style={styles.inviteRow}>
                  <View style={styles.inviteAvatar}>
                    {user.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.inviteAvatarImage} />
                    ) : (
                      <View style={styles.inviteAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color="rgba(10,14,26,0.3)" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.inviteName}>{user.fullName}</Text>
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() => handleInviteUser(user.id)}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.inviteButtonText}>Invite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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

  // Loading & Error
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
    paddingBottom: verticalScale(40),
  },

  // Group Header
  groupHeader: {
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  groupCoverContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
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
    fontSize: scale(22),
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
    marginBottom: verticalScale(8),
  },
  createdText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.4)",
  },

  // Admin Section
  adminSection: {
    marginBottom: verticalScale(24),
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    gap: scale(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminButtonIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  adminButtonInfo: {
    flex: 1,
  },
  adminButtonTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  adminButtonSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(2),
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
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: scale(6),
  },
  memberName: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: -0.2,
  },
  memberSubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(2),
  },
  memberJoined: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(2),
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
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
  pendingIndicator: {
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
  pendingBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  pendingBadgeText: {
    color: "#F59E0B",
  },
  memberMenuBtn: {
    width: scale(32),
    height: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },

  // Danger Section
  dangerSection: {
    marginTop: verticalScale(8),
  },
  sectionTitleDanger: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#EF4444",
    marginBottom: verticalScale(12),
    letterSpacing: -0.3,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  dangerButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#EF4444",
    letterSpacing: -0.3,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.05)",
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    letterSpacing: -0.3,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    marginHorizontal: scale(20),
    marginVertical: verticalScale(16),
    gap: scale(10),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.08)",
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: INK,
    padding: 0,
  },
  modalLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  emptyMatches: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(40),
  },
  emptyText: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    marginTop: verticalScale(16),
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(8),
    textAlign: "center",
    lineHeight: scale(20),
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inviteAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    marginRight: scale(12),
  },
  inviteAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(22),
  },
  inviteAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: scale(22),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteName: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: -0.2,
  },
  inviteButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    backgroundColor: BLUE,
  },
  inviteButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },
});