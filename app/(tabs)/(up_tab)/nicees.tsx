import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function InProgress() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🚧 Page in progress...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF", // or your theme background
  },
  text: {
    fontSize: 18,
    color: "#1B44CD", // brand blue
    fontWeight: "600",
  },
});
