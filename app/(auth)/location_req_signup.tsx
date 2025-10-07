import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../../components/BackButton";
import { LocationPinsHero } from "../../components/MapPins";
import { Fonts } from "../../constants/theme";

const BG = "#EEF7FF";
const INK = "#000910";
const BTNBLUE = "#2347E8";

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
      router.push("/notification_signup"); // temp route
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton style={styles.backButton} />

      <View style={styles.content}>
        <Text style={styles.title}>
          We need your location{"\n"}to find closest Nicee’s{"\n"}for you
        </Text>

        {/* Animated Pins */}
        <LocationPinsHero />

        {/* Push Button further down */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={askLocation}
            disabled={loading}
            style={[styles.button, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color={INK} />
            ) : (
              <Text style={styles.buttonText}>Set Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  backButton: {
    marginTop: 16,
    marginLeft: 16,
  },
  content: {
    flex: 1,
    justifyContent: "space-between", // ✅ pushes button lower
    paddingHorizontal: 24,
    paddingBottom: 40, // keep button well above home indicator
  },
  title: {
    marginTop: 20,
    color: INK,
    fontSize: 28,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
    lineHeight: 42,
  },
  buttonWrapper: {
    alignItems: "center",
  },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: BTNBLUE,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#00000040",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
    color: INK,
  },
});
