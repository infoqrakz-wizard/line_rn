import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Modal,
  Text,
  TextInput,
  Button,
  Portal,
  useTheme,
} from "react-native-paper";
import { RTSPServer } from "../store/rtspStore";

interface RTSPModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (serverData: Omit<RTSPServer, "id">) => void;
}

const RTSPModal: React.FC<RTSPModalProps> = ({
  visible,
  onDismiss,
  onSave,
}) => {
  const [rtspUrl, setRtspUrl] = useState("");
  const [serverName, setServerName] = useState("");
  const [errors, setErrors] = useState<{
    rtspUrl?: string;
    serverName?: string;
  }>({});
  const theme = useTheme();

  const handleSave = () => {
    const newErrors: { rtspUrl?: string; serverName?: string } = {};

    if (!serverName.trim()) {
      newErrors.serverName = "Название сервера обязательно";
    }

    if (!rtspUrl.trim()) {
      newErrors.rtspUrl = "RTSP URL обязателен";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const serverData: Omit<RTSPServer, "id"> = {
        name: serverName.trim(),
        url: rtspUrl.trim(),
        lastUsed: Date.now(),
        createdAt: new Date().toISOString(),
      };

      onSave(serverData);
      handleClose();
    }
  };

  const handleClose = () => {
    setRtspUrl("");
    setServerName("");
    setErrors({});
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onBackground }]}
        >
          Добавить RTSP поток
        </Text>

        <View style={styles.form}>
          <TextInput
            label="Название сервера"
            value={serverName}
            onChangeText={setServerName}
            mode="outlined"
            style={styles.input}
            error={!!errors.serverName}
            placeholder="Например: IP камера 1"
          />
          {errors.serverName && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.serverName}
            </Text>
          )}

          <TextInput
            label="RTSP URL"
            value={rtspUrl}
            onChangeText={setRtspUrl}
            mode="outlined"
            style={styles.input}
            error={!!errors.rtspUrl}
            placeholder="rtsp://192.168.1.100:554/stream"
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
          />
          {errors.rtspUrl && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.rtspUrl}
            </Text>
          )}

          <Text
            variant="bodySmall"
            style={[styles.helperText, { color: theme.colors.onBackground }]}
          >
            Введите полную RTSP ссылку включая IP адрес, порт и путь к потоку
          </Text>
        </View>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={handleClose} style={styles.button}>
            Отмена
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.buttonText}>Сохранить</Text>
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  title: {
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "bold",
  },
  form: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
  },
  buttonText: {
    fontWeight: "700",
  },
});

export default RTSPModal;
