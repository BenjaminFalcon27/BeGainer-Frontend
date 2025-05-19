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
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import LottieView from "lottie-react-native"; // Import LottieView
import {
  UserPreferencesDetail,
  UserProgram,
  ProgramSession as ApiProgramSession,
  fetchUserPreferencesDetails,
  fetchProgramById,
  fetchSessionsWithExercisesForProgram,
  autoGenerateNewProgram,
  updateUserActiveProgram,
  UserPreferencesPayload,
  deleteProgram,
} from "@/components/services/apiService";

// Extend ProgramSession locally
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
  "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche",
];

const ProfileIcon = () => (
  <MaterialIcons name="account-circle" size={28} color={Colors.dark.tint} />
);

export default function DashboardScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false); // Controls Lottie for program generation
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferencesDetail | null>(null);
  const [activeProgram, setActiveProgram] = useState<UserProgram | null>(null);
  const [programSessions, setProgramSessions] = useState<ProgramSession[]>([]);

  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);

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

          const prefsData = await fetchUserPreferencesDetails(storedUserId, storedToken);
          if (prefsData.error) {
            currentError = `Erreur Préférences: ${prefsData.error}`;
            setUserPreferences(null);
          } else {
            setUserPreferences(prefsData);
          }

          if (!prefsData.error && prefsData.active_program_id) {
            const programData = await fetchProgramById(prefsData.active_program_id, storedToken);
            if (programData.error) {
              currentError = `${currentError ? currentError + "\n" : ""}Erreur Programme: ${programData.error}`;
              setActiveProgram(null);
              setProgramSessions([]);
            } else {
              setActiveProgram(programData);
              const sessionsData = await fetchSessionsWithExercisesForProgram(programData.id, storedToken);
              if (Array.isArray(sessionsData)) {
                const sortedSessions = (sessionsData as ProgramSession[]).sort(
                  (a, b) => (a.day_number || 0) - (b.day_number || 0)
                );
                setProgramSessions(sortedSessions);
              } else {
                currentError = `${currentError ? currentError + "\n" : ""}Erreur Séances: ${(sessionsData as { error: string }).error}`;
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
        currentError = e.message || "Une erreur inattendue est survenue lors du chargement.";
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

  const handleSessionPress = (sessionId: string, sessionName?: string) => {
    router.push({
      pathname: "/sessions/session-details",
      params: { id: sessionId, sessionName: sessionName || "Détails de la séance" },
    });
  };

  const triggerProgramGeneration = () => {
    if (!userId || !token) {
      Alert.alert("Erreur", "Impossible de récupérer les informations utilisateur.");
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
    setIsGeneratingProgram(true); // Show Lottie animation
    setError(null);
    let accumulatedErrorMessages = "";

    if (!userId || !token || !userPreferences) {
        setError("Données utilisateur critiques manquantes.");
        setIsGeneratingProgram(false); // Hide Lottie
        return;
    }

    try {
      const oldProgramId = userPreferences.active_program_id;
      if (oldProgramId) {
        console.log(`Tableau de bord: Tentative de suppression de l'ancien programme actif: ${oldProgramId}`);
        const deleteResponse = await deleteProgram(oldProgramId, token);
        if (deleteResponse.error) {
          const deleteErrorMessage = `Échec de la suppression de l'ancien programme (ID: ${oldProgramId}): ${deleteResponse.error}. La génération du nouveau programme va continuer.`;
          console.warn(`Tableau de bord: ${deleteErrorMessage}`);
          Alert.alert("Attention", deleteErrorMessage);
          accumulatedErrorMessages += deleteErrorMessage + "\n";
        } else {
          console.log(`Tableau de bord: Ancien programme ${oldProgramId} supprimé avec succès.`);
          setUserPreferences(prev => prev ? { ...prev, active_program_id: undefined } : null);
          if (activeProgram && activeProgram.id === oldProgramId) {
            setActiveProgram(null);
            setProgramSessions([]);
          }
        }
      }

      const genResponse: SimpleProgramGenerationResponse = await autoGenerateNewProgram(userId, token);

      if (genResponse.error || !genResponse.program_id) {
        const errorMessage = genResponse.error || "ID de programme manquant dans la réponse de génération.";
        Alert.alert("Échec de la génération", errorMessage);
        accumulatedErrorMessages += `Échec de la génération: ${errorMessage}\n`;
        setError(accumulatedErrorMessages || errorMessage);
      } else {
        const newProgramId = genResponse.program_id;
        const currentPrefsForUpdate: UserPreferencesPayload = { 
            ...userPreferences, 
            user_id: userId, 
        };
        
        const updatedPrefsResponse = await updateUserActiveProgram(userId, currentPrefsForUpdate, newProgramId, token);

        if (updatedPrefsResponse.error) {
          const updateErrorMessage = `Le programme a été généré (ID: ${newProgramId}) mais n'a pas pu être défini comme actif: ${updatedPrefsResponse.error}`;
          Alert.alert("Erreur de mise à jour", updateErrorMessage);
          accumulatedErrorMessages += updateErrorMessage + "\n";
        } else {
          if ("user_id" in updatedPrefsResponse && typeof updatedPrefsResponse.user_id === "string") {
            setUserPreferences(updatedPrefsResponse as UserPreferencesDetail);
          } else {
            const unexpectedFormatError = "La réponse de mise à jour des préférences n'était pas au format attendu.";
            console.error(unexpectedFormatError, updatedPrefsResponse);
            accumulatedErrorMessages += unexpectedFormatError + "\n";
          }
          console.log(genResponse.message || "Nouveau programme généré et défini comme actif !");
        }

        const programDetails = await fetchProgramById(newProgramId, token);
        if (programDetails.error) {
          const detailsErrorMessage = `Impossible de récupérer les détails du nouveau programme (ID: ${newProgramId}): ${programDetails.error}`;
          Alert.alert("Erreur de chargement", detailsErrorMessage);
          accumulatedErrorMessages += detailsErrorMessage + "\n";
          setActiveProgram(null);
          setProgramSessions([]);
        } else {
          setActiveProgram(programDetails);
          const sessionsData = await fetchSessionsWithExercisesForProgram(newProgramId, token);
          if (Array.isArray(sessionsData)) {
            const sortedSessions = (sessionsData as ProgramSession[]).sort(
              (a, b) => (a.day_number || 0) - (b.day_number || 0)
            );
            setProgramSessions(sortedSessions);
          } else {
            const sessionsErrorMessage = `Impossible de charger les séances du nouveau programme: ${(sessionsData as { error: string }).error}`;
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
      const catchErrorMessage = e.message || "Une erreur de communication est survenue lors de la génération du programme.";
      Alert.alert("Erreur Inattendue", catchErrorMessage);
      setError(prevError => (prevError ? prevError + "\n" : "") + catchErrorMessage);
    } finally {
      setIsGeneratingProgram(false); // Hide Lottie animation
    }
  };

  // Initial loading display
  if (isLoading && !userPreferences && !activeProgram) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement du Tableau de Bord...</Text>
      </View>
    );
  }

  const showNoActiveProgramMessage =
    !activeProgram && userPreferences && !userPreferences.error && !userPreferences.active_program_id;

  return (
    <View style={styles.mainContainer}>
      <Animated.View style={{ opacity: fadeAnim, width: "100%", flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de Bord</Text>
          <TouchableOpacity onPress={navigateToProfile} style={styles.profileButton}>
            <ProfileIcon />
          </TouchableOpacity>
        </View>

        {/* Welcome Message */}
        {userName && (
          <Text style={styles.welcomeMessage}>Bonjour, {userName} !</Text>
        )}

        {/* Error Display - only show if not loading/generating */}
        {error && !isLoading && !isGeneratingProgram && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {/* Scrollable Content Area */}
        <ScrollView style={styles.contentScrollView} contentContainerStyle={styles.scrollViewContentContainer}>
            {/* No Active Program Section */}
            {showNoActiveProgramMessage && !isLoading && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Aucun Programme Actif</Text>
                <Text style={styles.infoText}>
                Vous n'avez pas encore de programme d'entraînement actif.
                </Text>
                <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.dark.primary }, isGeneratingProgram && styles.buttonDisabled]}
                onPress={triggerProgramGeneration} 
                disabled={isGeneratingProgram}
                >
                  {/* Text is shown, Lottie modal will cover if isGeneratingProgram is true */}
                  <Text style={styles.actionButtonText}>Générer un programme</Text>
                </TouchableOpacity>
            </View>
            )}

            {/* Active Program Section */}
            {activeProgram && !activeProgram.error && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Votre Programme Actif</Text>
                <Text style={styles.programName}>{activeProgram.name}</Text>
                <View style={styles.programDetails}>
                <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Objectif:</Text> {activeProgram.goal}
                </Text>
                <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Durée:</Text> {activeProgram.duration_weeks} semaines
                </Text>
                </View>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: Colors.dark.secondary, marginTop: 15 }, isGeneratingProgram && styles.buttonDisabled]}
                    onPress={triggerProgramGeneration} 
                    disabled={isGeneratingProgram}
                >
                    <Text style={styles.actionButtonText}>Générer un Nouveau Programme</Text>
                </TouchableOpacity>
            </View>
            )}

            {/* Sessions List Section */}
            {activeProgram && !activeProgram.error && programSessions.length > 0 && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances ({programSessions.length})</Text>
                {programSessions.map((session) => {
                const exerciseCount = session.exercise_count || (session.exercises && session.exercises.length) || 0;
                const dayNumber = session.day_number; 
                const dayName = (dayNumber >= 1 && dayNumber <= 7) ? FRENCH_DAYS[dayNumber - 1] : `Jour ${dayNumber}`;

                return (
                    <TouchableOpacity
                    key={session.id}
                    style={styles.sessionItem}
                    onPress={() => handleSessionPress(session.id, session.name)}
                    >
                    <View style={styles.sessionTextContainer}>
                        <Text style={styles.sessionDayName}>{dayName}</Text>
                        <Text style={styles.sessionName} numberOfLines={2} ellipsizeMode="tail">{session.name}</Text>
                        <Text style={styles.sessionInfo}>
                        {exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}
                        </Text>
                    </View>
                    </TouchableOpacity>
                );
                })}
            </View>
            )}

            {/* No Sessions Found Section */}
            {activeProgram && !activeProgram.error && programSessions.length === 0 && !isLoading && !isGeneratingProgram && (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Vos Séances</Text>
                <Text style={styles.infoText}>
                Aucune séance trouvée pour ce programme. Cela peut être en cours de préparation.
                </Text>
            </View>
            )}
        </ScrollView>
      </Animated.View>

      {/* Custom Confirmation Modal */}
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
                    Générer un nouveau programme supprimera votre programme actif actuel. Êtes-vous sûr de vouloir continuer ?
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
                        {/* Text is shown, Lottie modal will cover if isGeneratingProgram is true */}
                        <Text style={styles.modalConfirmButtonText}>Confirmer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Full Screen Lottie Loading Animation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isGeneratingProgram} // Controlled by isGeneratingProgram state
        // No onRequestClose for loading modal as it's not user-dismissible
      >
        <View style={styles.loadingModalOverlay}>
          <LottieView
            // Assurez-vous que ce chemin est correct
            source={require("../../../assets/animations/loading.json")}
            autoPlay
            loop={true} // Loop is true for loading animations
            style={styles.lottieAnimation}
          />
           <Text style={styles.loadingModalText}>Génération du programme...</Text>
        </View>
      </Modal>
    </View>
  );
}

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
  loadingText: { // For initial screen load
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
    padding: 15,
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
  programName: {
    fontSize: 21, 
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 10,
  },
  programDetails: {
    marginTop: 5,
  },
  detailLabel: {
    fontWeight: "bold", 
    color: Colors.dark.secondary,
  },
  detailText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 5,
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
    paddingVertical: 15, 
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10, 
    flexDirection: "row",
    justifyContent: "space-between", 
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
  },
  sessionTextContainer: { 
    flex: 1, 
  },
  sessionDayName: { 
    fontSize: 13, 
    fontWeight: "bold",
    color: Colors.dark.tint,
    marginBottom: 5, 
  },
  sessionName: {
    fontSize: 17, 
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 4, 
  },
  sessionInfo: {
    fontSize: 13,
    color: Colors.dark.secondary,
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
  buttonDisabled: { // Applied when isGeneratingProgram is true for the action buttons
    opacity: 0.6, 
  },
  modalOverlay: { // For confirmation modal
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
  // Styles for Lottie Loading Modal
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)", // Slightly darker for more focus on animation
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 250, // Can be adjusted
    height: 250, // Can be adjusted
  },
  loadingModalText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.dark.text, 
    fontWeight: "bold",
  },
});
