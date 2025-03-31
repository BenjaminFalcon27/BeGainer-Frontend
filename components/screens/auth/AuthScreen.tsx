import React, { useState } from "react";
import { TextInput, TouchableOpacity, StyleSheet, View } from "react-native";
import * as Animatable from "react-native-animatable";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

        {isLogin ? null : (
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

        <TouchableOpacity style={styles.button}>
          <ThemedText style={styles.buttonText}>
            {isLogin ? "Se connecter" : "S'inscrire"}
          </ThemedText>
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
    textAlign: "center",
    color: Colors.dark.text,
    marginBottom: 20,
    fontSize: 24,
  },
  input: {
    backgroundColor: "#2A2233",
    color: Colors.dark.text,
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    width: 350,
    height: 50,
  },
  button: {
    backgroundColor: Colors.dark.tint,
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
    width: 350,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  link: {
    color: Colors.dark.tint,
    textAlign: "center",
    marginTop: 15,
  },
});
