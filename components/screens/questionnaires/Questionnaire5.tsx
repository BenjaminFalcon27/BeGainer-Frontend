import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  // ScrollView, // Si le contenu devient trop long, envisager de le réactiver
} from "react-native";
// Picker n'est plus utilisé pour les jours
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  submitUserPreferences,
  UserPreferencesPayload,
} from "@/components/services/apiService"; // UserPreferencesPayload importé

// Définition des jours de la semaine
const DAYS_OF_WEEK = [
  { label: "L", value: 1 }, // Lundi
  { label: "M", value: 2 }, // Mardi
  { label: "M", value: 3 }, // Mercredi
  { label: "J", value: 4 }, // Jeudi
  { label: "V", value: 5 }, // Vendredi
  { label: "S", value: 6 }, // Samedi
  { label: "D", value: 7 }, // Dimanche
];

export default function QuestionnaireScreen() {
  const router = useRouter();

  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [translateYAnim] = React.useState(new Animated.Value(50));
  const [duration, setDuration] = React.useState(60);
  // sessionsPerWeek est remplacé par selectedDays
  const [selectedDays, setSelectedDays] = React.useState<number[]>([]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  const toggleDaySelection = (dayValue: number) => {
    setSelectedDays((prevSelectedDays) =>
      prevSelectedDays.includes(dayValue)
        ? prevSelectedDays.filter((d) => d !== dayValue)
        : [...prevSelectedDays, dayValue]
    );
  };

  const handleSubmit = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const name = await AsyncStorage.getItem("name");
      const gender = await AsyncStorage.getItem("gender");
      const ageString = await AsyncStorage.getItem("age");
      const heightString = await AsyncStorage.getItem("height");
      const weightString = await AsyncStorage.getItem("weight");
      const goal = await AsyncStorage.getItem("goal");
      const training_place = await AsyncStorage.getItem("trainingPlace");

      if (!userId) {
        Alert.alert(
          "Erreur",
          "Impossible de soumettre les préférences sans identifiant utilisateur."
        );
        return;
      }
      if (selectedDays.length === 0) {
        Alert.alert(
          "Sélection requise",
          "Veuillez sélectionner au moins un jour d'entraînement."
        );
        return;
      }

      // S'assurer que les valeurs numériques sont bien parsées ou ont des valeurs par défaut raisonnables
      const age = ageString ? parseInt(ageString, 10) : null;
      const height_cm = heightString ? parseInt(heightString, 10) : null;
      const weight_kg = weightString ? parseInt(weightString, 10) : null;

      const params: UserPreferencesPayload = {
        user_id: userId,
        name: name,
        gender: gender,
        age: age,
        height_cm: height_cm,
        weight_kg: weight_kg,
        training_days: selectedDays.sort((a, b) => a - b), // Envoi des jours sélectionnés, triés
        goal: goal,
        training_place: training_place,
        session_length: duration,
        milestone: "default", // Conserver ou rendre configurable si besoin
      };

      console.log("Submitting preferences:", params); // Log pour débogage

      await submitUserPreferences(params);
      // Potentiellement stocker les jours sélectionnés dans AsyncStorage si besoin de les réutiliser
      // await AsyncStorage.setItem('trainingDays', JSON.stringify(selectedDays));
      router.push("/dashboard/dashboard");
    } catch (error: any) {
      Alert.alert(
        "Erreur",
        error.message ||
          "Une erreur est survenue lors de l'enregistrement des préférences."
      );
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={32} color={Colors.dark.text} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.questionBlock}>
          <Text style={styles.label}>Durée de mes séances (en minutes)</Text>
          <Slider
            style={styles.slider}
            minimumValue={30}
            maximumValue={120}
            step={30}
            value={duration}
            onValueChange={setDuration}
            minimumTrackTintColor={Colors.dark.primary}
            maximumTrackTintColor={Colors.dark.text} // Ou Colors.dark.secondary pour moins de contraste
            thumbTintColor={Colors.dark.primary}
          />
          <Text style={styles.valueText}>{duration} min</Text>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.label}>
            Quels jours souhaitez-vous vous entraîner ?
          </Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.value) && styles.selectedDayButton,
                ]}
                onPress={() => toggleDaySelection(day.value)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.value) &&
                      styles.selectedDayButtonText,
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
      <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
        <Text style={styles.nextButtonText}>Valider mes choix</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "space-between", // Pour pousser le bouton "next" en bas
    paddingHorizontal: 20,
    paddingTop: 60, // Espace pour le bouton retour
    paddingBottom: 40, // Espace pour le bouton suivant
  },
  backButton: {
    position: "absolute",
    top: 50, // Ajusté pour le paddingTop du container
    left: 20,
    zIndex: 1,
  },
  formContainer: {
    width: "100%",
    flex: 1, // Permet au contenu de prendre l'espace disponible
    justifyContent: "center", // Centrer les questions verticalement
  },
  questionBlock: {
    marginBottom: 40, // Espace entre les questions
    width: "100%",
  },
  label: {
    color: Colors.dark.text,
    fontSize: 20, // Maintenu
    fontFamily: "BarlowLight", // Assurez-vous que cette police est chargée
    textAlign: "center",
    marginBottom: 20, // Espace entre le label et le contrôle
  },
  valueText: {
    // Style pour afficher la valeur du slider
    fontFamily: "BarlowLight",
    color: Colors.dark.text,
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20, // Boutons plus ronds
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40, // Assurer une taille minimale
    height: 40,
  },
  selectedDayButton: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  dayButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontFamily: "BarlowLight",
  },
  selectedDayButtonText: {
    color: Colors.dark.background, // Ou une couleur contrastante sur le fond primary
    fontWeight: "bold",
  },
  nextButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 15, // Un peu plus grand
    paddingHorizontal: 20,
    borderRadius: 8, // Bords plus arrondis
    alignItems: "center",
    width: "100%",
    // position: "absolute", // Retiré pour un flux naturel
    // bottom: 40,
    // left: 20,
    // right: 20,
  },
  nextButtonText: {
    fontFamily: "BarlowLight",
    color: "#FFF", // Maintenu
    fontWeight: "bold",
    fontSize: 16, // Légèrement augmenté
    textAlign: "center",
  },
  // Styles rowCenter et col supprimés car la structure est simplifiée
});
