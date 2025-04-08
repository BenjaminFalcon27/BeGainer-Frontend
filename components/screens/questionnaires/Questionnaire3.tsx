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
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function QuestionnaireStep3() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  const [age, setAge] = useState("18");
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("70");

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

    const fetchUserId = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      setUserId(storedId);
    };

    const fetchName = async () => {
      const storedName = await AsyncStorage.getItem("name");
      setName(storedName);
    };

    const fetchGender = async () => {
      const storedGender = await AsyncStorage.getItem("gender");
      setGender(storedGender);
    };

    fetchUserId();
    fetchName();
    fetchGender();
  }, []);

  const handleNext = () => {
    const userData = {
      age,
      height,
      weight,
    };

    AsyncStorage.setItem("age", age);
    AsyncStorage.setItem("height", height);
    AsyncStorage.setItem("weight", weight);

    router.push("/questionnaire/questionnaire4");
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
        {/* Age */}
        <View style={styles.rowCenter}>
          <View style={styles.col}>
            <Text style={styles.label}>Quel âge as-tu?</Text>

            <Picker
              selectedValue={age}
              onValueChange={(itemValue) => setAge(itemValue)}
              style={{ height: 50, width: "100%" }}
            >
              {[...Array(100).keys()].map((i) => (
                <Picker.Item key={i} label={`${i + 1}`} value={`${i + 1}`} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Taille et Poids */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Taille (cm)</Text>

            <Picker
              selectedValue={height}
              onValueChange={(itemValue) => setHeight(itemValue)}
              style={{ height: 50, width: "100%" }}
            >
              {[...Array(250).keys()].map((i) => (
                <Picker.Item key={i} label={`${i + 1}`} value={`${i + 1}`} />
              ))}
            </Picker>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Poids (kg)</Text>

            <Picker
              selectedValue={weight}
              onValueChange={(itemValue) => setWeight(itemValue)}
              style={{ height: 50, width: "100%" }}
            >
              {[...Array(250).keys()].map((i) => (
                <Picker.Item key={i} label={`${i + 1}`} value={`${i + 1}`} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Bouton Suivant */}
      </Animated.View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Suivant</Text>
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
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  formContainer: {
    width: "100%",
    marginTop: 20,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 20,
    fontFamily: "BarlowLight",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "BarlowLight",
    color: Colors.dark.text,
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: 200,
    marginVertical: 40,
  },
  rowCenter: {
    flexDirection: "row",
    justifyContent: "center", // Changer "flex-end" à "center" pour centrer
    alignItems: "center",
    width: "100%",
    height: 200,
    marginVertical: 20,
  },
  col: {
    flex: 1,
    marginHorizontal: 5,
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
});
