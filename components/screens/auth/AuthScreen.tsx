import React, { useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password: string) => {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return regex.test(password);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert(
        "Email invalide",
        "Veuillez saisir une adresse email valide."
      );
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        "Mot de passe invalide",
        "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre."
      );
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const url = `https://begainer-api.onrender.com/api/auth/${
      isLogin ? "login" : "register"
    }`;
    const payload = { email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log("Réponse brute :", text);

      let data;
      try {
        data = JSON.parse(text);
        console.log("Données parsées :", data);
      } catch (err) {
        throw new Error("Réponse invalide du serveur : " + text.slice(0, 100));
      }

      if (!response.ok) {
        throw new Error(data.error || "Erreur inconnue");
      }

      if (isLogin) {
        if (data.token) {
          await AsyncStorage.setItem("token", data.token);
          router.push("/user/profile");
        } else {
          throw new Error("Aucun token fourni par le serveur.");
        }
      } else {
        if (!data.id) {
          throw new Error("Identifiant utilisateur non fourni par le serveur.");
        }

        await AsyncStorage.setItem("userId", data.id.toString());
        router.push("/questionnaire/questionnaire");
      }
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animatable.View
        style={styles.formContainer}
        animation="fadeIn"
        duration={500}
      >
        <ThemedText type="title" style={styles.title}>
          {isLogin ? "Connexion" : "Inscription"}
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.dark.text}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={Colors.dark.text}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!isLogin && (
          <Animatable.View animation="fadeIn" duration={500}>
            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={Colors.dark.text}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </Animatable.View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <ThemedText style={styles.buttonText}>
              {isLogin ? "Se connecter" : "S'inscrire"}
            </ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <ThemedText style={styles.link}>
            {isLogin ? "Créer un compte" : "Déjà un compte ? Connectez-vous"}
          </ThemedText>
        </TouchableOpacity>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 16,
  },
  formContainer: {
    width: "100%",
    display: "flex",
    maxWidth: 400,
    padding: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.background,
    alignItems: "center",
  },
  title: {
    fontFamily: "BarlowLight",
    textAlign: "center",
    color: Colors.dark.text,
    marginBottom: 20,
    fontSize: 24,
  },
  input: {
    fontFamily: "BarlowLight",
    backgroundColor: "#2A2233",
    color: Colors.dark.text,
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    width: 350,
    height: 50,
  },
  button: {
    fontFamily: "BarlowLight",
    backgroundColor: Colors.dark.tint,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
    width: 350,
  },
  buttonText: {
    fontFamily: "BarlowLight",
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  link: {
    fontFamily: "BarlowLight",
    color: Colors.dark.tint,
    textAlign: "center",
    marginTop: 15,
  },
});
