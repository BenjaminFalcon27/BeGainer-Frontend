import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  submitUserPreferences,
  UserPreferencesPayload,
} from "@/components/services/apiService";

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

export default function QuestionnaireScreen() {
  const router = useRouter();

  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [translateYAnim] = React.useState(new Animated.Value(50));
  const [duration, setDuration] = React.useState(60);
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
    setSelectedDays((prevSelectedDays) => {
      const isSelected = prevSelectedDays.includes(dayValue);
      if (isSelected) {
        return prevSelectedDays.filter((d) => d !== dayValue);
      } else {
        if (prevSelectedDays.length < MAX_SELECTED_DAYS) {
          return [...prevSelectedDays, dayValue];
        } else {
          Alert.alert(
            "Limite atteinte",
            `Vous ne pouvez sélectionner que ${MAX_SELECTED_DAYS} jours d'entraînement au maximum.`
          );
          return prevSelectedDays;
        }
      }
    });
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
        training_days: selectedDays.sort((a, b) => a - b),
        goal: goal,
        training_place: training_place,
        session_length: duration,
        milestone: "default",
      };

      await submitUserPreferences(params);
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
            maximumTrackTintColor={Colors.dark.text}
            thumbTintColor={Colors.dark.primary}
          />
          <Text style={styles.valueText}>{duration} min</Text>
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.label}>
            Quels jours souhaitez-vous vous entraîner ?
            {selectedDays.length >= MAX_SELECTED_DAYS && (
              <Text style={styles.limitReachedText}>
                {"\n"}(Maximum {MAX_SELECTED_DAYS} jours atteints)
              </Text>
            )}
          </Text>
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDays.includes(day.value);
              const isDisabled =
                !isSelected && selectedDays.length >= MAX_SELECTED_DAYS;

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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  formContainer: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  questionBlock: {
    marginBottom: 40,
    width: "100%",
  },
  label: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "BarlowLight",
    textAlign: "center",
    marginBottom: 20,
  },
  limitReachedText: {
    fontFamily: "BarlowLight",
    color: Colors.dark.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },
  valueText: {
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    height: 40,
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
    fontSize: 16,
    fontFamily: "BarlowLight",
  },
  selectedDayButtonText: {
    color: Colors.dark.background,
    fontWeight: "bold",
  },
  disabledDayButtonText: {
    color: Colors.dark.text,
    opacity: 0.7,
  },
  nextButton: {
    backgroundColor: Colors.dark.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  nextButtonText: {
    fontFamily: "BarlowLight",
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});
