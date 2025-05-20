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
  fetchSessionCompletionCount,
  SessionCountResponse,
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

interface ProgramSession extends ApiProgramSession {}

interface SessionCompletionStatus {
  count: number;
  isLoading: boolean;
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

  const [sessionCompletionData, setSessionCompletionData] = useState<{
    [sessionId: string]: SessionCompletionStatus;
  }>({});
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [sessionEndedInfo, setSessionEndedInfo] = useState({
    name: "",
    time: "",
  });

  const { sessionJustEnded, sessionTime, sessionName, sessionIdJustEnded } =
    useLocalSearchParams<{
      sessionJustEnded?: string;
      sessionTime?: string;
      sessionName?: string;
      sessionIdJustEnded?: string;
    }>();

  const [showOffDaySessionConfirmModal, setShowOffDaySessionConfirmModal] =
    useState(false);
  const [selectedOffDaySession, setSelectedOffDaySession] = useState<{
    id: string;
    name?: string;
    message: string;
  } | null>(null);

  const currentDayOfWeek = getCurrentDayOfWeek();

  useEffect(() => {
    if (sessionJustEnded === "true" && sessionTime && sessionName) {
      setSessionEndedInfo({
        name: sessionName,
        time: sessionTime,
      });
      setShowSessionEndedModal(true);

      if (sessionIdJustEnded && userId && token) {
        fetchSessionCompletionCount(sessionIdJustEnded, userId, token).then(
          (result) => {
            if (result.sessionId) {
              setSessionCompletionData((prevData) => ({
                ...prevData,
                [result.sessionId]: {
                  count: result.count,
                  isLoading: false,
                  error: result.error,
                },
              }));
            }
          }
        );
      }

      const timer = setTimeout(() => {
        setShowSessionEndedModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [
    sessionJustEnded,
    sessionTime,
    sessionName,
    sessionIdJustEnded,
    userId,
    token,
  ]);

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
      let storedToken: string | null = null;
      let storedUserId: string | null = null;

      try {
        storedToken = await AsyncStorage.getItem("token");
        storedUserId = await AsyncStorage.getItem("userId");
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
            setUserPreferences(prefsData as UserPreferencesDetail);
          }

          const activeProgramIdFromPrefs = (prefsData as UserPreferencesDetail)
            ?.active_program_id;

          if (!prefsData.error && activeProgramIdFromPrefs) {
            const programData = await fetchProgramById(
              activeProgramIdFromPrefs,
              storedToken
            );
            if (programData.error) {
              currentError = `${
                currentError ? currentError + "\n" : ""
              }Erreur Programme: ${programData.error}`;
              setActiveProgram(null);
              setProgramSessions([]);
            } else {
              setActiveProgram(programData as UserProgram);
              const sessionsData = await fetchSessionsWithExercisesForProgram(
                programData.id,
                storedToken
              );
              if (Array.isArray(sessionsData)) {
                const sortedSessions = sessionsData.sort(
                  (a, b) => (a.day_number || 0) - (b.day_number || 0)
                );
                setProgramSessions(sortedSessions);

                if (sortedSessions.length > 0 && storedUserId && storedToken) {
                  const initialCompletionData = sortedSessions.reduce(
                    (acc, session) => {
                      acc[session.id] = {
                        count: 0,
                        isLoading: true,
                        error: undefined,
                      };
                      return acc;
                    },
                    {} as typeof sessionCompletionData
                  );
                  setSessionCompletionData(initialCompletionData);

                  const completionPromises = sortedSessions.map((session) =>
                    fetchSessionCompletionCount(
                      session.id,
                      storedUserId!,
                      storedToken!
                    )
                  );

                  Promise.allSettled(completionPromises).then((results) => {
                    setSessionCompletionData((prevData) => {
                      const newData = { ...prevData };
                      results.forEach((promiseResult) => {
                        if (promiseResult.status === "fulfilled") {
                          const countResponse: SessionCountResponse =
                            promiseResult.value;
                          if (
                            countResponse.sessionId &&
                            newData[countResponse.sessionId]
                          ) {
                            newData[countResponse.sessionId] = {
                              count:
                                countResponse.count !== undefined
                                  ? countResponse.count
                                  : 0,
                              isLoading: false,
                              error: countResponse.error,
                            };
                          }
                        }
                      });
                      return newData;
                    });
                  });
                } else {
                  setSessionCompletionData({});
                }
              } else {
                currentError = `${
                  currentError ? currentError + "\n" : ""
                }Erreur Séances: ${(sessionsData as { error: string }).error}`;
                setProgramSessions([]);
              }
            }
          } else if (!activeProgramIdFromPrefs && !prefsData.error) {
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
  }, [router, fadeAnim, sessionJustEnded]);

  useEffect(() => {
    if (programSessions.length > 0 && Object.keys(sessionCompletionData).length > 0) {
      const count = programSessions.reduce((acc, session) => {
        const status = sessionCompletionData[session.id];
        if (status && !status.isLoading && status.count > 0) {
          return acc + 1;
        }
        return acc;
      }, 0);
      setCompletedSessionsCount(count);
    } else {
      setCompletedSessionsCount(0);
    }
  }, [sessionCompletionData, programSessions]);


  const navigateToProfile = () => {
    router.push("/user/profile");
  };

  const navigateToSessionDetails = (
    sessionId: string,
    sessionNameParam?: string
  ) => {
    router.push({
      pathname: "/sessions/session-details",
      params: {
        id: sessionId,
        sessionName: sessionNameParam || "Détails de la séance",
        programId: activeProgram?.id,
      },
    });
  };

  const triggerSessionPress = (session: ProgramSession) => {
    const completionStatus = sessionCompletionData[session.id];
    const isCompleted =
      (completionStatus?.count || 0) > 0 && !completionStatus?.isLoading;

    if (isCompleted) {
      return;
    }

    const sessionDayNumber = session.day_number || 0;

    if (
      sessionDayNumber > 0 &&
      sessionDayNumber < currentDayOfWeek &&
      !isCompleted
    ) {
      setSelectedOffDaySession({
        id: session.id,
        name: session.name,
        message:
          "Cette séance était prévue un jour précédent et semble manquée. Voulez-vous vraiment la faire maintenant ?",
      });
      setShowOffDaySessionConfirmModal(true);
    } else if (
      sessionDayNumber > 0 &&
      sessionDayNumber > currentDayOfWeek &&
      !isCompleted
    ) {
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
        "Veuillez d'abord configurer vos préférences utilisateur."
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

    const essentialPrefs = [
      userPreferences.name, userPreferences.gender, userPreferences.age,
      userPreferences.height_cm, userPreferences.weight_kg, userPreferences.goal,
      userPreferences.training_place, userPreferences.session_length, userPreferences.milestone
    ];
    if (essentialPrefs.some(pref => pref === null || pref === undefined)) {
      setError(
        "Certaines préférences utilisateur essentielles sont manquantes. Veuillez vérifier votre profil."
      );
      Alert.alert(
        "Erreur",
        "Préférences utilisateur incomplètes. Veuillez mettre à jour votre profil."
      );
      setIsGeneratingProgram(false);
      router.push("/user/edit-preferences");
      return;
    }

    try {
      const oldProgramId = userPreferences.active_program_id;
      if (oldProgramId) {
        const deleteRes = await deleteProgram(oldProgramId, token);
        if (deleteRes.error) {
          accumulatedErrorMessages += `Échec suppression ancien programme: ${deleteRes.error}\n`;
        }
      }

      const genResponse = await autoGenerateNewProgram(userId, token);

      if (genResponse.error || !genResponse.program_id) {
        const errorMessage =
          genResponse.error ||
          "ID de programme manquant dans la réponse de génération.";
        accumulatedErrorMessages += `Échec de la génération: ${errorMessage}\n`;
      } else {
        const newProgramId = genResponse.program_id;

        const prefsForUpdate: UserPreferencesPayload = {
          user_id: userId,
          name: userPreferences.name!,
          gender: userPreferences.gender!,
          age: userPreferences.age!,
          height_cm: userPreferences.height_cm!,
          weight_kg: userPreferences.weight_kg!,
          goal: userPreferences.goal!,
          training_place: userPreferences.training_place!,
          session_length: userPreferences.session_length!,
          milestone: userPreferences.milestone!,
          ...(userPreferences.training_days && {
            training_days: userPreferences.training_days,
          }),
          active_program_id: newProgramId,
        };

        const updatedPrefsResponse = await updateUserActiveProgram(
          userId,
          prefsForUpdate,
          newProgramId,
          token
        );

        if (updatedPrefsResponse.error) {
          const updateErrorMessage = `Programme généré (ID: ${newProgramId}) mais échec activation: ${updatedPrefsResponse.error}`;
          accumulatedErrorMessages += updateErrorMessage + "\n";
        } else {
          if (
            !("error" in updatedPrefsResponse) &&
            typeof (updatedPrefsResponse as UserPreferencesDetail).user_id === "string"
          ) {
            setUserPreferences(updatedPrefsResponse as UserPreferencesDetail);
          } else {
            const unexpectedFormatError =
              "Format de réponse de mise à jour des préférences inattendu.";
            accumulatedErrorMessages += unexpectedFormatError + "\n";
            const freshPrefs = await fetchUserPreferencesDetails(userId, token);
            if (!freshPrefs.error) {
              setUserPreferences(freshPrefs as UserPreferencesDetail);
            }
          }
        }

        const programDetails = await fetchProgramById(newProgramId, token);
        if (programDetails.error) {
          const detailsErrorMessage = `Impossible de récupérer détails du nouveau programme (ID: ${newProgramId}): ${programDetails.error}`;
          accumulatedErrorMessages += detailsErrorMessage + "\n";
          setActiveProgram(null);
          setProgramSessions([]);
        } else {
          setActiveProgram(programDetails as UserProgram);
          const sessionsData = await fetchSessionsWithExercisesForProgram(
            newProgramId,
            token
          );
          if (Array.isArray(sessionsData)) {
            const sortedSessions = sessionsData.sort(
              (a, b) => (a.day_number || 0) - (b.day_number || 0)
            );
            setProgramSessions(sortedSessions);
            if (sortedSessions.length > 0 && userId && token) {
              const initialCompletionData = sortedSessions.reduce(
                (acc, session) => {
                  acc[session.id] = {
                    count: 0,
                    isLoading: true,
                    error: undefined,
                  };
                  return acc;
                },
                {} as typeof sessionCompletionData
              );
              setSessionCompletionData(initialCompletionData);

              const completionPromises = sortedSessions.map((session) =>
                fetchSessionCompletionCount(session.id, userId, token)
              );
              Promise.allSettled(completionPromises).then((results) => {
                setSessionCompletionData((prevData) => {
                  const newData = { ...prevData };
                  results.forEach((promiseResult) => {
                    if (promiseResult.status === "fulfilled") {
                      const countResponse: SessionCountResponse =
                        promiseResult.value;
                      if (
                        countResponse.sessionId &&
                        newData[countResponse.sessionId]
                      ) {
                        newData[countResponse.sessionId] = {
                          count: countResponse.count ?? 0,
                          isLoading: false,
                          error: countResponse.error,
                        };
                      }
                    }
                  });
                  return newData;
                });
              });
            } else {
              setSessionCompletionData({});
            }
          } else {
            const sessionsErrorMessage = `Impossible de charger les séances: ${
              (sessionsData as { error: string }).error
            }`;
            accumulatedErrorMessages += sessionsErrorMessage + "\n";
            setProgramSessions([]);
          }
        }
      }
      if (accumulatedErrorMessages) {
        setError(accumulatedErrorMessages.trim());
        Alert.alert("Problèmes rencontrés", accumulatedErrorMessages.trim());
      } else {
        Alert.alert("Succès", "Nouveau programme généré et activé !");
      }
    } catch (e: any) {
      const catchErrorMessage = e.message || "Erreur de communication.";
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
      const durationWeeks = activeProgram.duration_weeks > 0 ? activeProgram.duration_weeks : 6;
      const programDurationMs = durationWeeks * 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(startDate.getTime())) {
        return currentDate.getTime() > startDate.getTime() + programDurationMs;
      }
    }
    return false;
  };
  const programIsOlderThanDuration = isProgramOld();

  if (isLoading && (!userId || !token)) {
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
    !userPreferences.active_program_id &&
    !isLoading;

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
          {showNoActiveProgramMessage && (
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
              {programIsOlderThanDuration ? (
                <>
                  <Text style={styles.sectionTitleWarning}>
                    Programme à renouveler
                  </Text>
                  <Text style={styles.oldProgramMessage}>
                    Votre programme "{activeProgram.name}" est terminé ou a
                    dépassé sa durée prévue de {activeProgram.duration_weeks || "N/A"}{" "}
                    semaines. Pour de meilleurs résultats et continuer à
                    progresser, il est recommandé de le renouveler.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Colors.dark.primary, marginTop: 20 },
                      isGeneratingProgram && styles.buttonDisabled,
                    ]}
                    onPress={confirmAndGenerateProgram}
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
            !programIsOlderThanDuration &&
            programSessions.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>
                  Vos Séances ({completedSessionsCount} / {programSessions.length} complétées)
                </Text>
                {programSessions.map((session) => {
                  const exerciseCount =
                    session.exercise_count ||
                    (session.exercises && session.exercises.length) ||
                    0;
                  const dayNumber = session.day_number;
                  const dayName =
                    dayNumber && dayNumber >= 1 && dayNumber <= 7
                      ? FRENCH_DAYS[dayNumber - 1]
                      : `Jour ${dayNumber || "N/A"}`;

                  const completionStatus = sessionCompletionData[session.id];
                  const isCompleted =
                    (completionStatus?.count || 0) > 0 &&
                    !completionStatus?.isLoading;
                  const isLoadingCompletion =
                    completionStatus?.isLoading === true;

                  const isPastSessionAndNotCurrent =
                    dayNumber && dayNumber < currentDayOfWeek;
                  const isFutureSessionAndNotCurrent =
                    dayNumber && dayNumber > currentDayOfWeek;
                  const isCurrentDaySession = dayNumber === currentDayOfWeek;

                  let itemDynamicStyle = {};
                  let dayNameDynamicStyle = {};
                  let nameDynamicStyle = {};
                  let infoDynamicStyle = {};
                  let showMissedBadge = false;

                  if (isLoadingCompletion) {
                    itemDynamicStyle = styles.loadingSessionItem;
                  } else if (isCompleted) {
                    itemDynamicStyle = styles.completedSessionItem;
                    dayNameDynamicStyle = styles.completedSessionText;
                    nameDynamicStyle = styles.completedSessionText;
                    infoDynamicStyle = styles.completedSessionInfoText;
                  } else {
                    if (isPastSessionAndNotCurrent) {
                      itemDynamicStyle = styles.pastSessionItem;
                      dayNameDynamicStyle = styles.pastSessionDayNameText;
                      nameDynamicStyle = styles.pastSessionNameText;
                      infoDynamicStyle = styles.pastSessionInfoText;
                      showMissedBadge = true;
                    } else if (isCurrentDaySession) {
                      itemDynamicStyle = styles.currentDaySessionItem;
                      dayNameDynamicStyle = styles.currentDaySessionDayNameText;
                      nameDynamicStyle = styles.currentDaySessionNameText;
                      infoDynamicStyle = styles.currentDaySessionInfoText;
                    } else if (isFutureSessionAndNotCurrent) {
                      dayNameDynamicStyle = styles.offDaySessionText;
                      nameDynamicStyle = styles.offDaySessionText;
                      infoDynamicStyle = styles.offDaySessionText;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.sessionItem, itemDynamicStyle]}
                      onPress={() => triggerSessionPress(session)}
                      disabled={isLoadingCompletion || isCompleted}
                    >
                      <View style={styles.sessionTextContainer}>
                        <View style={styles.sessionHeaderRow}>
                          <Text
                            style={[styles.sessionDayName, dayNameDynamicStyle]}
                          >
                            {dayName}
                          </Text>
                          {isLoadingCompletion && (
                            <ActivityIndicator
                              size="small"
                              color={Colors.dark.tint}
                            />
                          )}
                          {!isLoadingCompletion && isCompleted && (
                            <FontAwesome5
                              name="check-circle"
                              size={18}
                              color={styles.completedSessionIcon.color}
                            />
                          )}
                          {!isLoadingCompletion &&
                            !isCompleted &&
                            showMissedBadge && (
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
                          style={[styles.sessionName, nameDynamicStyle]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {session.name}
                        </Text>
                        <Text style={[styles.sessionInfo, infoDynamicStyle]}>
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
            !programIsOlderThanDuration &&
            programSessions.length === 0 &&
            !isLoading &&
            !isGeneratingProgram &&
            (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances</Text>
                <Text style={styles.infoText}>
                  Aucune séance trouvée pour ce programme. Cela peut prendre un
                  moment après la génération.
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
              actuel s'il existe. Êtes-vous sûr de vouloir continuer ?
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
                style={[styles.modalButton, styles.modalConfirmButton, isGeneratingProgram && styles.buttonDisabled]}
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
                <Text style={styles.modalConfirmButtonText}>Oui</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const missedWarningColor = Colors.dark.warning || "#FFB74D";
const pastItemBackgroundColor = Colors.dark.warningBackground || "#2F2F2F";
const pastItemBorderColor = Colors.dark.warningBorder || missedWarningColor;
const pastItemTextColor = Colors.dark.warningText || "#B0B0B0";
const pastItemNameTextColor = Colors.dark.warningTitleText || "#E0E0E0";

const completedColor =  "#4CAF50";
const completedBackgroundColor =  "#2A3B2B";
const completedBorderColor = completedColor;
const completedTextColor =  "#A5D6A7";
const completedIconColor = completedColor;

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
    color: Colors.dark.title || Colors.dark.tint,
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
  loadingSessionItem: {
    opacity: 0.7,
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
  completedSessionItem: {
    backgroundColor: completedBackgroundColor,
    borderColor: completedBorderColor,
    opacity: 0.8,
  },
  sessionTextContainer: {
    flex: 1,
  },
  sessionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionDayName: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.dark.tint,
  },
  pastSessionDayNameText: { color: pastItemTextColor },
  currentDaySessionDayNameText: { color: Colors.dark.primary },
  completedSessionText: { color: completedTextColor, fontWeight: "bold" },
  offDaySessionText: { color: Colors.dark.disabledText || "#757575" },

  sessionName: {
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 4,
  },
  pastSessionNameText: { color: pastItemNameTextColor },
  currentDaySessionNameText: { color: Colors.dark.text },

  sessionInfo: {
    fontSize: 13,
    color: Colors.dark.secondary,
  },
  pastSessionInfoText: { color: pastItemTextColor },
  currentDaySessionInfoText: { color: Colors.dark.secondary },
  completedSessionInfoText: { color: completedTextColor },


  missedSessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  missedSessionBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "600",
    color: missedWarningColor,
  },
  completedSessionIcon: {
    color: completedIconColor,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
    alignSelf: "center",
    minWidth: 200,
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
    color: Colors.dark.title || Colors.dark.tint,
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
    width: 200,
    height: 200,
  },
  loadingModalText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.dark.text,
    fontWeight: "bold",
  },
});
