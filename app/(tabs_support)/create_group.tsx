// app/(tabs_support)/create_group.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type MatchedUser = {
  id: string;
  fullName: string;
  age: number | null;
  avatarUrl: string | null;
};

type SelectedUser = {
  user: MatchedUser;
  role: "member" | "admin";
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Filter matched users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return matchedUsers;
    const query = searchQuery.toLowerCase().trim();
    return matchedUsers.filter(user =>
      user.fullName.toLowerCase().includes(query)
    );
  }, [matchedUsers, searchQuery]);

  // Helper function to sign photo URLs
  const signPhotoUrl = async (urlOrPath: string | null): Promise<string | null> => {
    if (!urlOrPath) return null;
    
    if (urlOrPath.startsWith("http") && urlOrPath.includes("?token=")) {
      return urlOrPath;
    }
    
    let storagePath = urlOrPath;
    if (urlOrPath.startsWith("http")) {
      const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
      for (const m of markers) {
        const i = urlOrPath.indexOf(m);
        if (i !== -1) {
          storagePath = decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
          break;
        }
      }
    }
    
    const { data, error } = await supabase.storage
      .from("user_photos")
      .createSignedUrl(storagePath, 3600);
    
    if (error) {
      console.warn("signPhotoUrl error:", error.message);
      return urlOrPath;
    }
    
    return data?.signedUrl ?? urlOrPath;
  };

  // Helper function to capitalize names
  const capitalizeName = (name: string | null | undefined): string => {
    if (!name) return "Unknown";
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Pick group photo
  const pickGroupPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to add a group photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Upload group photo to storage
  const uploadGroupPhoto = async (groupId: string): Promise<string | null> => {
    if (!groupPhoto) return null;

    setUploadingPhoto(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) return null;

      // Get file extension
      const uriParts = groupPhoto.split(".");
      const fileExt = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";
      const fileName = `${groupId}/cover.${fileExt}`;
      const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      // Fetch the image and convert to base64
      const response = await fetch(groupPhoto);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data:image/xxx;base64, prefix
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Decode base64 to Uint8Array for upload
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to group_photos bucket
      const { data, error } = await supabase.storage
        .from("group_photos")
        .upload(fileName, bytes, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error("Error uploading group photo:", error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("group_photos")
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error("Error in uploadGroupPhoto:", error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Fetch matched users (accepted match requests)
  const fetchMatchedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setMatchedUsers([]);
        return;
      }

      // Get all accepted match requests where user is either requester or target
      const { data: matchData, error: matchError } = await supabase
        .from("match_requests")
        .select(`
          id,
          requester_id,
          target_id
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`);

      if (matchError) {
        console.error("Error fetching matches:", matchError);
        setMatchedUsers([]);
        return;
      }

      if (!matchData || matchData.length === 0) {
        setMatchedUsers([]);
        return;
      }

      // Get the other user's ID from each match
      const otherUserIds = matchData.map(match => 
        match.requester_id === userId ? match.target_id : match.requester_id
      );

      // Fetch profiles for all matched users
      const userPromises = otherUserIds.map(async (otherUserId) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, age")
          .eq("id", otherUserId)
          .single();

        // Get main photo
        const { data: photoData } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", otherUserId)
          .eq("is_main", true)
          .maybeSingle();

        const signedAvatarUrl = await signPhotoUrl(photoData?.photo_url || null);

        return {
          id: otherUserId,
          fullName: capitalizeName(profileData?.full_name),
          age: profileData?.age || null,
          avatarUrl: signedAvatarUrl,
        } as MatchedUser;
      });

      const users = await Promise.all(userPromises);
      setMatchedUsers(users);
    } catch (error) {
      console.error("Error in fetchMatchedUsers:", error);
      setMatchedUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatchedUsers();
  }, [fetchMatchedUsers]);

  // Toggle user selection
  const toggleUserSelection = (user: MatchedUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(s => s.user.id === user.id);
      if (exists) {
        return prev.filter(s => s.user.id !== user.id);
      } else {
        return [...prev, { user, role: "member" }];
      }
    });
  };

  // Toggle user role between member and admin
  const toggleUserRole = (userId: string) => {
    setSelectedUsers(prev =>
      prev.map(s =>
        s.user.id === userId
          ? { ...s, role: s.role === "member" ? "admin" : "member" }
          : s
      )
    );
  };

  // Check if user is selected
  const isUserSelected = (userId: string) => {
    return selectedUsers.some(s => s.user.id === userId);
  };

  // Get selected user's role
  const getSelectedUserRole = (userId: string) => {
    return selectedUsers.find(s => s.user.id === userId)?.role || "member";
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    if (groupName.trim().length < 2) {
      Alert.alert("Error", "Group name must be at least 2 characters");
      return;
    }

    setCreating(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        Alert.alert("Error", "You must be logged in to create a group");
        return;
      }

      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: groupName.trim(),
          description: description.trim() || null,
          created_by: userId,
          max_members: 50,
          is_private: false,
        })
        .select()
        .single();

      if (groupError) {
        console.error("Error creating group:", groupError);
        Alert.alert("Error", "Failed to create group. Please try again.");
        return;
      }

      // Upload group photo if selected
      if (groupPhoto) {
        const photoUrl = await uploadGroupPhoto(groupData.id);
        if (photoUrl) {
          // Update group with cover image URL
          await supabase
            .from("groups")
            .update({ cover_image_url: photoUrl })
            .eq("id", groupData.id);
        }
      }

      // Now send invites to selected users (using group_invites table)
      if (selectedUsers.length > 0) {
        const inviteInserts = selectedUsers.map(s => ({
          group_id: groupData.id,
          invited_by: userId,
          invited_user_id: s.user.id,
          role: s.role,
          status: "pending",
        }));

        const { error: invitesError } = await supabase
          .from("group_invites")
          .insert(inviteInserts);

        if (invitesError) {
          console.error("Error sending invites:", invitesError);
          // Group was created, but invites failed - don't fail completely
          Alert.alert(
            "Partial Success",
            "Group was created but some invites could not be sent. You can invite them later.",
            [{ text: "OK", onPress: () => router.back() }]
          );
          return;
        }
      }

      Alert.alert(
        "Success",
        `Group "${groupName.trim()}" has been created!${selectedUsers.length > 0 ? ` Invites sent to ${selectedUsers.length} people.` : ""}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error in handleCreateGroup:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={INK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Group</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoContainer}
              activeOpacity={0.8}
              onPress={pickGroupPhoto}
            >
              {groupPhoto ? (
                <Image source={{ uri: groupPhoto }} style={styles.groupPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={32} color={BLUE} />
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Ionicons name="pencil" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Group Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter group name"
              placeholderTextColor="rgba(10,14,26,0.35)"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
            />
            <Text style={styles.charCount}>{groupName.length}/100</Text>
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="What's this group about?"
              placeholderTextColor="rgba(10,14,26,0.35)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Add Members Section */}
          <View style={styles.membersSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="people" size={20} color={BLUE} />
                <Text style={styles.sectionTitle}>Invite Members</Text>
              </View>
              {selectedUsers.length > 0 && (
                <View style={styles.selectedCountBadge}>
                  <Text style={styles.selectedCountText}>
                    {selectedUsers.length} selected
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              Select from your matches to invite to this group
            </Text>

            {/* Search Bar */}
            {matchedUsers.length > 0 && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(10,14,26,0.4)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name..."
                  placeholderTextColor="rgba(10,14,26,0.35)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color="rgba(10,14,26,0.3)" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BLUE} />
              </View>
            ) : matchedUsers.length === 0 ? (
              <View style={styles.emptyMatches}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="heart-outline" size={32} color={BLUE} />
                </View>
                <Text style={styles.emptyText}>No matches yet</Text>
                <Text style={styles.emptySubtext}>
                  Connect with people first to invite them to groups
                </Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.emptyMatches}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={32} color={BLUE} />
                </View>
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              <View style={styles.usersList}>
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelected={isUserSelected(user.id)}
                    role={getSelectedUserRole(user.id)}
                    onToggleSelect={() => toggleUserSelection(user)}
                    onToggleRole={() => toggleUserRole(user.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Admin Permission Note */}
          {selectedUsers.some(s => s.role === "admin") && (
            <View style={styles.adminNote}>
              <Ionicons name="shield-checkmark" size={18} color={BLUE} />
              <Text style={styles.adminNoteText}>
                Admins can add/remove members and manage the group
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Create Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!groupName.trim() || creating || uploadingPhoto) && styles.createButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || creating || uploadingPhoto}
          >
            {creating || uploadingPhoto ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Group</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type UserRowProps = {
  user: MatchedUser;
  isSelected: boolean;
  role: "member" | "admin";
  onToggleSelect: () => void;
  onToggleRole: () => void;
};

const UserRow: React.FC<UserRowProps> = ({
  user,
  isSelected,
  role,
  onToggleSelect,
  onToggleRole,
}) => (
  <View style={styles.userRow}>
    <TouchableOpacity
      style={styles.userRowMain}
      activeOpacity={0.7}
      onPress={onToggleSelect}
    >
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
      
      <View style={styles.userAvatar}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={BLUE} />
          </View>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.fullName}</Text>
        {user.age && <Text style={styles.userAge}>{user.age} years old</Text>}
      </View>
    </TouchableOpacity>

    {isSelected && (
      <TouchableOpacity
        style={[styles.roleButton, role === "admin" && styles.roleButtonAdmin]}
        activeOpacity={0.7}
        onPress={onToggleRole}
      >
        <Ionicons 
          name={role === "admin" ? "shield" : "person"} 
          size={14} 
          color={role === "admin" ? "#FFFFFF" : BLUE} 
        />
        <Text style={[styles.roleText, role === "admin" && styles.roleTextAdmin]}>
          {role === "admin" ? "Admin" : "Member"}
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Styles
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
  },
  headerButton: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    letterSpacing: -0.3,
  },

  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },

  // Photo Section
  photoSection: {
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  photoContainer: {
    position: "relative",
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    overflow: "visible",
  },
  groupPhoto: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
  },
  photoPlaceholder: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(10,14,26,0.08)",
    borderStyle: "dashed",
  },
  photoPlaceholderText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: BLUE,
    marginTop: verticalScale(4),
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: BG,
  },

  inputSection: {
    marginBottom: verticalScale(24),
  },
  inputLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    marginBottom: verticalScale(8),
    letterSpacing: -0.2,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    color: INK,
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.08)",
  },
  textArea: {
    minHeight: verticalScale(100),
    paddingTop: verticalScale(14),
  },
  charCount: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    textAlign: "right",
    marginTop: verticalScale(4),
  },

  membersSection: {
    marginBottom: verticalScale(16),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(16),
  },
  selectedCountBadge: {
    backgroundColor: BLUE,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  selectedCountText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "#FFFFFF",
  },

  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.08)",
    gap: scale(10),
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: INK,
    padding: 0,
  },

  loadingContainer: {
    paddingVertical: verticalScale(40),
    alignItems: "center",
  },

  emptyMatches: {
    alignItems: "center",
    paddingVertical: verticalScale(32),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
  },
  emptyIcon: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(12),
  },
  emptyText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    marginBottom: verticalScale(4),
  },
  emptySubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
    paddingHorizontal: scale(20),
  },

  usersList: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    overflow: "hidden",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.05)",
  },
  userRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  checkbox: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: "rgba(10,14,26,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  userAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: -0.2,
  },
  userAge: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(2),
  },
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: "#F0F4F9",
  },
  roleButtonAdmin: {
    backgroundColor: BLUE,
  },
  roleText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: BLUE,
  },
  roleTextAdmin: {
    color: "#FFFFFF",
  },

  adminNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(67,113,255,0.08)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
  },
  adminNoteText: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: INK,
    lineHeight: scale(18),
  },

  bottomContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(24),
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: "rgba(10,14,26,0.05)",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(16),
    borderRadius: scale(16),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: "rgba(10,14,26,0.2)",
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
});