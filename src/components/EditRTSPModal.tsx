import React, { useState, useEffect } from "react";
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

interface EditRTSPModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (serverData: Partial<RTSPServer>) => void;
  rtspServer: RTSPServer | null;
}

const EditRTSPModal: React.FC<EditRTSPModalProps> = ({
  visible,
  onDismiss,
  onSave,
  rtspServer,
}) => {
  const [rtspUrl, setRtspUrl] = useState("");
  const [serverName, setServerName] = useState("");
  const [errors, setErrors] = useState<{ rtspUrl?: string; serverName?: string }>({});
  const theme = useTheme();

  useEffect(() => {
    if (visible && rtspServer) {
      setServerName(rtspServer.name);
      setRtspUrl(rtspServer.rtspUrl);
      setErrors({});
    }
  }, [visible, rtspServer]);

  const validateRtspUrl = (url: string) => {
    const rtspRegex = /^rtsp:\/\/[\w\.-]+:\d+\/.*$/;
    return rtspRegex.test(url);
  };

  const handleSave = () => {
    const newErrors: { rtspUrl?: string; serverName?: string } = {};

    if (!serverName.trim()) {
      newErrors.serverName = "Название сервера обязательно";
    }

    if (!rtspUrl.trim()) {
      newErrors.rtspUrl = "RTSP URL обязателен";
    } else if (!validateRtspUrl(rtspUrl.trim())) {
      newErrors.rtspUrl = "Неверный формат RTSP URL (пример: rtsp://ip:port/path)";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const serverData: Partial<RTSPServer> = {
        name: serverName.trim(),
        rtspUrl: rtspUrl.trim(),
        lastUsed: Date.now(),
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
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          Редактировать RTSP поток
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
            style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}
          >
            Введите полную RTSP ссылку включая IP адрес, порт и путь к потоку
          </Text>
        </View>

        <View style={styles.actions}>
          <Button mode="outlined" onPress={handleClose} style={styles.button}>
            Отмена
          </Button>
          <Button mode="contained" onPress={handleSave} style={styles.button}>
            Сохранить
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
});

export default EditRTSPModal;
