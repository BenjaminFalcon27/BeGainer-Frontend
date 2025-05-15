import { View, StyleSheet, ActivityIndicator } from "react-native";
import AuthScreen from "@/components/screens/auth/AuthScreen";
import UserProfile from "@/components/screens/user/UserProfile";
import { ThemedView } from "@/components/ThemedView";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "react-native/Libraries/NewAppScreen";
import { useRouter } from "expo-router";
import { fetchUserPreferences } from "../services/apiService";
import DashboardScreen from "@/components/screens/dashboard/DashboardScreen";

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const id = await AsyncStorage.getItem("userId");
        setUserToken(token);
        setUserId(id);

        if (token && id) {
          const prefs = await fetchUserPreferences(id, token);
          if (!prefs || prefs.error) {
            router.replace("/questionnaire/questionnaire");
          }
        }
      } catch (e) {
        console.error(
          "Erreur lors de la vérification du statut d'authentification:",
          e
        );
        setUserToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedView style={styles.themedViewContainer}>
        {userToken ? <DashboardScreen /> : <AuthScreen />}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.dark.background,
  },
  themedViewContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
});
