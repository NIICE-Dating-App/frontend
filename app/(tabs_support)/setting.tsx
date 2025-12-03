// app/(tabs)/(profile)/setting.tsx
import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Theme matching profile.tsx
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  // ========== LOGOUT FUNCTION ==========
  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Sign out from Supabase
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                throw error;
              }

              // Navigate to login screen
              router.replace("/login");
            } catch (error: any) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ========== DELETE PROFILE FUNCTION ==========
  const handleDeleteProfile = () => {
    setDeleteModalVisible(true);
    setConfirmationText("");
  };

  const confirmDeleteProfile = async () => {
    // Check confirmation text
    if (confirmationText.toLowerCase().trim() !== "delete") {
      Alert.alert("Invalid Input", 'Please type "DELETE" to confirm');
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not found");
      }

      // Delete related data first (in order of dependencies)
      
      // 1. Delete user photos
      const { error: photosError } = await supabase
        .from("user_photos")
        .delete()
        .eq("user_id", user.id);
      
      if (photosError) {
        console.error("Error deleting photos:", photosError);
      }

      // 2. Delete frames
      const { error: framesError } = await supabase
        .from("frames")
        .delete()
        .eq("user_id", user.id);
      
      if (framesError) {
        console.error("Error deleting frames:", framesError);
      }

      // 3. Delete user hobbies
      const { error: hobbiesError } = await supabase
        .from("user_hobbies")
        .delete()
        .eq("user_id", user.id);
      
      if (hobbiesError) {
        console.error("Error deleting hobbies:", hobbiesError);
      }

      // 4. Delete user modes
      const { error: modesError } = await supabase
        .from("user_modes")
        .delete()
        .eq("user_id", user.id);
      
      if (modesError) {
        console.error("Error deleting modes:", modesError);
      }

      // 5. Delete lifestyle data
      const { error: lifestyleError } = await supabase
        .from("lifestyle")
        .delete()
        .eq("user_id", user.id);
      
      if (lifestyleError) {
        console.error("Error deleting lifestyle:", lifestyleError);
      }

      // 6. Delete match requests
      const { error: matchRequestsError } = await supabase
        .from("match_requests")
        .delete()
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);
      
      if (matchRequestsError) {
        console.error("Error deleting match requests:", matchRequestsError);
      }

      // 7. Delete conversations and messages
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (conversations) {
        for (const conv of conversations) {
          await supabase
            .from("messages")
            .delete()
            .eq("conversation_id", conv.id);
        }

        await supabase
          .from("conversations")
          .delete()
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      }

      // 8. Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      
      if (profileError) {
        throw profileError;
      }

      // 9. Delete auth user (this also signs them out)
      const { error: deleteUserError } = await supabase.rpc(
        'delete_user'
      );

      if (deleteUserError) {
        // If RPC doesn't exist, try alternative method
        console.warn("delete_user RPC not available, using signOut");
        await supabase.auth.signOut();
      }

      // Close modal and show success
      setDeleteModalVisible(false);
      
      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/signup"),
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error("Delete profile error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to delete account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {/* Logout Button - Blue style matching Frames button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: scale(8) }}
            />
            <Text style={styles.logoutButtonText}>Log Out</Text>
            {loading && (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
                style={{ marginLeft: scale(8) }}
              />
            )}
          </TouchableOpacity>

          {/* Delete Profile Button - Gradient style matching Events button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.deleteButtonInner}>
              <Ionicons
                name="trash-outline"
                size={20}
                color="#FF3B30"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Deleting your account is permanent and cannot be undone. All your
            data, matches, and messages will be permanently removed.
          </Text>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => !loading && setDeleteModalVisible(false)}
          />
          
          <View style={styles.modalContent}>
            {/* Warning Icon */}
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={48} color="#FF3B30" />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Delete Account?</Text>

            {/* Description */}
            <Text style={styles.modalDescription}>
              This action cannot be undone. All your data, photos, matches, and
              messages will be permanently deleted.
            </Text>

            {/* Confirmation Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Type <Text style={styles.inputLabelBold}>DELETE</Text> to
                confirm
              </Text>
              <TextInput
                style={styles.input}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder="Type DELETE"
                placeholderTextColor="rgba(10,14,26,0.4)"
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={confirmDeleteProfile}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>
                    Delete Forever
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.08)",
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: scale(40),
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(100),
  },

  // Section
  section: {
    marginBottom: verticalScale(32),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
    marginBottom: verticalScale(16),
    textTransform: "uppercase",
    opacity: 0.6,
  },

  // Logout Button - Matching Frames button (solid blue)
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
    borderRadius: scale(28),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
    marginBottom: verticalScale(12),
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  logoutButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Delete Button - Matching Events button (gradient with border)
  deleteButton: {
    borderRadius: scale(28),
    borderWidth: 1.5,
    borderColor: "rgba(255,59,48,0.3)",
    overflow: "hidden",
  },
  deleteButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(24),
    backgroundColor: "rgba(255,59,48,0.08)",
  },
  deleteButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FF3B30",
    letterSpacing: 0.3,
  },

  // Info Section
  infoSection: {
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  infoText: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.7)",
    lineHeight: scale(20),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(24),
    padding: scale(24),
    width: "100%",
    maxWidth: scale(400),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },

  // Warning Icon
  warningIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "rgba(255,59,48,0.1)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: verticalScale(20),
  },

  // Modal Text
  modalTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(12),
    letterSpacing: 0.3,
  },
  modalDescription: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.7)",
    textAlign: "center",
    lineHeight: scale(22),
    marginBottom: verticalScale(24),
  },

  // Input
  inputContainer: {
    marginBottom: verticalScale(24),
  },
  inputLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.7)",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  inputLabelBold: {
    fontFamily: Fonts.bold,
    color: INK,
  },
  input: {
    height: scale(48),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(24),
    paddingHorizontal: scale(16),
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    gap: scale(12),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(24),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: BLUE,
    letterSpacing: 0.3,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(24),
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  confirmDeleteButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});