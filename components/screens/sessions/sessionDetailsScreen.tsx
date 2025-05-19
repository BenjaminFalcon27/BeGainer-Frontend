import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Linking, // Import Linking to open URLs
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons"; // Import FontAwesome5 for YouTube icon
import { Colors } from "@/constants/Colors";
import {
  SessionExercise,
  fetchExercisesForOneSession,
} from "@/components/services/apiService";

// Back Icon Component
const BackIcon = () => (
  <MaterialIcons
    name="arrow-back-ios"
    size={22}
    color={Colors.dark.tint}
    style={{ marginLeft: -5 }}
  />
);

export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sessionName?: string }>();

  // State for session ID and name
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>(
    "Détail de la séance"
  );

  // Ref for fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State for loading, errors, exercises, and token
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [token, setToken] = useState<string | null>(null);

  // Effect to set session ID and name from route parameters
  useEffect(() => {
    if (params && typeof params.id === "string" && params.id.trim() !== "") {
      setCurrentSessionId(params.id);
      setCurrentSessionName(params.sessionName || "Détail de la séance");
    } else if (params && Object.keys(params).length > 0 && !params.id) {
      // This condition means params were passed, but 'id' is missing or invalid
      setError("ID de session non fourni ou invalide.");
      setIsLoading(false); // Stop loading as we can't proceed
    }
    // Consider what happens if no params are passed at all - current logic might keep it loading or show no error.
  }, [params]);

  // Effect for animation and loading exercises
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600, // Animation duration
      useNativeDriver: true,
    }).start();

    const loadTokenAndExercises = async () => {
      // This check ensures we only proceed if currentSessionId is valid.
      if (!currentSessionId) {
        // If still loading and params were passed but ID was invalid (handled by previous useEffect)
        // or if no params were passed and thus no ID set, we shouldn't try to load.
        if (isLoading && ((params && Object.keys(params).length > 0 && !params.id) || !params || Object.keys(params).length === 0)) {
          // No specific error message here if ID was never set and no params were passed.
          // The UI will show "Session inconnue" or the error from the previous useEffect.
        }
        setIsLoading(false); // Stop loading if no valid session ID
        return;
      }

      setIsLoading(true);
      setError(null);
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken); // Store token for potential retry

      if (storedToken) {
        try {
          const exercisesData = await fetchExercisesForOneSession(
            currentSessionId,
            storedToken
          );
          if (Array.isArray(exercisesData)) {
            setExercises(exercisesData);
          } else {
            // exercisesData has an 'error' property
            setError(
              (exercisesData as { error: string }).error ||
                "Erreur lors de la récupération des exercices."
            );
            setExercises([]); // Clear exercises on error
          }
        } catch (e: any) {
          setError(e.message || "Une erreur inattendue est survenue.");
          setExercises([]);
        }
      } else {
        setError("Token d'authentification manquant. Veuillez vous reconnecter.");
      }
      setIsLoading(false);
    };

    // Only call loadTokenAndExercises if currentSessionId is set
    if (currentSessionId) {
      loadTokenAndExercises();
    } else {
      // If currentSessionId is not set, but params were expected and ID was invalid
      if (params && Object.keys(params).length > 0 && !params.id) {
         // Error already set by the first useEffect, just ensure loading is false.
        setIsLoading(false);
      }
      // If no params were passed at all, it's not necessarily an error yet,
      // but loading should stop. The UI will reflect lack of data.
      else if (!params || Object.keys(params).length === 0) {
         setIsLoading(false);
      }
    }
  }, [currentSessionId]); // Depend on currentSessionId to re-run

  // Function to handle YouTube search redirection
  const handleYouTubeSearch = async (exerciseName: string) => {
    if (!exerciseName) return;
    const query = encodeURIComponent(`Tuto: ${exerciseName}`);
    const url = `https://www.youtube.com/results?search_query=${query}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erreur", `Impossible d'ouvrir le lien: ${url}`);
      }
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue en essayant d'ouvrir YouTube.");
      console.error("YouTube Linking error:", error);
    }
  };
  
  // Function to retry loading exercises
  const retryLoadExercises = async () => {
    if (token && currentSessionId) {
      setIsLoading(true);
      setError(null);
      try {
        const exercisesData = await fetchExercisesForOneSession(currentSessionId, token);
        if (Array.isArray(exercisesData)) {
          setExercises(exercisesData);
        } else {
          setError((exercisesData as {error: string}).error || "Erreur lors de la récupération des exercices.");
          setExercises([]);
        }
      } catch (e: any) {
        setError(e.message || "Une erreur inattendue est survenue.");
        setExercises([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert("Erreur", "Impossible de réessayer sans token ou ID de session valide.");
    }
  };


  // Loading state UI
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement des exercices...</Text>
      </View>
    );
  }

  // Error state UI or if no session ID
  if (error || !currentSessionId) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {error ? "Erreur" : "Session inconnue"}
          </Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centeredError}>
          <MaterialIcons name="error-outline" size={48} color={Colors.dark.primary}/>
          <Text style={styles.errorText}>
            {error || "ID de session non spécifié ou invalide."}
          </Text>
          {/* Allow retry only if there was an error but we have a session ID and token */}
          {(error && currentSessionId && token) && (
            <TouchableOpacity style={styles.retryButton} onPress={retryLoadExercises}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          )}
           {/* Always show back button if error or no session ID */}
          {!(error && currentSessionId && token) && (
             <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
                <Text style={styles.retryButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // No exercises found UI
  if (exercises.length === 0) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {currentSessionName}
          </Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centered}>
          <MaterialIcons name="fitness-center" size={48} color={Colors.dark.secondary}/>
          <Text style={styles.infoText}>Aucun exercice trouvé pour cette séance.</Text>
        </View>
      </View>
    );
  }

  // Main content: list of exercises
  return (
    <View style={styles.mainContainer}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {currentSessionName}
        </Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      {/* Scrollable list of exercises */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          {exercises.map((sessionEx, index) => {
            // Basic check for corrupted data, can be expanded
            if (!sessionEx || !sessionEx.name) {
              return (
                <View key={`error-${sessionEx?.id || index}`} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>Données d'exercice corrompues</Text>
                  <Text style={styles.exerciseDescription}>
                    Les détails de cet exercice sont indisponibles.
                  </Text>
                </View>
              );
            }

            return (
              <View key={sessionEx.id || `exercise-${index}`} style={styles.exerciseCard}>
                {/* Exercise Name */}
                <Text style={styles.exerciseName}>
                  {sessionEx.name || "Nom d'exercice non défini"}
                </Text>

                {/* Exercise Description */}
                {sessionEx.description && (
                  <Text style={styles.exerciseDescription}>{sessionEx.description}</Text>
                )}

                {/* Exercise Details (Sets, Reps, Rest) */}
                <View style={styles.exerciseDetailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Séries</Text>
                    <Text style={styles.detailValue}>{sessionEx.sets ?? "-"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Répétitions</Text>
                    <Text style={styles.detailValue}>{sessionEx.reps ?? "-"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Repos</Text>
                    <Text style={styles.detailValue}>
                      {sessionEx.rest_time !== null && sessionEx.rest_time !== undefined
                        ? `${sessionEx.rest_time}s`
                        : "-"}
                    </Text>
                  </View>
                </View>

                {/* Muscle Group */}
                <View style={styles.exerciseMetaRow}>
                  <Text style={styles.metaText}>
                    Groupe Musculaire: {sessionEx.muscle_group || "-"}
                  </Text>
                </View>

                {/* YouTube Tutorial Button */}
                <TouchableOpacity
                  style={styles.youtubeButton}
                  onPress={() => handleYouTubeSearch(sessionEx.name)}
                >
                  <FontAwesome5 name="youtube" size={18} color={Colors.dark.youtubeRed} />
                  <Text style={styles.youtubeButtonText}>Voir Tutoriel</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 40, // Consider SafeAreaView for more robust padding
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20, // Ensure space for the last item
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 15, // Consistent padding
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.card, // Softer border
  },
  headerButton: {
    padding: 8, // Adequate tap area
    marginRight: 10, // Space from title
  },
  headerButtonPlaceholder: { // To balance the title if back button is present
    width: 30, 
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.title,
    textAlign: "center",
    flex: 1, // Allow title to take available space
  },
  centered: { // For loading and no-exercise states
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  centeredError: { // For error state
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginHorizontal: 20, // Give some horizontal margin
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.dark.text,
  },
  errorText: {
    color: Colors.dark.primary, // Use primary color for error emphasis
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
    lineHeight: 22,
  },
  infoText: { // For "no exercises found"
    color: Colors.dark.secondary,
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 25, // More space above retry button
    backgroundColor: Colors.dark.tint,
    paddingVertical: 12, // Larger tap area
    paddingHorizontal: 30,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  retryButtonText: {
    color: Colors.dark.background, // Ensure contrast with tint
    fontSize: 16,
    fontWeight: "bold",
  },
  exerciseCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, // Slightly more shadow
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  exerciseName: {
    fontSize: 19, // Slightly larger name
    fontWeight: "bold",
    color: Colors.dark.tint, // Use tint color for exercise name
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
    justifyContent: "space-around", // Distribute items evenly
    marginBottom: 12, // Increased margin
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.secondary || Colors.dark.secondary, // Use a lighter secondary if available
  },
  detailItem: {
    alignItems: "center",
    flex: 1, // Ensure items take equal space
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.dark.secondary,
    marginBottom: 4, // Increased space
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  exerciseMetaRow: {
    marginTop: 10, // Increased margin
  },
  metaText: {
    fontSize: 13,
    color: Colors.dark.secondary,
    fontStyle: "italic",
  },
  // Styles for YouTube Button
  youtubeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.secondary || Colors.dark.card, // A distinct background
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15, // Space above the button
    borderWidth: 1,
    borderColor: Colors.dark.youtubeRed || Colors.dark.primary, // Use YouTube red or primary color for border
  },
  youtubeButtonText: {
    color: Colors.dark.youtubeRed || Colors.dark.primary, // Text color matching the icon/border
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "bold",
  },
});
