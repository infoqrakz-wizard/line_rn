import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "react-native-paper";

import HomeScreen from "../screens/HomeScreen";
import QRScannerScreen from "../screens/QRScannerScreen";
import CamerasScreen from "../screens/CamerasScreen";

export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Cameras: { serverId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          cardStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
          options={{
            title: "Сканирование QR-кода",
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Cameras"
          component={CamerasScreen}
          options={{
            title: "Камеры",
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
