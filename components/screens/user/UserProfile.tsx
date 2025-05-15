import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

export default function UserProfile() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userId");
    await AsyncStorage.removeItem("name");

    router.push("/");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Profile</Text>
      <Text style={styles.userName}>{name}</Text>

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        }}
      >
        <Text
          onPress={handleLogout}
          style={{
            color: Colors.dark.tint,
            fontSize: 18,
            marginTop: 20,
            textDecorationLine: "underline",
          }}
        >
          Disconnect
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    color: Colors.dark.text,
    marginBottom: 10,
  },
});
