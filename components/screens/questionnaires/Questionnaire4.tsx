import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

export default function QuestionnaireStep4() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const [goal, setGoal] = useState("gain muscle");
  const [trainingPlace, setTrainingPlace] = useState("gym");

  useEffect(() => {
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
  }, []);

  const handleNext = () => {
    AsyncStorage.setItem("goal", goal);
    AsyncStorage.setItem("trainingPlace", trainingPlace);
    router.push("/questionnaire/questionnaire5");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={36} color={Colors.dark.text} />
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
        <View style={styles.rowCenter}>
          <View style={styles.col}>
            <Text style={styles.label}>Quel est votre objectif ?</Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.goalButton,
                  goal === "lose weight" && styles.selectedGoalButton,
                ]}
                onPress={() => setGoal("lose weight")}
              >
                <FontAwesome5 name="weight" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    goal === "lose weight" && styles.selectedGoalButtonText,
                  ]}
                >
                  Perdre du gras
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalButton,
                  goal === "gain muscle" && styles.selectedGoalButton,
                ]}
                onPress={() => setGoal("gain muscle")}
              >
                <FontAwesome5 name="dumbbell" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    goal === "gain muscle" && styles.selectedGoalButtonText,
                  ]}
                >
                  Me muscler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalButton,
                  goal === "improve health" && styles.selectedGoalButton,
                ]}
                onPress={() => setGoal("improve health")}
              >
                <FontAwesome5 name="heartbeat" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    goal === "improve health" && styles.selectedGoalButtonText,
                  ]}
                >
                  Santé
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.rowCenter}>
          <View style={styles.col}>
            <Text style={styles.label}>Je veux m'entrainer</Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.goalButton,
                  trainingPlace === "home_no_equipment" && styles.selectedGoalButton,
                ]}
                onPress={() => setTrainingPlace("home_no_equipment")}
              >
                <FontAwesome5 name="home" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    trainingPlace === "home_no_equipment" && styles.selectedGoalButtonText,
                  ]}
                >
                  A la maison
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalButton,
                  trainingPlace === "home_with_equipment" && styles.selectedGoalButton,
                ]}
                onPress={() => setTrainingPlace("home_with_equipment")}
              >
                <FontAwesome5 name="home" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    trainingPlace === "home_with_equipment" && styles.selectedGoalButtonText,
                  ]}
                >
                  A la maison avec matériel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalButton,
                  trainingPlace === "gym" && styles.selectedGoalButton,
                ]}
                onPress={() => setTrainingPlace("gym")}
              >
                <FontAwesome5 name="dumbbell" size={24} color="#FFF" />
                <Text
                  style={[
                    styles.goalButtonText,
                    trainingPlace === "gym" && styles.selectedGoalButtonText,
                  ]}
                >
                  A la salle de sport
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Valider</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  formContainer: {
    width: "100%",
    marginTop: 60,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "BarlowLight",
    textAlign: "center",
  },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center", // Centrer les éléments
    alignItems: "center",
    width: "100%",
    height: 100,
    marginVertical: 60,
  },
  col: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  nextButtonText: {
    fontFamily: "BarlowLight",
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
    marginVertical: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    marginTop: 30,
  },
  goalButton: {
    flexDirection: "column",
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.dark.secondary,
    borderRadius: 10,
    width: 90,
    height: 100,
    justifyContent: "center",
    marginHorizontal: 5,
  },
  selectedGoalButton: {
    backgroundColor: Colors.dark.primary,
  },
  goalButtonText: {
    fontFamily: "BarlowLight",
    color: "#fff",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  selectedGoalButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});
