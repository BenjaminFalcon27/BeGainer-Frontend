import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import LottieView from "lottie-react-native";
import {
  UserPreferencesDetail,
  ProgramSession as ApiProgramSession,
  fetchUserPreferencesDetails,
  fetchProgramById,
  fetchSessionsWithExercisesForProgram,
  autoGenerateNewProgram,
  updateUserActiveProgram,
  UserPreferencesPayload,
  deleteProgram,
} from "@/components/services/apiService";

export interface UserProgram {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  duration_weeks: number;
  start_date?: string;
  error?: string;
}

interface ProgramSession extends ApiProgramSession {
  day_number: number;
  exercise_count: number;
}

interface SimpleProgramGenerationResponse {
  message?: string;
  program_id?: string;
  error?: string;
}

const FRENCH_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const ProfileIcon = () => (
  <MaterialIcons name="account-circle" size={28} color={Colors.dark.tint} />
);

const getCurrentDayOfWeek = () => {
  const today = new Date();
  const day = today.getDay();
  return day === 0 ? 7 : day;
};

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

  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [sessionEndedInfo, setSessionEndedInfo] = useState({
    name: "",
    time: "",
  });
  const params = useLocalSearchParams<{
    sessionJustEnded?: string;
    sessionTime?: string;
    sessionName?: string;
  }>();

  const [showOffDaySessionConfirmModal, setShowOffDaySessionConfirmModal] =
    useState(false);
  const [selectedOffDaySession, setSelectedOffDaySession] = useState<{
    id: string;
    name?: string;
    message: string;
  } | null>(null);
  const [handledSessionEnd, setHandledSessionEnd] = useState(false);
  const currentDayOfWeek = getCurrentDayOfWeek();
  
  useEffect(() => {
    if (
      !handledSessionEnd &&
      params?.sessionJustEnded === "true" &&
      params?.sessionTime &&
      params?.sessionName
    ) {
      setSessionEndedInfo({
        name: params.sessionName,
        time: params.sessionTime,
      });
      setShowSessionEndedModal(true);
      setHandledSessionEnd(true);
      router.setParams({});
      const timer = setTimeout(() => {
        setShowSessionEndedModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [params, handledSessionEnd]);

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
          if (prefsData.error) {
            currentError = `Erreur Préférences: ${prefsData.error}`;
            setUserPreferences(null);
          } else {
            setUserPreferences(prefsData);
          }

          if (!prefsData.error && prefsData.active_program_id) {
            const programData = (await fetchProgramById(
              prefsData.active_program_id,
              storedToken
            )) as UserProgram;
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
                const sortedSessions = (sessionsData as ProgramSession[]).sort(
                  (a, b) => (a.day_number || 0) - (b.day_number || 0)
                );
                setProgramSessions(sortedSessions);
              } else {
                currentError = `${
                  currentError ? currentError + "\n" : ""
                }Erreur Séances: ${(sessionsData as { error: string }).error}`;
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
        currentError =
          e.message || "Une erreur inattendue est survenue lors du chargement.";
      } finally {
        setError(currentError);
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, [router, fadeAnim]);

  const navigateToProfile = () => {
    router.push("/user/profile");
  };

  const navigateToSessionDetails = (
    sessionId: string,
    sessionName?: string
  ) => {
    router.push({
      pathname: "/sessions/session-details",
      params: {
        id: sessionId,
        sessionName: sessionName || "Détails de la séance",
      },
    });
  };

  const triggerSessionPress = (session: ProgramSession) => {
    if (session.day_number < currentDayOfWeek) {
      setSelectedOffDaySession({
        id: session.id,
        name: session.name,
        message:
          "Cette séance était prévue un jour précédent. Voulez-vous vraiment la faire maintenant ?",
      });
      setShowOffDaySessionConfirmModal(true);
    } else if (session.day_number > currentDayOfWeek) {
      setSelectedOffDaySession({
        id: session.id,
        name: session.name,
        message:
          "Cette séance est prévue pour un jour ultérieur. Voulez-vous vraiment la faire maintenant ?",
      });
      setShowOffDaySessionConfirmModal(true);
    } else {
      navigateToSessionDetails(session.id, session.name);
    }
  };

  const confirmOffDaySession = () => {
    if (selectedOffDaySession) {
      navigateToSessionDetails(
        selectedOffDaySession.id,
        selectedOffDaySession.name
      );
    }
    setShowOffDaySessionConfirmModal(false);
    setSelectedOffDaySession(null);
  };

  const triggerProgramGeneration = () => {
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
    setIsConfirmationVisible(true);
  };

  const confirmAndGenerateProgram = async () => {
    setIsConfirmationVisible(false);
    setIsGeneratingProgram(true);
    setError(null);
    let accumulatedErrorMessages = "";

    if (!userId || !token || !userPreferences) {
      setError("Données utilisateur critiques manquantes.");
      setIsGeneratingProgram(false);
      return;
    }

    try {
      const oldProgramId = userPreferences.active_program_id;
      if (oldProgramId) {
        const deleteResponse = await deleteProgram(oldProgramId, token);
        if (deleteResponse.error) {
          const deleteErrorMessage = `Échec de la suppression de l'ancien programme (ID: ${oldProgramId}): ${deleteResponse.error}. La génération du nouveau programme va continuer.`;
          Alert.alert("Attention", deleteErrorMessage);
          accumulatedErrorMessages += deleteErrorMessage + "\n";
        } else {
          setUserPreferences((prev) =>
            prev ? { ...prev, active_program_id: undefined } : null
          );
          if (activeProgram && activeProgram.id === oldProgramId) {
            setActiveProgram(null);
            setProgramSessions([]);
          }
        }
      }

      const genResponse: SimpleProgramGenerationResponse =
        await autoGenerateNewProgram(userId, token);

      if (genResponse.error || !genResponse.program_id) {
        const errorMessage =
          genResponse.error ||
          "ID de programme manquant dans la réponse de génération.";
        Alert.alert("Échec de la génération", errorMessage);
        accumulatedErrorMessages += `Échec de la génération: ${errorMessage}\n`;
        setError(accumulatedErrorMessages || errorMessage);
      } else {
        const newProgramId = genResponse.program_id;
        const currentPrefsForUpdate: UserPreferencesPayload = {
          ...userPreferences,
          user_id: userId,
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
          accumulatedErrorMessages += updateErrorMessage + "\n";
        } else {
          if (
            "user_id" in updatedPrefsResponse &&
            typeof updatedPrefsResponse.user_id === "string"
          ) {
            setUserPreferences(updatedPrefsResponse as UserPreferencesDetail);
          } else {
            const unexpectedFormatError =
              "La réponse de mise à jour des préférences n'était pas au format attendu.";
            accumulatedErrorMessages += unexpectedFormatError + "\n";
          }
        }

        const programDetails = (await fetchProgramById(
          newProgramId,
          token
        )) as UserProgram;
        if (programDetails.error) {
          const detailsErrorMessage = `Impossible de récupérer les détails du nouveau programme (ID: ${newProgramId}): ${programDetails.error}`;
          Alert.alert("Erreur de chargement", detailsErrorMessage);
          accumulatedErrorMessages += detailsErrorMessage + "\n";
          setActiveProgram(null);
          setProgramSessions([]);
        } else {
          setActiveProgram(programDetails);
          const sessionsData = await fetchSessionsWithExercisesForProgram(
            newProgramId,
            token
          );
          if (Array.isArray(sessionsData)) {
            const sortedSessions = (sessionsData as ProgramSession[]).sort(
              (a, b) => (a.day_number || 0) - (b.day_number || 0)
            );
            setProgramSessions(sortedSessions);
          } else {
            const sessionsErrorMessage = `Impossible de charger les séances du nouveau programme: ${
              (sessionsData as { error: string }).error
            }`;
            Alert.alert("Erreur Séances", sessionsErrorMessage);
            accumulatedErrorMessages += sessionsErrorMessage + "\n";
            setProgramSessions([]);
          }
        }
        if (accumulatedErrorMessages) {
          setError(accumulatedErrorMessages.trim());
        }
      }
    } catch (e: any) {
      const catchErrorMessage =
        e.message ||
        "Une erreur de communication est survenue lors de la génération du programme.";
      Alert.alert("Erreur Inattendue", catchErrorMessage);
      setError(
        (prevError) => (prevError ? prevError + "\n" : "") + catchErrorMessage
      );
    } finally {
      setIsGeneratingProgram(false);
    }
  };

  const isProgramOld = () => {
    if (activeProgram && activeProgram.start_date) {
      const startDate = new Date(activeProgram.start_date);
      const currentDate = new Date();
      const sixWeeksInMs = 6 * 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(startDate.getTime())) {
        return currentDate.getTime() - startDate.getTime() > sixWeeksInMs;
      }
    }
    return false;
  };
  const programIsOlderThanSixWeeks = isProgramOld();

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

        <ScrollView
          style={styles.contentScrollView}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
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
                onPress={triggerProgramGeneration}
                disabled={isGeneratingProgram}
              >
                <Text style={styles.actionButtonText}>
                  Générer un programme
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {activeProgram && !activeProgram.error && (
            <View style={styles.sectionContainer}>
              {programIsOlderThanSixWeeks ? (
                <>
                  <Text style={styles.sectionTitleWarning}>
                    Programme à renouveler
                  </Text>
                  <Text style={styles.oldProgramMessage}>
                    Votre programme "{activeProgram.name}" a commencé il y a
                    plus de 6 semaines. Pour de meilleurs résultats et continuer
                    à progresser, il est recommandé de le renouveler.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Colors.dark.primary, marginTop: 20 },
                      isGeneratingProgram && styles.buttonDisabled,
                    ]}
                    onPress={triggerProgramGeneration}
                    disabled={isGeneratingProgram}
                  >
                    <Text style={styles.actionButtonText}>
                      Régénérer mon Programme
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Votre Programme Actif</Text>
                  <Text style={styles.programName}>{activeProgram.name}</Text>
                  <View style={styles.programDetails}>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Objectif:</Text>{" "}
                      {activeProgram.goal === "lose weight"
                        ? "Perte de poids"
                        : activeProgram.goal === "gain muscle"
                        ? "Prise de masse"
                        : activeProgram.goal === "improve health"
                        ? "Amélioration de la santé"
                        : activeProgram.goal}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>Durée:</Text>{" "}
                      {activeProgram.duration_weeks} semaines
                    </Text>
                    {activeProgram.start_date && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Débuté le:</Text>{" "}
                        {new Date(activeProgram.start_date).toLocaleDateString(
                          "fr-FR"
                        )}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Colors.dark.secondary, marginTop: 15 },
                      isGeneratingProgram && styles.buttonDisabled,
                    ]}
                    onPress={triggerProgramGeneration}
                    disabled={isGeneratingProgram}
                  >
                    <Text style={styles.actionButtonText}>
                      Générer un Nouveau Programme
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {activeProgram &&
            !activeProgram.error &&
            !programIsOlderThanSixWeeks &&
            programSessions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                  Vos Séances ({programSessions.length})
                </Text>
                {programSessions.map((session) => {
                  const exerciseCount =
                    session.exercise_count ||
                    (session.exercises && session.exercises.length) ||
                    0;
                  const dayNumber = session.day_number;
                  const dayName =
                    dayNumber >= 1 && dayNumber <= 7
                      ? FRENCH_DAYS[dayNumber - 1]
                      : `Jour ${dayNumber}`;
                  
                  const isPastSessionAndNotCurrent = dayNumber < currentDayOfWeek;
                  const isFutureSessionAndNotCurrent = dayNumber > currentDayOfWeek;
                  const isCurrentDaySession = dayNumber === currentDayOfWeek;

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        isPastSessionAndNotCurrent && styles.pastSessionItem,
                        isCurrentDaySession && styles.currentDaySessionItem,
                      ]}
                      onPress={() => triggerSessionPress(session)}
                    >
                      <View style={styles.sessionTextContainer}>
                        <View style={styles.sessionHeaderRow}>
                          <Text
                            style={[
                              styles.sessionDayName,
                              isPastSessionAndNotCurrent && styles.pastSessionDayNameText,
                              isFutureSessionAndNotCurrent && styles.offDaySessionText,
                              isCurrentDaySession && styles.currentDaySessionDayNameText,
                            ]}
                          >
                            {dayName}
                          </Text>
                          {isPastSessionAndNotCurrent && (
                            <View style={styles.missedSessionBadge}>
                              <MaterialIcons
                                name="warning-amber"
                                size={14}
                                color={styles.missedSessionBadgeText.color}
                              />
                              <Text style={styles.missedSessionBadgeText}>
                                Séance manquée
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.sessionName,
                            isPastSessionAndNotCurrent && styles.pastSessionNameText,
                            isFutureSessionAndNotCurrent && styles.offDaySessionText,
                            isCurrentDaySession && styles.currentDaySessionNameText,
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {session.name}
                        </Text>
                        <Text
                          style={[
                            styles.sessionInfo,
                            isPastSessionAndNotCurrent && styles.pastSessionInfoText,
                            isFutureSessionAndNotCurrent && styles.offDaySessionText,
                             isCurrentDaySession && styles.currentDaySessionInfoText,
                          ]}
                        >
                          {exerciseCount} exercice
                          {exerciseCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          {activeProgram &&
            !activeProgram.error &&
            !programIsOlderThanSixWeeks &&
            programSessions.length === 0 &&
            !isLoading &&
            !isGeneratingProgram && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances</Text>
                <Text style={styles.infoText}>
                  Aucune séance trouvée pour ce programme. Cela peut être en
                  cours de préparation.
                </Text>
              </View>
            )}
        </ScrollView>
      </Animated.View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isConfirmationVisible}
        onRequestClose={() => setIsConfirmationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmer la Génération</Text>
            <Text style={styles.modalMessage}>
              Générer un nouveau programme supprimera votre programme actif
              actuel. Êtes-vous sûr de vouloir continuer ?
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setIsConfirmationVisible(false)}
                disabled={isGeneratingProgram}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmAndGenerateProgram}
                disabled={isGeneratingProgram}
              >
                <Text style={styles.modalConfirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isGeneratingProgram}
      >
        <View style={styles.loadingModalOverlay}>
          <LottieView
            source={require("../../../assets/animations/loading.json")}
            autoPlay
            loop={true}
            style={styles.lottieAnimation}
          />
          <Text style={styles.loadingModalText}>
            Génération du programme...
          </Text>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSessionEndedModal}
        onRequestClose={() => setShowSessionEndedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <FontAwesome5
              name="check-circle"
              size={48}
              color={Colors.dark.primary}
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.modalTitle}>
              Séance "{sessionEndedInfo.name}" Terminée !
            </Text>
            <Text style={styles.modalMessage}>
              Félicitations ! Temps total: {sessionEndedInfo.time}.
            </Text>
            <TouchableOpacity onPress={() => setShowSessionEndedModal(false)}>
              <Text style={{ color: "red" }}>Fermer le recap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showOffDaySessionConfirmModal}
        onRequestClose={() => {
          setShowOffDaySessionConfirmModal(false);
          setSelectedOffDaySession(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Séance d'un autre jour</Text>
            <Text style={styles.modalMessage}>
              {selectedOffDaySession?.message ||
                "Voulez-vous vraiment faire cette séance maintenant ?"}
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowOffDaySessionConfirmModal(false);
                  setSelectedOffDaySession(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmOffDaySession}
              >
                <Text style={styles.modalConfirmButtonText}>
                  Oui
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const missedWarningColor = Colors.dark.warning;
const pastItemBackgroundColor = Colors.dark.warningBackground;
const pastItemBorderColor = Colors.dark.warningBorder;
const pastItemTextColor = Colors.dark.warningText;
const pastItemNameTextColor = Colors.dark.warningTitleText;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 18,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.card,
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
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  contentScrollView: {
    flex: 1,
  },
  scrollViewContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionContainer: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: Colors.dark.tint,
    marginBottom: 12,
  },
  sectionTitleWarning: {
    fontSize: 19,
    fontWeight: "bold",
    color: Colors.dark.primary,
    marginBottom: 10,
  },
  oldProgramMessage: {
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 15,
    textAlign: "center",
  },
  programName: {
    fontSize: 21,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 10,
  },
  programDetails: {
    marginTop: 5,
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: "bold",
    color: Colors.dark.secondary,
  },
  detailText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 6,
    lineHeight: 22,
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
  },
  pastSessionItem: {
    backgroundColor: pastItemBackgroundColor,
    borderColor: pastItemBorderColor,
  },
  currentDaySessionItem: {
    borderColor: Colors.dark.primary,
    borderWidth: 2,
    backgroundColor: Colors.dark.card, 
  },
  sessionTextContainer: {
    flex: 1,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionDayName: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.dark.tint,
  },
  pastSessionDayNameText: {
    color: pastItemTextColor,
  },
  currentDaySessionDayNameText: {
    color: Colors.dark.primary,
  },
  sessionName: {
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  pastSessionNameText: {
     color: pastItemNameTextColor,
  },
  currentDaySessionNameText: {
     color: Colors.dark.text,
  },
  sessionInfo: {
    fontSize: 13,
    color: Colors.dark.secondary,
  },
  pastSessionInfoText: {
    color: pastItemTextColor,
  },
  currentDaySessionInfoText: {
    color: Colors.dark.secondary,
  },
  offDaySessionText: {
    color: Colors.dark.disabledText || Colors.dark.secondary || "#999999",
  },
  missedSessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  missedSessionBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
    color: missedWarningColor,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
    alignSelf: "center",
  },
  actionButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxWidth: 350,
    backgroundColor: Colors.dark.card,
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.title,
    marginBottom: 15,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  modalButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: Colors.dark.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
  },
  modalCancelButtonText: {
    color: Colors.dark.text,
    fontWeight: "bold",
    fontSize: 15,
  },
  modalConfirmButton: {
    backgroundColor: Colors.dark.primary,
  },
  modalConfirmButtonText: {
    color: Colors.dark.background,
    fontWeight: "bold",
    fontSize: 15,
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 250,
    height: 250,
  },
  loadingModalText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.dark.text,
    fontWeight: "bold",
  },
});
