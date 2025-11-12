import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../ventanas/Auth/LoginScreen";
import HomeScreen from "../ventanas/Home/HomeScreen";

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
