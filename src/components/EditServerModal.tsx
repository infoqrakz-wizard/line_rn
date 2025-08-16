import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
} from 'react-native-paper';
import { Server } from '../store/serverStore';

interface EditServerModalProps {
  visible: boolean;
  server: Server | null;
  onDismiss: () => void;
  onSave: (serverData: Partial<Server>) => void;
}

const EditServerModal: React.FC<EditServerModalProps> = ({
  visible,
  server,
  onDismiss,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [port, setPort] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const theme = useTheme();

  useEffect(() => {
    if (server) {
      setName(server.name);
      setUrl(server.url);
      setPort(server.port.toString());
      setLogin(server.login);
      setPassword(server.pass);
    }
  }, [server]);

  const handleSave = () => {
    if (!server) return;

    const updatedData: Partial<Server> = {
      name: name.trim(),
      url: url.trim(),
      port: parseInt(port) || 443,
      login: login.trim(),
      pass: password,
    };

    onSave(updatedData);
    onDismiss();
  };

  const isValidForm = () => {
    return name.trim() !== '' && url.trim() !== '' && port.trim() !== '';
  };

  const resetForm = () => {
    setName('');
    setUrl('');
    setPort('');
    setLogin('');
    setPassword('');
    setShowPassword(false);
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
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.header}>
                <Text
                  variant="headlineSmall"
                  style={[styles.title, { color: theme.colors.onSurface }]}
                >
                  Редактировать сервер
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
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  onPress={handleDismiss}
                  style={[styles.button, styles.cancelButton]}
                >
                  Отмена
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  disabled={!isValidForm()}
                  style={styles.button}
                >
                  Сохранить
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
    maxHeight: '90%',
  },
  card: {
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
  cancelButton: {
    marginRight: 8,
  },
});

export default EditServerModal; 