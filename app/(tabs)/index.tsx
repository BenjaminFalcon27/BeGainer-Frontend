import { Image, StyleSheet, Platform, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import AuthScreen from "@/components/screens/auth/AuthScreen";

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scrollView}>
      <ThemedView style={styles.container}>
        <AuthScreen />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
