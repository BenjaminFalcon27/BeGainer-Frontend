import { Image, StyleSheet, Platform, ScrollView } from "react-native";
import { HelloWave } from "@/components/HelloWave";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";

export default function HomeScreen() {
  return (
    <ScrollView style={{ backgroundColor: Colors.dark.background }}>
      <ThemedView
        style={[
          styles.titleContainer,
          { backgroundColor: Colors.dark.background },
        ]}
      >
        <ThemedText type="title" style={{ color: Colors.dark.text }}>
          Welcome!
        </ThemedText>
        <HelloWave />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: "center",
    gap: 8,
  },
});
