import UserProfile from "@/components/screens/user/UserProfile";
import React from "react";
import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={{ height: "100%", width: "100%" }}>
      <UserProfile />
    </View>
  );
}