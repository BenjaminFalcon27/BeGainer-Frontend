import { View, Text } from "react-native";
import QuestionnaireStep1 from "@/components/screens/questionnaires/Questionnaire";
import React from "react";

export default function QuestionnaireScreen() {
  return (
    <View style={{ height: "100%", width: "100%" }}>
      <QuestionnaireStep1 />
    </View>
  );
}
