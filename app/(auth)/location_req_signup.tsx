import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationPinsHero } from "../../components/MapPins";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

export default function LocationReqSignup() {
  const [loading, setLoading] = useState(false);

  const askLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert("Permission needed", "Please allow location access.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      console.log("Got coords:", pos.coords);
      router.push("/notification_signup");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Enable Location</Text>
          <Text style={styles.pageSubtitle}>
            Find people nearby and connect with your community
          </Text>
        </View>

        <View style={styles.animationContainer}>
          <LocationPinsHero />
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            onPress={askLocation}
            disabled={loading}
            style={[styles.locationButton, loading && styles.locationButtonDisabled]}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.locationButtonText}>Getting location...</Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name="location"
                  size={22}
                  color="#FFFFFF"
                  style={{ marginRight: scale(8) }}
                />
                <Text style={styles.locationButtonText}>Enable Location</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoNote}>
            <View style={styles.infoIconCircle}>
              <Ionicons
                name="information-circle"
                size={18}
                color={Colors.BLUE}
              />
            </View>
            <Text style={styles.infoNoteText}>
              We use your location to show you people nearby. You can change this anytime in settings.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(32),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerSection: {
    marginBottom: verticalScale(24),
  },
  pageTitle: {
    fontSize: moderateScale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(22),
  },
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    paddingBottom: verticalScale(40),
  },
  locationButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: verticalScale(16),
  },
  locationButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  locationButtonText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  infoIconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(2),
  },
  infoNoteText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
  },
});