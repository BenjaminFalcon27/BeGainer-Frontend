import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchUserPreferencesDetails,
  UserPreferencesDetail,
  UserProgram,
  fetchProgramById,
  ProgramSession,
  fetchSessionsWithExercisesForProgram,
} from "@/components/services/apiService";

const BackIcon = () => (
  <MaterialIcons
    name="arrow-back-ios"
    size={24}
    color={Colors.dark.tint}
    style={{ marginLeft: 10 }}
  />
);
const EditIcon = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.editIconTouchable}>
    <MaterialIcons name="edit" size={22} color={Colors.dark.tint} />
  </TouchableOpacity>
);

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export default function UserProfile() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(15)).current;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferencesDetail | null>(null);
  const [activeProgram, setActiveProgram] = useState<UserProgram | null>(null);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const loadUserProfileData = async () => {
      setIsLoading(true);
      setError(null);
      let currentError: string | null = null;

      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        const storedToken = await AsyncStorage.getItem("token");
        const storedName = await AsyncStorage.getItem("name");
        const storedEmail = await AsyncStorage.getItem("userEmail");

        if (storedUserId && storedToken) {
          setUserName(storedName);
          setUserEmail(storedEmail);

          const prefsData = await fetchUserPreferencesDetails(
            storedUserId,
            storedToken
          );
          setUserPreferences(prefsData);

          if (prefsData.error) {
            currentError = `Préférences: ${prefsData.error}`;
          }

          if (!prefsData.error && prefsData.active_program_id) {
            const programData = await fetchProgramById(
              prefsData.active_program_id,
              storedToken
            );

            if (programData.error) {
              currentError = `${
                currentError ? currentError + "\n" : ""
              }Programme: ${programData.error}`;
              setActiveProgram(null);
              setProgramSessions([]);
            } else {
              setActiveProgram(programData);
              const sessionsData = await fetchSessionsWithExercisesForProgram(
                programData.id,
                storedToken
              );
              if (Array.isArray(sessionsData)) {
                setProgramSessions(sessionsData);
              } else {
                currentError = `${
                  currentError ? currentError + "\n" : ""
                }Séances: ${sessionsData.error}`;
                setProgramSessions([]);
              }
            }
          } else if (!prefsData.active_program_id && !prefsData.error) {
            setActiveProgram(null);
            setProgramSessions([]);
          } else if (prefsData.error) {
            setActiveProgram(null);
            setProgramSessions([]);
          }
        } else {
          currentError = "Utilisateur non connecté.";
          router.replace("/");
        }
      } catch (e: any) {
        currentError = e.message || "Erreur inattendue.";
      } finally {
        setError(currentError);
        setIsLoading(false);
      }
    };

    loadUserProfileData();
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    await AsyncStorage.multiRemove(["token", "userId", "name", "userEmail"]);
    setUserPreferences(null);
    setActiveProgram(null);
    setProgramSessions([]);
    setUserName(null);
    setUserEmail(null);
    setIsLoading(false);
    router.replace("/");
  };

  const handleEditPreferences = () => {
    router.push("/user/edit-preferences");
  };

  const formatTrainingDays = (days?: number[]): string => {
    if (!days || days.length === 0) {
      return "-";
    }
    return days
      .sort((a, b) => a - b)
      .map((dayValue) => {
        const dayIndex = dayValue - 1;
        return DAY_LABELS[dayIndex] || "?";
      })
      .join(", ");
  };

  const goalTranslations: { [key: string]: string } = {
    "lose weight": "Perdre du gras",
    "gain muscle": "Me muscler",
    "improve health": "Santé",
  };

  const trainingPlaceTranslations: { [key: string]: string } = {
    gym: "Salle de sport",
    home_no_equipment: "Maison",
    home_with_equipment: "Maison (avec équipement)",
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
          width: "100%",
          flex: 1,
        }}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.replace("/dashboard/dashboard")}
            style={styles.headerButton}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.title}>Profil</Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <View style={styles.contentWrapper}>
          {error && !isLoading && (
            <Text style={styles.errorTextSmall}>{error}</Text>
          )}

          {userPreferences && !userPreferences.error ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Vos Préférences</Text>
                <EditIcon onPress={handleEditPreferences} />
              </View>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Objectif:</Text>{" "}
                {goalTranslations[userPreferences.goal?.toLowerCase() || ""] ||
                  userPreferences.goal ||
                  "-"}
              </Text>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Jours d'entr.:</Text>{" "}
                {formatTrainingDays(userPreferences.training_days)}
              </Text>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Lieu:</Text>{" "}
                {trainingPlaceTranslations[
                  userPreferences.training_place?.toLowerCase() || ""
                ] ||
                  userPreferences.training_place ||
                  "-"}
              </Text>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Durée sess.:</Text>{" "}
                {userPreferences.session_length || "-"} min
              </Text>
            </View>
          ) : (
            !isLoading && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Vos Préférences</Text>
                  <EditIcon onPress={handleEditPreferences} />
                </View>
                <Text style={styles.infoText}>
                  Aucune préférence utilisateur trouvée ou définissable.
                </Text>
              </View>
            )
          )}

          {activeProgram && !activeProgram.error ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Programme Actif</Text>
              <Text style={styles.programNameText}>{activeProgram.name}</Text>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Objectif:</Text>{" "}
                {goalTranslations[activeProgram.goal?.toLowerCase() || ""] ||
                  activeProgram.goal ||
                  "-"}
              </Text>
              <Text style={styles.infoTextCompact}>
                <Text style={styles.infoLabel}>Durée:</Text>{" "}
                {activeProgram.duration_weeks} sem.
              </Text>
              {programSessions.length > 0 && (
                <Text style={styles.infoTextCompact}>
                  <Text style={styles.infoLabel}>Séances:</Text>{" "}
                  {programSessions.length}
                </Text>
              )}
            </View>
          ) : (
            userPreferences &&
            !userPreferences.error &&
            !isLoading && (
              <View style={styles.sectionContainer}>
                <Text style={styles.infoText}>Aucun programme actif.</Text>
              </View>
            )
          )}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.button, styles.logoutButton]}
        >
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 20,
  },
  contentWrapper: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    marginBottom: 15,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.dark.title,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: Colors.dark.text,
  },
  errorTextSmall: {
    fontSize: 13,
    color: Colors.dark.secondary,
    marginVertical: 10,
    textAlign: "center",
    width: "90%",
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.tint,
    marginBottom: 8,
    textAlign: "center",
  },
  emailText: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionContainer: {
    width: "95%",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.secondary,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "600",
    color: Colors.dark.tint,
  },
  editIconTouchable: {
    padding: 5,
  },
  programNameText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
    textAlign: "center",
  },
  infoTextCompact: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 7,
    lineHeight: 20,
  },
  infoLabel: {
    fontWeight: "bold",
    color: Colors.dark.secondary,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 180,
    marginTop: 15,
  },
  logoutButton: {
    backgroundColor: "#C62828",
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});
