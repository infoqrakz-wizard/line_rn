import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";
import Header from "../components/Header";
import { useUserStore } from "../store/userStore";

const ProfileScreen = () => {
  const theme = useTheme();
  const { isAuth, logout } = useUserStore();

  return (
    <>
      <Header />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          Профиль
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
          Базовый экран профиля
        </Text>
        {isAuth && (
          <Button onPress={logout} mode="contained" style={styles.button}>
            Выйти
          </Button>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  button: {
    marginTop: 20,
  },
});

export default ProfileScreen;
