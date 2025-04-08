import { View, StyleSheet } from "react-native";
import AuthScreen from "@/components/screens/auth/AuthScreen";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ThemedView>
        <AuthScreen />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
