import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import LottieView from "lottie-react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

export default function QuestionnaireStep1() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserId = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      setUserId(storedId);
    };

    fetchUserId();
  }, []);

  const router = useRouter();
  const animation = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateName = (name: string) => {
    if (name.length < 3) {
      setError("Le pseudo doit comporter au moins 3 caractères.");
      return false;
    } else if (name.length > 15) {
      setError("Le pseudo ne peut pas dépasser 15 caractères.");
      return false;
    } else if (/[^a-zA-Z0-9\s-]/.test(name)) {
      setError(
        "Le pseudo ne peut contenir que des lettres, des chiffres, des espaces et des tirets."
      );
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (validateName(name)) {
      AsyncStorage.setItem("name", name);

      router.push("/questionnaire/questionnaire2");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      animation.current?.reset();
      animation.current?.play(0, 60);
    }, 100);

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

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topHalf}>
        <LottieView
          ref={animation}
          source={require("../../../assets/animations/person.json")}
          autoPlay={false}
          loop={false}
          style={styles.animation}
        />
      </View>

      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <Text style={styles.label}>Quel est ton nom ?</Text>
        <TextInput
          value={name}
          onChangeText={(text) => setName(text)}
          placeholderTextColor="#aaa"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </Animated.View>
    </View>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 40,
    height: "100%",
    width: "100%",
  },
  topHalf: {
    height: height * 0.4,
    justifyContent: "center",
    alignItems: "center",
  },
  animation: {
    width: 300,
    height: 300,
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
  input: {
    backgroundColor: Colors.dark.card,
    color: Colors.dark.text,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});
