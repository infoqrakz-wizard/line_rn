import { View, StyleSheet, Image } from "react-native";
import React from "react";
import { Button, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogoIcon } from "../icons";

const Header = () => {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: top, backgroundColor: theme.colors.primaryContainer },
      ]}
    >
      <LogoIcon />
      <Button onPress={() => {}} mode="contained" style={styles.button}>
        <Text style={styles.buttonText}>Войти</Text>
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 128,
    height: 20,
  },
  button: {
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: "700",
  },
});

export default Header;
