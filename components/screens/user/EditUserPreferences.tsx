import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome5 } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  fetchUserPreferencesDetails,
  updateUserPreferences,
  UserPreferencesPayload,
  UserPreferencesDetail,
} from "@/components/services/apiService";

const BackIcon = () => (
  <MaterialIcons
    name="arrow-back-ios"
    size={22}
    color={Colors.dark.tint}
    style={{ marginLeft: -5 }}
  />
);

const DAYS_OF_WEEK = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "M", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 7 },
];

const MAX_SELECTED_DAYS = 5;

type EditablePreferences = Omit<
  UserPreferencesPayload,
  "name" | "age" | "milestone" | "user_id" | "gender"
> & {
  training_days?: number[];
};

type ValidationErrors = {
  [K in keyof EditablePreferences]?: string;
};

const initialEditablePreferencesState: EditablePreferences = {
  height_cm: 170,
  weight_kg: 70,
  training_days: [],
  goal: null,
  training_place: null,
  session_length: 60,
};

export default function EditPreferencesScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [fullInitialPreferences, setFullInitialPreferences] =
    useState<UserPreferencesDetail | null>(null);
  const [editablePreferences, setEditablePreferences] =
    useState<EditablePreferences>(initialEditablePreferencesState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const storedUserId = await AsyncStorage.getItem("userId");
      const storedToken = await AsyncStorage.getItem("token");

      if (storedUserId && storedToken) {
        setUserId(storedUserId);
        setToken(storedToken);
        try {
          const fetchedPrefs = await fetchUserPreferencesDetails(
            storedUserId,
            storedToken
          );
          if (fetchedPrefs.error) {
            setApiError(fetchedPrefs.error);
          } else {
            setFullInitialPreferences(fetchedPrefs);
            setEditablePreferences({
              height_cm:
                fetchedPrefs.height_cm ||
                initialEditablePreferencesState.height_cm,
              weight_kg:
                fetchedPrefs.weight_kg ||
                initialEditablePreferencesState.weight_kg,
              training_days: fetchedPrefs.training_days || [],
              goal: fetchedPrefs.goal,
              training_place:
                fetchedPrefs.training_place === "home_with_equipment"
                  ? "home_no_equipment"
                  : fetchedPrefs.training_place,
              session_length:
                fetchedPrefs.session_length ||
                initialEditablePreferencesState.session_length,
            });
          }
        } catch (e: any) {
          setApiError(e.message || "Erreur de chargement des préférences.");
        }
      } else {
        setApiError("Utilisateur non authentifié.");
        router.replace("/");
      }
      setIsLoading(false);
    };
    loadInitialData();
  }, [router]);

  const handleSliderChange = (
    field: "height_cm" | "weight_kg" | "session_length",
    value: number
  ) => {
    setEditablePreferences((prev) => ({ ...prev, [field]: Math.round(value) }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const createSelectHandler =
    (field: keyof Pick<EditablePreferences, "goal" | "training_place">) =>
    (value: string | null) => {
      setEditablePreferences((prev) => ({ ...prev, [field]: value }));
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const toggleDaySelection = (dayValue: number) => {
    setEditablePreferences((prev) => {
      const currentDays = prev.training_days || [];
      const isSelected = currentDays.includes(dayValue);

      if (isSelected) {
        const newSelectedDays = currentDays.filter((d) => d !== dayValue);
        return {
          ...prev,
          training_days: newSelectedDays.sort((a, b) => a - b),
        };
      } else {
        if (currentDays.length < MAX_SELECTED_DAYS) {
          const newSelectedDays = [...currentDays, dayValue];
          return {
            ...prev,
            training_days: newSelectedDays.sort((a, b) => a - b),
          };
        } else {
          Alert.alert(
            "Limite atteinte",
            `Vous ne pouvez sélectionner que ${MAX_SELECTED_DAYS} jours d'entraînement au maximum.`
          );
          return prev;
        }
      }
    });
    if (validationErrors.training_days) {
      setValidationErrors((prev) => ({ ...prev, training_days: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!editablePreferences.goal) errors.goal = "L'objectif est requis.";
    if (!editablePreferences.training_place)
      errors.training_place = "Le lieu d'entraînement est requis.";
    if (
      editablePreferences.height_cm === null ||
      editablePreferences.height_cm < 120 ||
      editablePreferences.height_cm > 230
    )
      errors.height_cm = "Taille invalide (120-230 cm).";
    if (
      editablePreferences.weight_kg === null ||
      editablePreferences.weight_kg < 30 ||
      editablePreferences.weight_kg > 200
    )
      errors.weight_kg = "Poids invalide (30-200 kg).";

    const currentTrainingDays = editablePreferences.training_days || [];
    if (currentTrainingDays.length === 0) {
      errors.training_days =
        "Veuillez sélectionner au moins un jour d'entraînement.";
    } else if (currentTrainingDays.length > MAX_SELECTED_DAYS) {
      errors.training_days = `Vous ne pouvez pas sélectionner plus de ${MAX_SELECTED_DAYS} jours.`;
    }

    if (
      editablePreferences.session_length === null ||
      editablePreferences.session_length < 30 ||
      editablePreferences.session_length > 120
    )
      errors.session_length = "Durée invalide (30-120 min).";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Erreurs de validation",
        "Veuillez corriger les champs en erreur."
      );
      return;
    }
    if (!userId || !token || !fullInitialPreferences) {
      setApiError(
        "Impossible de sauvegarder : les données initiales ou l'identification sont manquantes. Veuillez réessayer."
      );
      Alert.alert(
        "Erreur",
        "Données de session incomplètes. Veuillez revenir en arrière et réessayer."
      );
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const payloadForApi: UserPreferencesPayload = {
      user_id: userId,
      name: fullInitialPreferences.name,
      gender: fullInitialPreferences.gender,
      age: fullInitialPreferences.age,
      milestone: fullInitialPreferences.milestone,
      height_cm: editablePreferences.height_cm,
      weight_kg: editablePreferences.weight_kg,
      training_days: editablePreferences.training_days || [],
      goal: editablePreferences.goal,
      training_place: editablePreferences.training_place,
      session_length: editablePreferences.session_length,
    };

    try {
      const result = await updateUserPreferences(userId, payloadForApi, token);
      if (result.error) {
        setApiError(result.error);
        Alert.alert("Échec de la mise à jour", `${result.error}`);
      } else {
        router.back();
      }
    } catch (e: any) {
      setApiError(
        e.message ||
          "Une erreur est survenue lors de la communication avec le serveur."
      );
      Alert.alert(
        "Échec de la mise à jour",
        `${e.message || "Une erreur est survenue."}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Chargement des préférences...</Text>
      </View>
    );
  }

  const goalHandler = createSelectHandler("goal");
  const trainingPlaceHandler = createSelectHandler("training_place");

  const currentSelectedDays = editablePreferences.training_days || [];

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier Préférences</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      {apiError && <Text style={styles.globalErrorText}>{apiError}</Text>}

      <View style={styles.formContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Objectif Principal</Text>
          <View style={styles.goalButtonGroup}>
            <TouchableOpacity
              style={[
                styles.goalButton,
                editablePreferences.goal === "lose weight" &&
                  styles.selectedGoalButton,
              ]}
              onPress={() => goalHandler("lose weight")}
            >
              <FontAwesome5
                name="weight"
                size={18}
                color={
                  editablePreferences.goal === "lose weight"
                    ? Colors.dark.background
                    : Colors.dark.text
                }
              />
              <Text
                style={[
                  styles.goalButtonText,
                  editablePreferences.goal === "lose weight" &&
                    styles.selectedGoalButtonText,
                ]}
              >
                Perdre du gras
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.goalButton,
                editablePreferences.goal === "gain muscle" &&
                  styles.selectedGoalButton,
              ]}
              onPress={() => goalHandler("gain muscle")}
            >
              <FontAwesome5
                name="dumbbell"
                size={18}
                color={
                  editablePreferences.goal === "gain muscle"
                    ? Colors.dark.background
                    : Colors.dark.text
                }
              />
              <Text
                style={[
                  styles.goalButtonText,
                  editablePreferences.goal === "gain muscle" &&
                    styles.selectedGoalButtonText,
                ]}
              >
                Me muscler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.goalButton,
                editablePreferences.goal === "improve health" &&
                  styles.selectedGoalButton,
              ]}
              onPress={() => goalHandler("improve health")}
            >
              <FontAwesome5
                name="heartbeat"
                size={18}
                color={
                  editablePreferences.goal === "improve health"
                    ? Colors.dark.background
                    : Colors.dark.text
                }
              />
              <Text
                style={[
                  styles.goalButtonText,
                  editablePreferences.goal === "improve health" &&
                    styles.selectedGoalButtonText,
                ]}
              >
                Santé
              </Text>
            </TouchableOpacity>
          </View>
          {validationErrors.goal && (
            <Text style={styles.errorText}>{validationErrors.goal}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Taille ({editablePreferences.height_cm || 0} cm)
          </Text>
          <Slider
            style={styles.slider}
            value={
              editablePreferences.height_cm ||
              initialEditablePreferencesState.height_cm!
            }
            minimumValue={120}
            maximumValue={230}
            step={1}
            onValueChange={(val) => handleSliderChange("height_cm", val)}
            minimumTrackTintColor={Colors.dark.tint}
            maximumTrackTintColor={Colors.dark.secondary}
            thumbTintColor={Colors.dark.tint}
          />
          {validationErrors.height_cm && (
            <Text style={styles.errorText}>{validationErrors.height_cm}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Poids ({editablePreferences.weight_kg || 0} kg)
          </Text>
          <Slider
            style={styles.slider}
            value={
              editablePreferences.weight_kg ||
              initialEditablePreferencesState.weight_kg!
            }
            minimumValue={30}
            maximumValue={200}
            step={1}
            onValueChange={(val) => handleSliderChange("weight_kg", val)}
            minimumTrackTintColor={Colors.dark.tint}
            maximumTrackTintColor={Colors.dark.secondary}
            thumbTintColor={Colors.dark.tint}
          />
          {validationErrors.weight_kg && (
            <Text style={styles.errorText}>{validationErrors.weight_kg}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Jours d'entraînement
            {currentSelectedDays.length >= MAX_SELECTED_DAYS && (
              <Text style={styles.limitReachedText}>
                {" "}
                (Max {MAX_SELECTED_DAYS} atteints)
              </Text>
            )}
          </Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = currentSelectedDays.includes(day.value);
              const isDisabled =
                !isSelected && currentSelectedDays.length >= MAX_SELECTED_DAYS;

              return (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    isSelected && styles.selectedDayButton,
                    isDisabled && styles.disabledDayButton,
                  ]}
                  onPress={() => toggleDaySelection(day.value)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.selectedDayButtonText,
                      isDisabled && styles.disabledDayButtonText,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {validationErrors.training_days && (
            <Text style={styles.errorText}>
              {validationErrors.training_days}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Lieu d'entraînement</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                editablePreferences.training_place === "gym" &&
                  styles.selectedChoiceButton,
              ]}
              onPress={() => trainingPlaceHandler("gym")}
            >
              <Text
                style={[
                  styles.choiceButtonText,
                  editablePreferences.training_place === "gym" &&
                    styles.selectedChoiceButtonText,
                ]}
              >
                Salle
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                editablePreferences.training_place === "home_no_equipment" &&
                  styles.selectedChoiceButton,
              ]}
              onPress={() => trainingPlaceHandler("home_no_equipment")}
            >
              <Text
                style={[
                  styles.choiceButtonText,
                  editablePreferences.training_place === "home_no_equipment" &&
                    styles.selectedChoiceButtonText,
                ]}
              >
                Maison
              </Text>
            </TouchableOpacity>
          </View>
          {validationErrors.training_place && (
            <Text style={styles.errorText}>
              {validationErrors.training_place}
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Durée de session ({editablePreferences.session_length || 0} min)
          </Text>
          <Slider
            style={styles.slider}
            value={
              editablePreferences.session_length ||
              initialEditablePreferencesState.session_length!
            }
            minimumValue={30}
            maximumValue={120}
            step={30}
            onValueChange={(val) => handleSliderChange("session_length", val)}
            minimumTrackTintColor={Colors.dark.tint}
            maximumTrackTintColor={Colors.dark.secondary}
            thumbTintColor={Colors.dark.tint}
          />
          {validationErrors.session_length && (
            <Text style={styles.errorText}>
              {validationErrors.session_length}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.dark.text} />
        ) : (
          <Text style={styles.buttonText}>Sauvegarder</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  formContent: {
    flex: 1,
    justifyContent: "space-around",
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
    padding: 5,
  },
  headerButtonPlaceholder: {
    width: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.title,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: Colors.dark.text,
  },
  globalErrorText: {
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 13,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 8,
    fontWeight: "600",
  },
  limitReachedText: {
    fontSize: 12,
    color: Colors.dark.secondary,
    fontWeight: "normal",
  },
  errorText: {
    color: "#FF8E8E",
    fontSize: 12,
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  choiceButton: {
    backgroundColor: Colors.dark.card,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  selectedChoiceButton: {
    backgroundColor: Colors.dark.tint,
    borderColor: Colors.dark.tint,
  },
  choiceButtonText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: "600",
  },
  selectedChoiceButtonText: {
    color: Colors.dark.background,
  },
  goalButtonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  goalButton: {
    backgroundColor: Colors.dark.card,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 65,
  },
  selectedGoalButton: {
    backgroundColor: Colors.dark.tint,
    borderColor: Colors.dark.tint,
  },
  goalButtonText: {
    color: Colors.dark.text,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  selectedGoalButtonText: {
    color: Colors.dark.background,
  },
  slider: {
    width: "100%",
    height: 30,
    marginVertical: 0,
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 36,
    marginHorizontal: 2,
  },
  selectedDayButton: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  disabledDayButton: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.secondary,
    opacity: 0.5,
  },
  dayButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  selectedDayButtonText: {
    color: Colors.dark.background,
    fontWeight: "bold",
  },
  disabledDayButtonText: {
    color: Colors.dark.text,
    opacity: 0.7,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 5,
  },
  buttonDisabled: {
    backgroundColor: Colors.dark.secondary,
  },
  buttonText: {
    color: Colors.dark.background,
    fontSize: 15,
    fontWeight: "bold",
  },
});
