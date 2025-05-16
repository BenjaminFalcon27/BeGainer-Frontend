import React, { useEffect, useState, useRef, useCallback } from "react"; // useCallback ajouté
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
import { useRouter, useFocusEffect } from "expo-router"; // useFocusEffect ajouté
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
} from "@/app/services/apiService";

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

  const loadDashboardData = useCallback(async () => {
    // useCallback utilisé ici
    console.log("loadDashboardData: Démarrage");
    setIsLoading(true); // Mettre isLoading à true au début du chargement
    setError(null);
    // Ne pas réinitialiser activeProgram et userPreferences ici pour éviter un clignotement
    // si les données sont déjà là et qu'on rafraîchit juste.
    // setActiveProgram(null);
    // setUserPreferences(null);
    let currentError: string | null = null;

    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUserId = await AsyncStorage.getItem("userId");
      const storedName = await AsyncStorage.getItem("name");

      console.log("loadDashboardData: Stored Data:", {
        storedToken,
        storedUserId,
        storedName,
      });

      if (storedToken && storedUserId) {
        if (!userName) setUserName(storedName); // Mettre à jour seulement si pas déjà défini
        if (!userId) setUserId(storedUserId);
        if (!token) setToken(storedToken);

        const prefsData = await fetchUserPreferencesDetails(
          storedUserId,
          storedToken
        );
        console.log(
          "loadDashboardData: Fetched Prefs Data:",
          JSON.stringify(prefsData)
        );
        setUserPreferences(prefsData);

        if (prefsData.error) {
          currentError = `Erreur Préférences: ${prefsData.error}`;
          setActiveProgram(null); // Assurer la réinitialisation en cas d'erreur de prefs
          setProgramSessions([]);
        } else if (prefsData.active_program_id) {
          console.log(
            "loadDashboardData: Programme actif trouvé, ID:",
            prefsData.active_program_id
          );
          const programData = await fetchProgramById(
            prefsData.active_program_id,
            storedToken
          );
          console.log("loadDashboardData: Fetched Program Data:", programData);

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
            console.log(
              "loadDashboardData: Fetched Sessions Data:",
              sessionsData
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
        } else {
          // Pas d'erreur de prefs, mais pas d'active_program_id
          console.log(
            "loadDashboardData: Pas de programme actif dans les préférences."
          );
          setActiveProgram(null);
          setProgramSessions([]);
        }
      } else {
        currentError = "Utilisateur non authentifié.";
        router.replace("/"); // Ou vers l'écran de connexion
      }
    } catch (e: any) {
      console.error("Échec du chargement des données du tableau de bord:", e);
      currentError = e.message || "Une erreur inattendue est survenue.";
      setActiveProgram(null); // Réinitialiser en cas d'erreur majeure
      setProgramSessions([]);
      setUserPreferences(null);
    } finally {
      setError(currentError);
      setIsLoading(false);
      console.log(
        "loadDashboardData: Fin. isLoading:",
        false,
        "Error:",
        currentError
      );
      console.log(
        "loadDashboardData Final State: activeProgram_id:",
        userPreferences?.active_program_id,
        "activeProgram set:",
        !!activeProgram
      );
    }
  }, [userName, userId, token]); // Dépendances pour useCallback

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    // Le premier chargement est géré par useFocusEffect maintenant
  }, [fadeAnim]);

  useFocusEffect(
    // Utiliser useFocusEffect pour charger les données quand l'écran est focus
    useCallback(() => {
      loadDashboardData();
      return () => {
        // Optionnel: nettoyage si nécessaire quand l'écran perd le focus
        console.log("DashboardScreen: Unfocused");
      };
    }, [loadDashboardData]) // loadDashboardData est maintenant mémorisé avec useCallback
  );

  const navigateToProfile = () => {
    router.push("/user/profile");
  };

  const handleSessionPress = (sessionId: string) => {
    console.log("Naviguer vers la session :", sessionId);
    // router.push(`/session/${sessionId}`);
  };

  const handleGenerateProgram = async () => {
    console.log("handleGenerateProgram: Démarrage");
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
        "Veuillez d'abord configurer vos préférences utilisateur (ou corriger les erreurs existantes) avant de générer un programme."
      );
      router.push("/user/edit-preferences");
      return;
    }

    setIsGeneratingProgram(true);
    setError(null);
    console.log(
      "handleGenerateProgram: User Preferences avant génération:",
      userPreferences
    );

    try {
      const generatedProgramData = await autoGenerateNewProgram(userId, token);
      console.log(
        "handleGenerateProgram: Generated Program Data:",
        generatedProgramData
      );

      if (generatedProgramData.error || !generatedProgramData.id) {
        Alert.alert(
          "Échec de la génération",
          generatedProgramData.error || "ID de programme manquant."
        );
        setError(generatedProgramData.error || "ID de programme manquant.");
      } else {
        console.log(
          "handleGenerateProgram: Programme généré avec succès, ID:",
          generatedProgramData.id
        );

        const currentPrefsForUpdate: UserPreferencesPayload = {
          ...userPreferences,
        };

        const updatedPrefsResponse = await updateUserActiveProgram(
          userId,
          currentPrefsForUpdate,
          generatedProgramData.id,
          token
        );
        console.log(
          "handleGenerateProgram: Updated Prefs Response:",
          updatedPrefsResponse
        );

        if (updatedPrefsResponse.error) {
          Alert.alert(
            "Erreur de mise à jour",
            `Le programme a été généré (ID: ${generatedProgramData.id}) mais n'a pas pu être défini comme actif: ${updatedPrefsResponse.error}`
          );
          setError(updatedPrefsResponse.error);
        } else {
          if ("user_id" in updatedPrefsResponse) {
            setUserPreferences(updatedPrefsResponse as UserPreferencesDetail);
            console.log(
              "handleGenerateProgram: userPreferences mis à jour localement avec active_program_id:",
              (updatedPrefsResponse as UserPreferencesDetail).active_program_id
            );
          } else {
            const fetchErrorMsg =
              "La réponse de mise à jour des préférences n'était pas au format attendu.";
            console.error(fetchErrorMsg, updatedPrefsResponse);
            setError(fetchErrorMsg);
            // Recharger les données pour assurer la cohérence
            loadDashboardData(); // Appeler pour re-synchroniser
          }
          Alert.alert(
            "Succès",
            generatedProgramData.message || "Programme généré avec succès !"
          );
        }

        setActiveProgram({
          id: generatedProgramData.id,
          user_id: generatedProgramData.user_id,
          name: generatedProgramData.name,
          goal: generatedProgramData.goal,
          duration_weeks: generatedProgramData.duration_weeks,
        });
        setProgramSessions(generatedProgramData.sessions || []);
        console.log(
          "handleGenerateProgram: activeProgram mis à jour localement, ID:",
          generatedProgramData.id
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e.message || "Une erreur de communication est survenue."
      );
      setError(e.message || "Une erreur de communication est survenue.");
    } finally {
      setIsGeneratingProgram(false);
      console.log("handleGenerateProgram: Fin. isGeneratingProgram:", false);
    }
  };

  if (isLoading && !userPreferences && !activeProgram) {
    // Afficher le chargement seulement si rien n'est encore chargé
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
        {/* ... (Header, WelcomeMessage, ErrorText inchangés) ... */}
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
          {/* ... (Affichage du message "Aucun Programme Actif" inchangé) ... */}
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

          {/* ... (Affichage du Programme Actif inchangé) ... */}
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

          {/* MODIFICATION CI-DESSOUS DANS L'AFFICHAGE DES SÉANCES */}
          {activeProgram &&
            !activeProgram.error &&
            programSessions.length > 0 && ( // programSessions est toujours un tableau grâce à l'initialisation et aux setters
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances à venir</Text>
                {programSessions.slice(0, 2).map((session) => {
                  // Ajout d'une garde pour session.exercises
                  const exercisesArray = session.exercises || [];
                  const exerciseCount = exercisesArray.length;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionItem}
                      onPress={() => handleSessionPress(session.id)}
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
          {/* ... (Reste du JSX et styles inchangés) ... */}
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
