import { View, Text } from "react-native";
import React from "react";
import SessionDetailScreen from "@/components/screens/sessions/sessionDetailsScreen";

export default function sessionDetails() {
  return (
    <View style={{ height: "100%", width: "100%" }}>
      <SessionDetailScreen />
    </View>
  );
}
