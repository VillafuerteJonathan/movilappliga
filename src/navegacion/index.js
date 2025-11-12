import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import useAuth from "../hooks/useAuth";
import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";
import { View, ActivityIndicator } from "react-native";
import colors from "../theme/colors";

export default function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
