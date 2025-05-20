import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
  Modal,
  BackHandler,
  Image, // Import Image
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import {
  SessionExercise,
  fetchExercisesForOneSession,
} from "@/components/services/apiService";

// Interface for tracking exercise progress
interface ExerciseProgress {
  id: string;
  name: string;
  totalSets: number;
  completedSets: number;
}

// Back Icon Component
const BackIcon = () => (
  <MaterialIcons
    name="arrow-back-ios"
    size={22}
    color={Colors.dark.tint}
    style={{ marginLeft: -5 }}
  />
);

// Helper to format time
const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedHours = hours.toString().padStart(2, "0");
  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};


export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sessionName?: string }>();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>("Détail de la séance");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // States for interactive session
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([]);
  const [showExitConfirmationModal, setShowExitConfirmationModal] = useState(false);


  useEffect(() => {
    if (params && typeof params.id === "string" && params.id.trim() !== "") {
      setCurrentSessionId(params.id);
      setCurrentSessionName(params.sessionName || "Détail de la séance");
    } else if (params && Object.keys(params).length > 0 && !params.id) {
      setError("ID de session non fourni ou invalide.");
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const loadTokenAndExercises = async () => {
      if (!currentSessionId) {
        setIsLoading(false); return;
      }
      setIsLoading(true); setError(null);
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);

      if (storedToken) {
        try {
          const exercisesData = await fetchExercisesForOneSession(currentSessionId, storedToken);
          
          console.log("DEBUG: Données brutes de fetchExercisesForOneSession:", JSON.stringify(exercisesData, null, 2));

          if (Array.isArray(exercisesData)) {
            exercisesData.forEach((item: any, index: number) => {
              if (item && typeof item.image_url === 'undefined') {
                console.warn(`DEBUG: Élément ${index} ('${item.name || 'Nom inconnu'}') dans les données brutes N'A PAS de image_url.`);
              } else if (item && item.image_url === null) {
                console.log(`DEBUG: Élément ${index} ('${item.name || 'Nom inconnu'}') dans les données brutes a image_url = null.`);
              } else if (item) {
                console.log(`DEBUG: Élément ${index} ('${item.name || 'Nom inconnu'}') dans les données brutes a image_url = ${item.image_url}`);
              }
            });

            setExercises(exercisesData as SessionExercise[]);
            
            const initialProgress = (exercisesData as SessionExercise[]).map(ex => ({
              id: ex.id,
              name: ex.name,
              totalSets: ex.sets,
              completedSets: 0,
            }));
            setExerciseProgress(initialProgress);
          } else if (exercisesData && (exercisesData as { error: string }).error) {
            setError((exercisesData as { error: string }).error || "Erreur lors de la récupération des exercices.");
            setExercises([]); setExerciseProgress([]);
          } else {
            console.warn("DEBUG: exercisesData n'est pas un tableau et n'est pas un objet d'erreur reconnu:", exercisesData);
            setError("Réponse inattendue du serveur pour les exercices.");
            setExercises([]); setExerciseProgress([]);
          }
        } catch (e: any) {
          setError(e.message || "Une erreur inattendue est survenue.");
          setExercises([]); setExerciseProgress([]);
        }
      } else {
        setError("Token d'authentification manquant. Veuillez vous reconnecter.");
      }
      setIsLoading(false);
    };

    if (currentSessionId) loadTokenAndExercises();
    else if (params && Object.keys(params).length > 0 && !params.id) setIsLoading(false);
    else if (!params || Object.keys(params).length === 0) setIsLoading(false);

  }, [currentSessionId]);


  // Timer effect
  useEffect(() => {
    if (isSessionActive && sessionStartTime) {
      if (timerIntervalRef.current === null) {
        timerIntervalRef.current = setInterval(() => {
          setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
        }, 1000) as unknown as number;
      }
    } else {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isSessionActive, sessionStartTime]);

  // Back press handler effect
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isSessionActive) {
          setShowExitConfirmationModal(true);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isSessionActive])
  );


  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    const initialProgress = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      totalSets: ex.sets,
      completedSets: 0,
    }));
    setExerciseProgress(initialProgress);
  };

  const handleMarkSetDone = (exerciseId: string) => {
    setExerciseProgress(prevProgress =>
      prevProgress.map(prog => {
        if (prog.id === exerciseId && prog.completedSets < prog.totalSets) {
          return { ...prog, completedSets: prog.completedSets + 1 };
        }
        return prog;
      })
    );
  };

  const handleUnmarkSetDone = (exerciseId: string) => {
    setExerciseProgress(prevProgress =>
      prevProgress.map(prog => {
        if (prog.id === exerciseId && prog.completedSets > 0) {
          return { ...prog, completedSets: prog.completedSets - 1 };
        }
        return prog;
      })
    );
  };

  const handleEndSession = () => {
    if (!allSetsCompleted) {
        Alert.alert("Attention", "Veuillez compléter toutes les séries de tous les exercices avant de terminer la séance.");
        return;
    }

    const finalElapsedTime = elapsedTime;
    setIsSessionActive(false);

    console.log("Session terminée sur SessionDetailScreen. Temps total:", formatTime(finalElapsedTime), "Progression:", exerciseProgress);

    const initialProgress = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      totalSets: ex.sets,
      completedSets: 0,
    }));
    setExerciseProgress(initialProgress);
    setElapsedTime(0);

    router.replace({
        pathname: "/dashboard/dashboard",
        params: {
            sessionJustEnded: "true",
            sessionTime: formatTime(finalElapsedTime),
            sessionName: currentSessionName
        }
    });
  };


  const handleYouTubeSearch = async (exerciseName: string) => {
    if (!exerciseName) return;
    const query = encodeURIComponent(`Tuto: ${exerciseName}`);
    const url = `https://www.youtube.com/results?search_query=${query}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("Erreur", `Impossible d'ouvrir le lien: ${url}`);
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue en essayant d'ouvrir YouTube.");
      console.error("YouTube Linking Error:", error);
    }
  };

  const retryLoadExercises = async () => {
    if (token && currentSessionId) {
      setIsLoading(true); setError(null);
      try {
        const exercisesData = await fetchExercisesForOneSession(currentSessionId, token);
        console.log("DEBUG (retry): Données brutes de fetchExercisesForOneSession:", JSON.stringify(exercisesData, null, 2));
        if (Array.isArray(exercisesData)) {
          exercisesData.forEach((item: any, index: number) => { 
            if (item && typeof item.image_url === 'undefined') console.warn(`DEBUG (retry): Élément ${index} ('${item.name || 'Nom inconnu'}') N'A PAS de image_url.`);
          });
          setExercises(exercisesData as SessionExercise[]);
          const initialProgress = (exercisesData as SessionExercise[]).map(ex => ({ id: ex.id, name:ex.name, totalSets: ex.sets, completedSets: 0 }));
          setExerciseProgress(initialProgress);
        } else {
          setError((exercisesData as {error: string}).error || "Erreur lors de la récupération des exercices.");
          setExercises([]); setExerciseProgress([]);
        }
      } catch (e: any) {
        setError(e.message || "Une erreur inattendue est survenue.");
        setExercises([]); setExerciseProgress([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert("Erreur", "Impossible de réessayer sans token ou ID de session valide.");
    }
  };

  const confirmExitSession = () => {
    setShowExitConfirmationModal(false);
    setIsSessionActive(false);
    setElapsedTime(0);
    router.back();
  };

  const allSetsCompleted = exercises.length > 0 && exerciseProgress.every(
    prog => prog.completedSets === prog.totalSets
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement des exercices...</Text>
      </View>
    );
  }

  if (error || !currentSessionId) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><BackIcon /></TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{error ? "Erreur" : "Session inconnue"}</Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centeredError}>
          <MaterialIcons name="error-outline" size={48} color={Colors.dark.primary}/>
          <Text style={styles.errorText}>{error || "ID de session non spécifié ou invalide."}</Text>
          {(error && currentSessionId && token) && (
            <TouchableOpacity style={styles.retryButton} onPress={retryLoadExercises}><Text style={styles.retryButtonText}>Réessayer</Text></TouchableOpacity>
          )}
          {!(error && currentSessionId && token) && (
             <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}><Text style={styles.retryButtonText}>Retour</Text></TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!isSessionActive && exercises.length === 0) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><BackIcon /></TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{currentSessionName}</Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centered}>
          <MaterialIcons name="fitness-center" size={48} color={Colors.dark.secondary}/>
          <Text style={styles.infoText}>Aucun exercice trouvé pour cette séance.</Text>
            <TouchableOpacity
                style={[styles.startSessionButton, exercises.length === 0 && styles.buttonDisabled]}
                onPress={handleStartSession}
                disabled={exercises.length === 0}
            >
              <Text style={styles.startSessionButtonText}>Commencer la Séance</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            if (isSessionActive) setShowExitConfirmationModal(true);
            else router.back();
          }}
          style={styles.headerButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {currentSessionName}
        </Text>
        {isSessionActive ? (
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        ) : (
            <View style={styles.headerButtonPlaceholder} />
        )}
      </View>

      {!isSessionActive && exercises.length > 0 && (
        <TouchableOpacity
            style={styles.startSessionButton}
            onPress={handleStartSession}
        >
          <Text style={styles.startSessionButtonText}>Commencer la Séance</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          {exercises.map((sessionEx) => {
            const progress = exerciseProgress.find(p => p.id === sessionEx.id);
            if (!sessionEx || !sessionEx.name || !progress) {
              return (
                <View key={`error-${sessionEx?.id || Math.random()}`} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>Données d'exercice invalides</Text>
                </View>
              );
            }

            return (
              <View key={sessionEx.id} style={styles.exerciseCard}>
                {/* Exercise Image Container */}
                <View style={styles.exerciseImageContainer}>
                  {sessionEx.image_url ? (
                    <Image
                      source={{ uri: sessionEx.image_url }}
                      style={styles.exerciseImage} 
                      resizeMode="contain" 
                      onError={(e) => {
                        console.warn(`ERREUR CHARGEMENT IMAGE pour ${sessionEx.name} (URL: ${sessionEx.image_url}): `, e.nativeEvent.error);
                      }}
                      onLoad={() => console.log(`Image chargée avec succès pour ${sessionEx.name}: ${sessionEx.image_url}`)}
                    />
                  ) : (
                    <View style={styles.exerciseImagePlaceholder}>
                      <MaterialIcons name="image" size={40} color={Colors.dark.secondary} />
                      <Text style={styles.exerciseImagePlaceholderText}>Pas d'image</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.exerciseName}>{sessionEx.name}</Text>
                {sessionEx.description && (<Text style={styles.exerciseDescription}>{sessionEx.description}</Text>)}
                <View style={styles.exerciseDetailsRow}>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Séries</Text><Text style={styles.detailValue}>{sessionEx.sets}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Répétitions</Text><Text style={styles.detailValue}>{sessionEx.reps}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Repos</Text><Text style={styles.detailValue}>{sessionEx.rest_time}s</Text></View>
                </View>
                <View style={styles.exerciseMetaRow}><Text style={styles.metaText}>Groupe Musculaire: {sessionEx.muscle_group || "-"}</Text></View>

                {isSessionActive && (
                  <View style={styles.setsProgressContainer}>
                    <Text style={styles.setsProgressText}>
                      Séries complétées: {progress.completedSets} / {progress.totalSets}
                    </Text>
                    <View style={styles.setButtonsRow}>
                        <TouchableOpacity
                        style={[
                            styles.setActionButton,
                            styles.unmarkSetButton,
                            progress.completedSets <= 0 && styles.buttonDisabled,
                        ]}
                        onPress={() => handleUnmarkSetDone(sessionEx.id)}
                        disabled={progress.completedSets <= 0}
                        >
                        <MaterialIcons name="remove-circle-outline" size={20} color={Colors.dark.background} />
                        <Text style={styles.setActionButtonText}>Annuler Série</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                        style={[
                            styles.setActionButton,
                            styles.markSetButton,
                            progress.completedSets >= progress.totalSets && styles.buttonDisabled,
                        ]}
                        onPress={() => handleMarkSetDone(sessionEx.id)}
                        disabled={progress.completedSets >= progress.totalSets}
                        >
                        <MaterialIcons name="check-circle-outline" size={20} color={Colors.dark.background} />
                        <Text style={styles.setActionButtonText}>Série Faite</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.youtubeButton} onPress={() => handleYouTubeSearch(sessionEx.name)}>
                  <FontAwesome5 name="youtube" size={18} color={Colors.dark.youtubeRed || '#FF0000'} />
                  <Text style={styles.youtubeButtonText}>Voir Tutoriel</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {isSessionActive && (
        <TouchableOpacity
          style={[styles.endSessionButton, !allSetsCompleted && styles.buttonDisabled]}
          onPress={handleEndSession}
          disabled={!allSetsCompleted}
        >
          <Text style={styles.endSessionButtonText}>Terminer la Séance</Text>
        </TouchableOpacity>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showExitConfirmationModal}
        onRequestClose={() => setShowExitConfirmationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Quitter la séance ?</Text>
            <Text style={styles.modalMessage}>
              Attention, si vous quittez maintenant, la progression de votre séance en cours sera perdue.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setShowExitConfirmationModal(false)}>
                <Text style={styles.modalCancelButtonText}>Rester</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalConfirmButton]} onPress={confirmExitSession}>
                <Text style={styles.modalConfirmButtonText}>Quitter</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.card,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonPlaceholder: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.title,
    textAlign: "center",
    flex: 1,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark.tint,
    minWidth: 60,
    textAlign: 'right',
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  centeredError: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.dark.text,
  },
  errorText: {
    color: Colors.dark.primary,
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
    lineHeight: 22,
  },
  infoText: {
    color: Colors.dark.secondary,
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 25,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  exerciseCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  // Conteneur pour l'image et son placeholder, pour appliquer la bordure et le borderRadius
  exerciseImageContainer: {
    width: 240, 
    height: 240,
    alignSelf: 'center', 
    borderRadius: 8, // Coins arrondis pour le conteneur
    marginBottom: 12,
    backgroundColor: Colors.dark.card, 
    borderWidth: 1, 
    borderColor: Colors.dark.secondaryBackground, 
    overflow: 'hidden', // Important pour que le borderRadius du conteneur coupe l'image
  },
  // Style pour l'image elle-même
  exerciseImage: {
    width: "100%", // L'image prend toute la largeur de son conteneur carré
    height: "100%", // L'image prend toute la hauteur de son conteneur carré
    // borderRadius n'est plus nécessaire ici, car le parent exerciseImageContainer s'en charge avec overflow: 'hidden'
  },
  exerciseImagePlaceholder: {
    // Le placeholder remplit également le conteneur exerciseImageContainer
    width: "100%",
    height: "100%",
    // borderRadius n'est plus nécessaire ici
    backgroundColor: Colors.dark.secondaryBackground, 
    justifyContent: 'center',
    alignItems: 'center',
    // La bordure est déjà sur exerciseImageContainer
  },
  exerciseImagePlaceholderText: {
    marginTop: 8,
    color: Colors.dark.secondary,
    fontSize: 14,
  },
  exerciseName: {
    fontSize: 19,
    fontWeight: "bold",
    color: Colors.dark.tint,
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.secondaryBackground || Colors.dark.secondary,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.dark.secondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  exerciseMetaRow: {
    marginTop: 10,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 13,
    color: Colors.dark.secondary,
    fontStyle: "italic",
  },
  youtubeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.secondaryBackground || Colors.dark.card,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: Colors.dark.youtubeRed || Colors.dark.primary,
  },
  youtubeButtonText: {
    color: Colors.dark.youtubeRed || Colors.dark.primary,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "bold",
  },
  startSessionButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startSessionButtonText: {
    color: Colors.dark.background,
    fontSize: 17,
    fontWeight: "bold",
  },
  setsProgressContainer: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.secondaryBackground || Colors.dark.secondary,
  },
  setsProgressText: {
    fontSize: 15,
    color: Colors.dark.text,
    marginBottom: 10,
    fontWeight: '500',
  },
  setButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 5,
  },
  setActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    minWidth: 140,
    justifyContent: 'center',
  },
  markSetButton: {
    backgroundColor: Colors.dark.tint,
  },
  unmarkSetButton: {
    backgroundColor: Colors.dark.secondary,
  },
  setActionButtonText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  endSessionButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  endSessionButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: Colors.dark.disabled || '#555555',
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxWidth: 380,
    backgroundColor: Colors.dark.card,
    borderRadius: 15,
    paddingVertical: 25,
    paddingHorizontal: 20,
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
    fontSize: 16,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 23,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  modalCancelButton: {
    backgroundColor: Colors.dark.secondaryBackground || Colors.dark.secondary,
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
});
