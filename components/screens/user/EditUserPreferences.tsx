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
} from "@/app/services/apiService";

const BackIcon = () => (
    <MaterialIcons
        name="arrow-back-ios"
        size={22}
        color={Colors.dark.tint}
        style={{ marginLeft: -5 }}
    />
);

type EditablePreferences = Omit<
    UserPreferencesPayload,
    "name" | "age" | "milestone" | "user_id" | "gender"
>;

type ValidationErrors = {
    [K in keyof EditablePreferences]?: string;
};

const initialEditablePreferencesState: EditablePreferences = {
    height_cm: 170,
    weight_kg: 70,
    training_freq: 3,
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

    const [preferences, setPreferences] = useState<EditablePreferences>(
        initialEditablePreferencesState
    );
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
                        setPreferences({
                            height_cm:
                                fetchedPrefs.height_cm ||
                                initialEditablePreferencesState.height_cm,
                            weight_kg:
                                fetchedPrefs.weight_kg ||
                                initialEditablePreferencesState.weight_kg,
                            training_freq:
                                fetchedPrefs.training_freq ||
                                initialEditablePreferencesState.training_freq,
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
    }, []);

    const handleSliderChange = (
        field: "height_cm" | "weight_kg" | "session_length",
        value: number
    ) => {
        setPreferences((prev) => ({ ...prev, [field]: Math.round(value) }));
        if (validationErrors[field]) {
            setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const createSelectHandler =
        (field: keyof EditablePreferences) => (value: string | number | null) => {
            setPreferences((prev) => ({ ...prev, [field]: value }));
            if (validationErrors[field]) {
                setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
            }
        };

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};
        if (!preferences.goal) errors.goal = "L'objectif est requis.";
        if (!preferences.training_place)
            errors.training_place = "Le lieu d'entraînement est requis.";
        if (
            preferences.height_cm === null ||
            preferences.height_cm < 120 ||
            preferences.height_cm > 230
        )
            errors.height_cm = "Taille invalide.";
        if (
            preferences.weight_kg === null ||
            preferences.weight_kg < 30 ||
            preferences.weight_kg > 200
        )
            errors.weight_kg = "Poids invalide.";
        if (
            preferences.training_freq === null ||
            preferences.training_freq < 1 ||
            preferences.training_freq > 7
        )
            errors.training_freq = "Fréquence invalide.";
        if (
            preferences.session_length === null ||
            preferences.session_length < 30 ||
            preferences.session_length > 120
        )
            errors.session_length = "Durée invalide.";
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
        if (!userId || !token) {
            setApiError("Information utilisateur manquante.");
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        const payload: Partial<UserPreferencesPayload> = { ...preferences };

        try {
            const result = await updateUserPreferences(userId, payload, token);
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
    const trainingFreqHandler = createSelectHandler("training_freq");

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
                                preferences.goal === "lose weight" && styles.selectedGoalButton,
                            ]}
                            onPress={() => goalHandler("lose weight")}
                        >
                            <FontAwesome5
                                name="weight"
                                size={18}
                                color={
                                    preferences.goal === "lose weight"
                                        ? Colors.dark.background
                                        : Colors.dark.text
                                }
                            />
                            <Text
                                style={[
                                    styles.goalButtonText,
                                    preferences.goal === "lose weight" &&
                                        styles.selectedGoalButtonText,
                                ]}
                            >
                                Perdre du gras
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.goalButton,
                                preferences.goal === "gain muscle" && styles.selectedGoalButton,
                            ]}
                            onPress={() => goalHandler("gain muscle")}
                        >
                            <FontAwesome5
                                name="dumbbell"
                                size={18}
                                color={
                                    preferences.goal === "gain muscle"
                                        ? Colors.dark.background
                                        : Colors.dark.text
                                }
                            />
                            <Text
                                style={[
                                    styles.goalButtonText,
                                    preferences.goal === "gain muscle" &&
                                        styles.selectedGoalButtonText,
                                ]}
                            >
                                Me muscler
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.goalButton,
                                preferences.goal === "improve health" &&
                                    styles.selectedGoalButton,
                            ]}
                            onPress={() => goalHandler("improve health")}
                        >
                            <FontAwesome5
                                name="heartbeat"
                                size={18}
                                color={
                                    preferences.goal === "improve health"
                                        ? Colors.dark.background
                                        : Colors.dark.text
                                }
                            />
                            <Text
                                style={[
                                    styles.goalButtonText,
                                    preferences.goal === "improve health" &&
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
                    <Text style={styles.label}>Taille ({preferences.height_cm} cm)</Text>
                    <Slider
                        style={styles.slider}
                        value={preferences.height_cm || 170}
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
                    <Text style={styles.label}>Poids ({preferences.weight_kg} kg)</Text>
                    <Slider
                        style={styles.slider}
                        value={preferences.weight_kg || 70}
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
                        Fréquence d'entraînement (séances/semaine)
                    </Text>
                    <View style={styles.freqButtonGroup}>
                        {[1, 2, 3, 4, 5, 6, 7].map((freq) => (
                            <TouchableOpacity
                                key={freq}
                                style={[
                                    styles.freqButton,
                                    preferences.training_freq === freq &&
                                        styles.selectedFreqButton,
                                ]}
                                onPress={() => trainingFreqHandler(freq)}
                            >
                                <Text
                                    style={[
                                        styles.freqButtonText,
                                        preferences.training_freq === freq &&
                                            styles.selectedFreqButtonText,
                                    ]}
                                >
                                    {freq}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {validationErrors.training_freq && (
                        <Text style={styles.errorText}>
                            {validationErrors.training_freq}
                        </Text>
                    )}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Lieu d'entraînement</Text>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                preferences.training_place === "gym" &&
                                    styles.selectedChoiceButton,
                            ]}
                            onPress={() => trainingPlaceHandler("gym")}
                        >
                            <Text
                                style={[
                                    styles.choiceButtonText,
                                    preferences.training_place === "gym" &&
                                        styles.selectedChoiceButtonText,
                                ]}
                            >
                                Salle
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                preferences.training_place === "home_no_equipment" &&
                                    styles.selectedChoiceButton,
                            ]}
                            onPress={() => trainingPlaceHandler("home_no_equipment")}
                        >
                            <Text
                                style={[
                                    styles.choiceButtonText,
                                    preferences.training_place === "home_no_equipment" &&
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
                        Durée de session ({preferences.session_length || 30} min)
                    </Text>
                    <Slider
                        style={styles.slider}
                        value={preferences.session_length || 60}
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
    headerIcon: {
        fontSize: 22,
        color: Colors.dark.tint,
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
        marginBottom: 6,
        fontWeight: "600",
    },
    errorText: {
        color: "#FF8E8E",
        fontSize: 12,
        marginTop: 3,
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
    freqButtonGroup: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        flexWrap: "nowrap",
        marginVertical: 5,
    },
    freqButton: {
        backgroundColor: Colors.dark.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.dark.secondary,
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 2,
    },
    selectedFreqButton: {
        backgroundColor: Colors.dark.tint,
        borderColor: Colors.dark.tint,
    },
    freqButtonText: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: "600",
    },
    selectedFreqButtonText: {
        color: Colors.dark.background,
    },
    button: {
        backgroundColor: Colors.dark.tint,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 15,
    },
    buttonDisabled: {
        backgroundColor: Colors.dark.secondary,
    },
    buttonText: {
        color: Colors.dark.text,
        fontSize: 15,
        fontWeight: "bold",
    },
});
