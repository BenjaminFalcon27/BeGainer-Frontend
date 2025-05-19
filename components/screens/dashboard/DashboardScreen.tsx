import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import {
  UserPreferencesDetail,
  UserProgram,
  ProgramSession,
  fetchUserPreferencesDetails,
  fetchProgramById,
  fetchSessionsWithExercisesForProgram,
  autoGenerateNewProgram,
  updateUserActiveProgram,
  UserPreferencesPayload,
} from "@/components/services/apiService";

interface SimpleProgramGenerationResponse {
  message?: string;
  program_id?: string;
  error?: string;
}

const ProfileIcon = () => (
  <MaterialIcons name="account-circle" size={28} color={Colors.dark.tint} />
);

export default function DashboardScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferencesDetail | null>(null);
  const [activeProgram, setActiveProgram] = useState<UserProgram | null>(null);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      let currentError: string | null = null;

      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUserId = await AsyncStorage.getItem("userId");
        const storedName = await AsyncStorage.getItem("name");

        if (storedToken && storedUserId) {
          setUserName(storedName);
          setUserId(storedUserId);
          setToken(storedToken);

          const prefsData = await fetchUserPreferencesDetails(
            storedUserId,
            storedToken
          );
          setUserPreferences(prefsData);

          if (prefsData.error) {
            currentError = `Erreur Préférences: ${prefsData.error}`;
          }

          if (!prefsData.error && prefsData.active_program_id) {
            const programData = await fetchProgramById(
              prefsData.active_program_id,
              storedToken
            );
            if (programData.error) {
              currentError = `${
                currentError ? currentError + "\n" : ""
              }Erreur Programme: ${programData.error}`;
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
                }Erreur Séances: ${sessionsData.error}`;
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
          currentError = "Utilisateur non authentifié.";
          router.replace("/");
        }
      } catch (e: any) {
        currentError = e.message || "Une erreur inattendue est survenue.";
      } finally {
        setError(currentError);
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const navigateToProfile = () => {
    router.push("/user/profile");
  };

  const handleSessionPress = (sessionId: string, sessionName?: string) => {
    router.push({
      pathname: "/sessions/session-details",
      params: {
        id: sessionId,
        sessionName: sessionName || "Détails de la séance",
      },
    });
  };

  const handleGenerateProgram = async () => {
    if (!userId || !token) {
      Alert.alert(
        "Erreur",
        "Impossible de récupérer les informations utilisateur."
      );
      return;
    }
    if (!userPreferences || userPreferences.error || !userPreferences.user_id) {
      Alert.alert(
        "Action requise",
        "Veuillez d'abord configurer vos préférences utilisateur avant de générer un programme."
      );
      router.push("/user/edit-preferences");
      return;
    }

    setIsGeneratingProgram(true);
    setError(null);

    try {
      const genResponse: SimpleProgramGenerationResponse =
        await autoGenerateNewProgram(userId, token);

      if (genResponse.error || !genResponse.program_id) {
        const errorMessage =
          genResponse.error ||
          "ID de programme manquant dans la réponse de génération.";
        Alert.alert("Échec de la génération", errorMessage);
        setError(errorMessage);
      } else {
        const newProgramId = genResponse.program_id;

        if (userPreferences && !userPreferences.error) {
          const currentPrefsForUpdate: UserPreferencesPayload = {
            ...userPreferences,
          };
          const updatedPrefsResponse = await updateUserActiveProgram(
            userId,
            currentPrefsForUpdate,
            newProgramId,
            token
          );

          if (updatedPrefsResponse.error) {
            const updateErrorMessage = `Le programme a été généré (ID: ${newProgramId}) mais n'a pas pu être défini comme actif: ${updatedPrefsResponse.error}`;
            Alert.alert("Erreur de mise à jour", updateErrorMessage);
            setError(updatedPrefsResponse.error);
          } else {
            if (
              "user_id" in updatedPrefsResponse &&
              typeof updatedPrefsResponse.user_id === "string"
            ) {
              setUserPreferences(updatedPrefsResponse as UserPreferencesDetail);
            } else {
              const fetchErrorMsg =
                "La réponse de mise à jour des préférences n'était pas au format UserPreferencesDetail attendu.";
              setError(fetchErrorMsg);
            }
            Alert.alert(
              "Succès",
              genResponse.message || "Programme généré et défini comme actif !"
            );
          }

          const programDetails = await fetchProgramById(newProgramId, token);

          if (programDetails.error) {
            const detailsErrorMessage = `Impossible de récupérer les détails du nouveau programme (ID: ${newProgramId}): ${programDetails.error}`;
            Alert.alert("Erreur de chargement", detailsErrorMessage);
            setError((prevError) =>
              prevError
                ? `${prevError}\n${detailsErrorMessage}`
                : detailsErrorMessage
            );
            setActiveProgram(null);
            setProgramSessions([]);
          } else {
            setActiveProgram(programDetails);
            const sessionsData = await fetchSessionsWithExercisesForProgram(
              newProgramId,
              token
            );
            if (Array.isArray(sessionsData)) {
              setProgramSessions(sessionsData);
            } else {
              setProgramSessions([]);
            }
          }
        } else {
          const prefsErrorMessage =
            "Les préférences utilisateur ne sont pas disponibles ou en erreur pour la mise à jour du programme actif.";
          Alert.alert(
            "Attention",
            `Programme généré (ID: ${newProgramId}) mais impossible de le définir comme actif. ${prefsErrorMessage}`
          );
          setError(prefsErrorMessage);
          const programDetailsOnError = await fetchProgramById(
            newProgramId,
            token
          );
          if (!programDetailsOnError.error)
            setActiveProgram(programDetailsOnError);
        }
      }
    } catch (e: any) {
      const catchErrorMessage =
        e.message || "Une erreur de communication est survenue.";
      Alert.alert("Erreur", catchErrorMessage);
      setError(catchErrorMessage);
    } finally {
      setIsGeneratingProgram(false);
    }
  };

  if (isLoading && !userPreferences && !activeProgram) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement du Tableau de Bord...</Text>
      </View>
    );
  }

  const showNoActiveProgramMessage =
    !activeProgram &&
    userPreferences &&
    !userPreferences.error &&
    !userPreferences.active_program_id;

  return (
    <View style={styles.mainContainer}>
      <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de Bord</Text>
          <TouchableOpacity
            onPress={navigateToProfile}
            style={styles.profileButton}
          >
            <ProfileIcon />
          </TouchableOpacity>
        </View>

        {userName && (
          <Text style={styles.welcomeMessage}>Bonjour, {userName} !</Text>
        )}

        {error && !isLoading && !isGeneratingProgram && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.contentArea}>
          {showNoActiveProgramMessage && !isLoading && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Aucun Programme Actif</Text>
              <Text style={styles.infoText}>
                Vous n'avez pas encore de programme d'entraînement actif.
              </Text>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors.dark.primary },
                  isGeneratingProgram && styles.buttonDisabled,
                ]}
                onPress={handleGenerateProgram}
                disabled={isGeneratingProgram}
              >
                {isGeneratingProgram ? (
                  <ActivityIndicator color={Colors.dark.text} />
                ) : (
                  <Text style={styles.actionButtonText}>
                    Générer un programme
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeProgram && !activeProgram.error && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Votre Programme Actif</Text>
              <Text style={styles.programName}>{activeProgram.name}</Text>
              <View style={styles.programDetails}>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Objectif:</Text>{" "}
                  {activeProgram.goal}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Durée:</Text>{" "}
                  {activeProgram.duration_weeks} semaines
                </Text>
              </View>
            </View>
          )}

          {activeProgram &&
            !activeProgram.error &&
            programSessions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                  Vos Séances ({programSessions.length})
                </Text>
                {programSessions.slice(0, 2).map((session) => {
                  const exercisesArray = session.exercises || [];
                  const exerciseCount = exercisesArray.length;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionItem}
                      onPress={() =>
                        handleSessionPress(session.id, session.name)
                      }
                    >
                      <View>
                        <Text style={styles.sessionName}>{session.name}</Text>
                        <Text style={styles.sessionInfo}>
                          {exerciseCount} exercice
                          {exerciseCount > 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Text style={styles.sessionArrow}>➔</Text>
                    </TouchableOpacity>
                  );
                })}
                {programSessions.length > 2 && (
                  <Text style={styles.moreSessionsText}>
                    Et {programSessions.length - 2} autre(s) séance(s)...
                  </Text>
                )}
              </View>
            )}
          {activeProgram &&
            !activeProgram.error &&
            programSessions.length === 0 &&
            !isLoading && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances</Text>
                <Text style={styles.infoText}>
                  Aucune séance trouvée pour ce programme.
                </Text>
              </View>
            )}
        </View>
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
    paddingBottom: 15,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.dark.text,
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
    marginVertical: 8,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.dark.title,
  },
  profileButton: {
    padding: 8,
  },
  welcomeMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark.text,
    textAlign: "center",
    marginVertical: 10,
  },
  contentArea: {
    flex: 1,
    justifyContent: "flex-start",
  },
  sectionContainer: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.dark.tint,
    marginBottom: 10,
  },
  programName: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  programDetails: {
    marginTop: 3,
  },
  detailLabel: {
    fontWeight: "600",
    color: Colors.dark.secondary,
  },
  detailText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.text,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  sessionItem: {
    backgroundColor: Colors.dark.background,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  sessionInfo: {
    fontSize: 13,
    color: Colors.dark.secondary,
    marginTop: 3,
  },
  sessionArrow: {
    fontSize: 18,
    color: Colors.dark.tint,
  },
  moreSessionsText: {
    fontSize: 13,
    color: Colors.dark.secondary,
    textAlign: "center",
    marginTop: 5,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    alignSelf: "center",
  },
  actionButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
