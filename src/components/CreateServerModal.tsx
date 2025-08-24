import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Modal,
  Portal,
  Text,
  TextInput,
  Button,
  useTheme,
  Card,
  Divider,
  IconButton,
} from "react-native-paper";
import { Server } from "../store/serverStore";
import { determineProtocolForUrl } from "../utils/cameraApi";

interface CreateServerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (serverData: Omit<Server, "id">) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({
  visible,
  onDismiss,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [port, setPort] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Сохранение...");

  const theme = useTheme();

  useEffect(() => {
    resetForm();
  }, [visible]);

  const handleSave = async () => {
    setIsLoading(true);
    setLoadingMessage("Проверка соединения...");

    try {
      const trimmedUrl = url.trim();
      const serverPort = parseInt(port) || 443;
      const trimmedLogin = login.trim();

      let validatedUrl: string;
      try {
        setLoadingMessage("Определение протокола...");
        validatedUrl = await determineProtocolForUrl(
          trimmedUrl,
          serverPort,
          trimmedLogin,
          password
        );
      } catch (protocolError) {
        console.warn(
          "Не удалось определить протокол, используем введенный URL:",
          protocolError
        );

        validatedUrl =
          trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
            ? trimmedUrl
            : `https://${trimmedUrl}`;
      }

      setLoadingMessage("Сохранение...");

      const updatedData: Omit<Server, "id"> = {
        name: name.trim(),
        url: validatedUrl,
        port: serverPort,
        login: trimmedLogin,
        pass: password,
        createdAt: new Date().toISOString(),
      };

      onSave(updatedData);
      onDismiss();
    } catch (err) {
      console.error("Ошибка при сохранении сервера:", err);
    } finally {
      setIsLoading(false);
      setLoadingMessage("Сохранение...");
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setPort("");
    setLogin("");
    setPassword("");
    setShowPassword(false);
    setLoadingMessage("Сохранение...");
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.header}>
                <Text
                  variant="headlineSmall"
                  style={[styles.title, { color: theme.colors.onSurface }]}
                >
                  Добавить сервер
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={handleDismiss}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.form}>
                <TextInput
                  label="Название сервера"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="server" />}
                />

                <TextInput
                  label="URL сервера"
                  value={url}
                  onChangeText={setUrl}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="url"
                  left={<TextInput.Icon icon="web" />}
                  placeholder="https://example.com"
                />

                <TextInput
                  label="Порт"
                  value={port}
                  onChangeText={setPort}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="lan-connect" />}
                  placeholder="443"
                />

                <TextInput
                  label="Логин"
                  value={login}
                  onChangeText={setLogin}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="account" />}
                />

                <TextInput
                  label="Пароль"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <View style={styles.actions}>
                {!isLoading && (
                  <Button
                    mode="outlined"
                    onPress={handleDismiss}
                    style={[styles.button, styles.cancelButton]}
                  >
                    Отмена
                  </Button>
                )}
                <Button
                  mode="contained"
                  onPress={handleSave}
                  disabled={isLoading || !name || !url || !port || !login}
                  style={styles.button}
                >
                  {isLoading ? loadingMessage : "Сохранить"}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    maxHeight: "90%",
  },
  card: {
    borderRadius: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontWeight: "bold",
  },
  divider: {
    marginBottom: 20,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
  cancelButton: {
    marginRight: 8,
  },
});

export default CreateServerModal;
