import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import LottieView from "lottie-react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

export default function QuestionnaireStep2() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const [selectedSex, setSelectedSex] = useState<"male" | "female" | null>(
    null
  );

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
    fetchUserId();
    fetchName();
  }, []);

  const handleSelect = (sex: "male" | "female") => {
    AsyncStorage.setItem("gender", sex);

    router.push("/questionnaire/questionnaire3");
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
        <Text style={styles.label}>Quel est ton sexe ?</Text>

        <View style={styles.selectionContainer}>
          <TouchableOpacity
            style={[
              styles.option,
              selectedSex === "male" && styles.selectedOption,
            ]}
            onPress={() => handleSelect("male")}
          >
            <LottieView
              source={require("../../../assets/animations/male.json")}
              autoPlay
              loop={false}
              style={styles.animation}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              selectedSex === "female" && styles.selectedOption,
            ]}
            onPress={() => handleSelect("female")}
          >
            <LottieView
              source={require("../../../assets/animations/female.json")}
              autoPlay
              loop={false}
              style={styles.animation}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 40,
  },
  label: {
    fontFamily: "BarlowLight",
    color: Colors.dark.text,
    fontSize: 22,
    marginBottom: 20,
    textAlign: "center",
  },
  selectionContainer: {
    flexDirection: width < 500 ? "column" : "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 20,
  },
  option: {
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedOption: {
    borderColor: Colors.dark.primary,
  },
  animation: {
    width: 150,
    height: 150,
  },
  optionLabel: {
    color: Colors.dark.text,
    fontSize: 18,
    marginTop: 10,
  },
});
