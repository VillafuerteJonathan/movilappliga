import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Importar pantallas
import LoginScreen from "../screens/LoginScreen";
import CampeonatosScreen from "../screens/CampeonatosScreen";
import PartidosScreen from "../screens/PartidosScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
        />
        <Stack.Screen 
          name="CampeonatosScreen" 
          component={CampeonatosScreen}
        />
        <Stack.Screen 
          name="PartidosScreen" 
          component={PartidosScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}