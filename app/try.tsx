import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function Empty() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Empty screen placeholder</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});
