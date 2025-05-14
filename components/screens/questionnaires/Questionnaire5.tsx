import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { submitUserPreferences } from "@/app/services/apiService";

export default function QuestionnaireScreen() {
  const router = useRouter();

  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [translateYAnim] = React.useState(new Animated.Value(50));
  const [duration, setDuration] = React.useState(60);
  const [sessionsPerWeek, setSessionsPerWeek] = React.useState("3");

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

  const handleSubmit = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const name = await AsyncStorage.getItem("name");
      const gender = await AsyncStorage.getItem("gender");
      const age = await AsyncStorage.getItem("age");
      const height_cm = await AsyncStorage.getItem("height");
      const weight_kg = await AsyncStorage.getItem("weight");
      const goal = await AsyncStorage.getItem("goal");
      const training_place = await AsyncStorage.getItem("trainingPlace");

      if (!userId) {
        Alert.alert(
          "Erreur",
          "Impossible de soumettre les préférences sans identifiant utilisateur."
        );
        return;
      }

      const params = {
        user_id: userId,
        name: name,
        gender: gender,
        age: parseInt(age || "0", 10),
        height_cm: parseInt(height_cm || "0", 10),
        weight_kg: parseInt(weight_kg || "0", 10),
        training_freq: parseInt(sessionsPerWeek, 10),
        goal: goal,
        training_place: training_place,
        session_length: duration,
        milestone: "default",
      };

      await submitUserPreferences(params);
      router.push("/user/profile");
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
            <Text style={styles.durationText}>{duration} min</Text>
          </View>
        </View>

        <View style={styles.rowCenter}>
          <View style={styles.col}>
            <Text style={styles.label}>Combien de séances par semaine ?</Text>
            <View
              style={{
                borderWidth: 1,
                backgroundColor: Colors.dark.card,
                borderRadius: 8,
                borderColor: Colors.dark.card,
              }}
            >
              <Picker
                mode="dropdown"
                selectedValue={sessionsPerWeek}
                onValueChange={(itemValue) => setSessionsPerWeek(itemValue)}
                dropdownIconColor={Colors.dark.text}
                style={{ height: 50, width: "100%", color: Colors.dark.text }}
              >
                {[...Array(7).keys()].map((i) => (
                  <Picker.Item key={i} label={`${i + 1}`} value={`${i + 1}`} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Animated.View>
      <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
        <Text style={styles.nextButtonText}>Créer mon compte</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    justifyContent: "center",
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
  durationText: {
    fontFamily: "BarlowLight",
    color: Colors.dark.text,
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
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
