import { View, StyleSheet, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import {
  Button,
  Text,
  useTheme,
  Dialog,
  Portal,
  TextInput,
  Icon,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogoIcon } from "../icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const Header = () => {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] =
    useState(false);
  const [isCompleteSendCodeModalVisible, setIsCompleteSendCodeModalVisible] =
    useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isCompleteRegisterModalVisible, setIsCompleteRegisterModalVisible] =
    useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const showResetPasswordModal = () => {
    setIsModalVisible(false);
    setIsResetPasswordModalVisible(true);
  };

  const hideResetPasswordModal = () => {
    setIsModalVisible(true);
    setIsResetPasswordModalVisible(false);
  };

  const showCompleteSendCodeModal = () => {
    setIsResetPasswordModalVisible(false);
    setIsCompleteSendCodeModalVisible(true);
  };

  const hideCompleteSendCodeModal = () => {
    setIsCompleteSendCodeModalVisible(false);
    setIsModalVisible(true);
  };

  const showRegisterModal = () => {
    setIsModalVisible(false);
    setIsRegisterModalVisible(true);
  };

  const hideRegisterModal = () => {
    setIsRegisterModalVisible(false);
    setIsModalVisible(true);
  };

  const showCompleteRegisterModal = () => {
    setIsRegisterModalVisible(false);
    setIsCompleteRegisterModalVisible(true);
  };

  const hideCompleteRegisterModal = () => {
    setIsCompleteRegisterModalVisible(false);
    setIsModalVisible(true);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          { paddingTop: top, backgroundColor: theme.colors.primaryContainer },
        ]}
      >
        <LogoIcon />
        <Button onPress={showModal} mode="contained" style={styles.button}>
          <Text style={styles.buttonText}>Войти</Text>
        </Button>
      </View>

      <Portal>
        {(isModalVisible ||
          isResetPasswordModalVisible ||
          isCompleteSendCodeModalVisible ||
          isRegisterModalVisible ||
          isCompleteRegisterModalVisible) && (
          <Animated.View
            style={styles.overlay}
            entering={FadeIn}
            exiting={FadeOut}
          />
        )}

        {(isModalVisible ||
          isResetPasswordModalVisible ||
          isCompleteSendCodeModalVisible ||
          isRegisterModalVisible ||
          isCompleteRegisterModalVisible) && (
          <Animated.View
            style={[
              styles.centeredHeader,
              {
                paddingTop: top,
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
            exiting={FadeOut}
          >
            <LogoIcon style={styles.logo} />
          </Animated.View>
        )}

        <Dialog
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          style={[styles.dialog]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
              backdrop: "#000000",
            },
          }}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Авторизация
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              placeholder="Логин"
              label={
                <Text style={{ color: theme.colors.onBackground }}>
                  Логин (Почта или телефон)
                </Text>
              }
              contentStyle={{
                color: theme.colors.onBackground,
              }}
              theme={{
                roundness: 10,
              }}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              placeholder="Пароль"
              label={
                <Text style={{ color: theme.colors.onBackground }}>Пароль</Text>
              }
              contentStyle={{ color: theme.colors.onBackground }}
              theme={{
                roundness: 10,
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />
            <Button
              onPress={hideModal}
              mode="contained"
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Войти</Text>
            </Button>
            <Text
              style={[styles.registerText, { color: theme.colors.outline }]}
            >
              Если вы новый пользователь, то вам нужно{" "}
              <TouchableOpacity
                onPress={showRegisterModal}
                activeOpacity={0.8}
                hitSlop={10}
              >
                <Text
                  style={[
                    styles.registerTextLink,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  зарегистрироваться
                </Text>
              </TouchableOpacity>
            </Text>
            <TouchableOpacity
              onPress={showResetPasswordModal}
              activeOpacity={0.8}
            >
              <Text style={[styles.forgotText, { color: theme.colors.error }]}>
                Забыли пароль?
              </Text>
            </TouchableOpacity>
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={isResetPasswordModalVisible}
          onDismiss={() => setIsResetPasswordModalVisible(false)}
          style={[styles.dialog]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
              backdrop: "#000000",
            },
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={hideResetPasswordModal}
            style={styles.backButton}
          >
            <Icon
              source="chevron-left"
              size={32}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Сброс пароля
          </Dialog.Title>
          <Dialog.Content>
            <Text
              style={[styles.resetDescription, { color: theme.colors.outline }]}
            >
              Введите свою почту или телефон, мы пришлём временный пароль
            </Text>
            <TextInput
              placeholder="Логин"
              label={
                <Text style={{ color: theme.colors.onBackground }}>
                  Логин (Почта или телефон)
                </Text>
              }
              contentStyle={{
                color: theme.colors.onBackground,
              }}
              theme={{
                roundness: 10,
              }}
              mode="outlined"
              style={styles.input}
            />
            <Button
              onPress={showCompleteSendCodeModal}
              mode="contained"
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Отправить код</Text>
            </Button>
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={isCompleteSendCodeModalVisible}
          onDismiss={() => setIsCompleteSendCodeModalVisible(false)}
          style={[styles.dialog]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
              backdrop: "#000000",
            },
          }}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Новый пароль уже у вас!
          </Dialog.Title>
          <Dialog.Content>
            <Text
              style={[
                styles.resetDescription,
                { color: theme.colors.outline, marginTop: 0 },
              ]}
            >
              Отправили код на почту mail@mail.ru
            </Text>
            <Button
              onPress={hideCompleteSendCodeModal}
              mode="contained"
              style={[styles.loginButton, { marginTop: 10 }]}
            >
              <Text style={styles.loginButtonText}>Войти с новым паролем</Text>
            </Button>
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={isRegisterModalVisible}
          onDismiss={() => setIsRegisterModalVisible(false)}
          style={[styles.dialog]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
              backdrop: "#000000",
            },
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={hideRegisterModal}
            style={styles.backButton}
          >
            <Icon
              source="chevron-left"
              size={32}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Регистрация
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              placeholder="Имя"
              label={
                <Text style={{ color: theme.colors.onBackground }}>
                  Логин (Почта или телефон)
                </Text>
              }
              contentStyle={{
                color: theme.colors.onBackground,
              }}
              theme={{
                roundness: 10,
              }}
              mode="outlined"
              style={styles.input}
            />
            <Button
              onPress={showCompleteRegisterModal}
              mode="contained"
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Далее</Text>
            </Button>
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={isCompleteRegisterModalVisible}
          onDismiss={() => setIsCompleteRegisterModalVisible(false)}
          style={[styles.dialog]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
              backdrop: "#000000",
            },
          }}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Прислали вам пароль!
          </Dialog.Title>
          <Dialog.Content>
            <Text
              style={[
                styles.resetDescription,
                { color: theme.colors.outline, marginTop: 0 },
              ]}
            >
              Отправили код на почту mail@mail.ru
            </Text>
            <Button
              onPress={hideCompleteRegisterModal}
              mode="contained"
              style={[styles.loginButton, { marginTop: 10 }]}
            >
              <Text style={styles.loginButtonText}>Войти в профиль</Text>
            </Button>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
  },
  centeredHeader: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  logo: {
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 1)",
  },
  dialog: {
    backgroundColor: "white",
    borderRadius: 20,
    margin: 20,
    zIndex: 1000,
  },
  dialogTitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    paddingTop: 20,
  },
  input: {
    marginBottom: 15,
  },
  loginButton: {
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 20,
  },
  loginButtonText: {
    fontWeight: "700",
  },
  registerText: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  registerTextLink: {
    textDecorationLine: "underline",
  },
  forgotText: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "500",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 12,
    zIndex: 1000,
  },
  resetDescription: {
    marginBottom: 20,
    marginTop: 5,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default Header;
