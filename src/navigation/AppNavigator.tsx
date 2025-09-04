import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";

import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import GalleryScreen from "../screens/GalleryScreen";
import NotificationScreen from "../screens/NotificationScreen";
import QRScannerScreen from "../screens/QRScannerScreen";
import CamerasScreen from "../screens/CamerasScreen";
import RTSPScreen from "../screens/RTSPScreen";

import {
  ProfileTabIcon,
  CameraTabIcon,
  GalleryTabIcon,
  NotificationTabIcon,
} from "../icons";

export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Cameras: { serverId: string };
  RTSP: { rtspServerId: string };
};

export type TabParamList = {
  Profile: undefined;
  Camera: undefined;
  Gallery: undefined;
  Notifications: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const iconProps = {
            fill: focused ? "#1D1D1D" : "#676767",
          };

          switch (route.name) {
            case "Profile":
              return <ProfileTabIcon {...iconProps} />;
            case "Camera":
              return <CameraTabIcon {...iconProps} />;
            case "Gallery":
              return <GalleryTabIcon {...iconProps} />;
            case "Notifications":
              return <NotificationTabIcon {...iconProps} />;
            default:
              return null;
          }
        },
        tabBarActiveTintColor: "#1D1D1D",
        tabBarInactiveTintColor: "#676767",
        tabBarStyle: {
          backgroundColor: theme.colors.primaryContainer,
          borderTopColor: theme.colors.primaryContainer,
          borderTopWidth: 1,
          paddingTop: 5,
          paddingBottom: 5,
          paddingHorizontal: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Профиль",
        }}
      />
      <Tab.Screen
        name="Camera"
        component={HomeScreen}
        options={{
          title: "Камеры",
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          title: "Галерея",
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          title: "Уведомления",
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primaryContainer,
          },
          headerTintColor: theme.colors.onBackground,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          cardStyle: {
            backgroundColor: theme.colors.primaryContainer,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={TabNavigator}
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
        <Stack.Screen
          name="RTSP"
          component={RTSPScreen}
          options={{
            title: "RTSP поток",
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
