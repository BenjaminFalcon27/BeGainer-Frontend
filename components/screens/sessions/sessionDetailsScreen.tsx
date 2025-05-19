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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import {
  SessionExercise,
  fetchExercisesForOneSession,
} from "@/components/services/apiService";

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

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>(
    "Détail de la séance"
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [token, setToken] = useState<string | null>(null);

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const loadTokenAndExercises = async () => {
      if (!currentSessionId) {
        if (
          isLoading &&
          params &&
          Object.keys(params).length > 0 &&
          !params.id
        ) {
        } else if (isLoading && (!params || Object.keys(params).length === 0)) {
          return;
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);

      if (storedToken) {
        try {
          const exercisesData = await fetchExercisesForOneSession(
            currentSessionId,
            storedToken
          );
          if (Array.isArray(exercisesData)) {
            setExercises(exercisesData);
          } else {
            setError(
              exercisesData.error ||
                "Erreur lors de la récupération des exercices."
            );
            setExercises([]);
          }
        } catch (e: any) {
          setError(e.message || "Une erreur inattendue est survenue.");
          setExercises([]);
        }
      } else {
        setError("Token d'authentification manquant.");
      }
      setIsLoading(false);
    };

    if (currentSessionId) {
      loadTokenAndExercises();
    } else {
      if (params && Object.keys(params).length > 0 && !params.id) {
        setIsLoading(false);
      } else if (!params || Object.keys(params).length === 0) {
      } else {
        setError("ID de session est devenu invalide.");
        setIsLoading(false);
      }
    }
  }, [currentSessionId]);

  const retryLoadExercises = async () => {
    if (token && currentSessionId) {
      setIsLoading(true);
      setError(null);
      try {
        const exercisesData = await fetchExercisesForOneSession(
          currentSessionId,
          token
        );
        if (Array.isArray(exercisesData)) {
          setExercises(exercisesData);
        } else {
          setError(
            exercisesData.error ||
              "Erreur lors de la récupération des exercices."
          );
          setExercises([]);
        }
      } catch (e: any) {
        setError(e.message || "Une erreur inattendue est survenue.");
        setExercises([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert(
        "Erreur",
        "Impossible de réessayer sans token ou ID de session valide."
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error || !currentSessionId) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {error ? "Erreur" : "Session inconnue"}
          </Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centeredError}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={Colors.dark.primary}
          />
          <Text style={styles.errorText}>
            {error || "ID de session non spécifié ou invalide."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={
              error && currentSessionId
                ? retryLoadExercises
                : () => router.back()
            }
          >
            <Text style={styles.retryButtonText}>
              {error && currentSessionId ? "Réessayer" : "Retour"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {currentSessionName}
          </Text>
          <View style={styles.headerButtonPlaceholder} />
        </View>
        <View style={styles.centered}>
          <MaterialIcons
            name="fitness-center"
            size={48}
            color={Colors.dark.secondary}
          />
          <Text style={styles.infoText}>
            Aucun exercice trouvé pour cette séance.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {currentSessionName}
        </Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
          {exercises.map((sessionEx, index) => {
            if (!sessionEx || !sessionEx.name) {
              return (
                <View
                  key={`error-${sessionEx?.id || index}`}
                  style={styles.exerciseCard}
                >
                  <Text style={styles.exerciseName}>
                    Données d'exercice corrompues
                  </Text>
                  <Text style={styles.exerciseDescription}>
                    Les détails de cet exercice sont indisponibles. Veuillez
                    vérifier les logs pour plus d'informations sur la structure
                    des données reçues.
                  </Text>
                </View>
              );
            }

            return (
              <View
                key={sessionEx.id || `exercise-${index}`}
                style={styles.exerciseCard}
              >
                <Text style={styles.exerciseName}>
                  {sessionEx.name || "Nom d'exercice non défini"}
                </Text>
                {sessionEx.description && (
                  <Text style={styles.exerciseDescription}>
                    {sessionEx.description}
                  </Text>
                )}
                <View style={styles.exerciseDetailsRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Séries</Text>
                    <Text style={styles.detailValue}>
                      {sessionEx.sets ?? "-"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Répétitions</Text>
                    <Text style={styles.detailValue}>
                      {sessionEx.reps ?? "-"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Repos</Text>
                    <Text style={styles.detailValue}>
                      {sessionEx.rest_time !== null &&
                      sessionEx.rest_time !== undefined
                        ? `${sessionEx.rest_time}s`
                        : "-"}
                    </Text>
                  </View>
                </View>
                <View style={styles.exerciseMetaRow}>
                  <Text style={styles.metaText}>
                    Groupe Musculaire: {sessionEx.muscle_group || "-"}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
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
  },
  headerButton: {
    padding: 8,
    marginRight: 10,
  },
  headerButtonPlaceholder: {
    width: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.title,
    textAlign: "center",
    flex: 1,
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
    marginTop: 20,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  exerciseCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  exerciseName: {
    fontSize: 18,
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
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.secondary,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.dark.secondary,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  exerciseMetaRow: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 13,
    color: Colors.dark.secondary,
    fontStyle: "italic",
  },
});
