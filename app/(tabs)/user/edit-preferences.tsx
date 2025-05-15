import React from "react";
import { View, Text } from "react-native";
import EditPreferencesScreen from "@/components/screens/user/EditUserPreferences";

export default function EditPreferences() {
  return (
    <View style={{ height: "100%", width: "100%" }}>
      <EditPreferencesScreen />
    </View>
  );
}