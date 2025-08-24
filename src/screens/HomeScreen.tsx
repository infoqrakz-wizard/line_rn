import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, FlatList } from "react-native";
import {
  FAB,
  Portal,
  Dialog,
  Button,
  Text,
  Card,
  Title,
  Paragraph,
  useTheme,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import QrImageReader from "react-native-qr-image-reader";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useServerStore, Server } from "../store/serverStore";
import { parseQRServerData, createServerFromQR } from "../utils/qrParser";
import ServerCard from "../components/ServerCard";
import EditServerModal from "../components/EditServerModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import CreateServerModal from "../components/CreateServerModal";

const HomeScreen = () => {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { bottom, top } = useSafeAreaInsets();
  const { servers, addServer, updateServer, removeServer, getLastUsedServer } =
    useServerStore();

  useEffect(() => {
    const lastUsedServer = getLastUsedServer();
    if (lastUsedServer) {
      navigation.navigate("Cameras", { serverId: lastUsedServer });
    }
  }, [navigation]);

  const handleChooseFromGallery = async () => {
    setDialogVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          const qrResult = await QrImageReader.decode({
            path: result.assets[0].uri,
          });

          if (qrResult && qrResult.result) {
            const serverData = parseQRServerData(qrResult.result);

            if (serverData) {
              const newServer = createServerFromQR(serverData);
              addServer(newServer);

              Alert.alert(
                "Сервер добавлен!",
                `Сервер "${newServer.name}" успешно добавлен`,
                [{ text: "OK" }]
              );
            } else {
              Alert.alert("QR-код найден", `Содержимое: ${qrResult.result}`, [
                { text: "OK" },
              ]);
            }
          } else {
            Alert.alert(
              "QR-код не найден",
              "В выбранном изображении не обнаружен QR-код"
            );
          }
        } catch (qrError) {
          console.error("Ошибка при чтении QR-кода:", qrError);
          Alert.alert(
            "Ошибка чтения",
            "Не удалось прочитать QR-код из изображения"
          );
        }
      }
    } catch (error) {
      console.error("Ошибка при выборе файла:", error);
      Alert.alert("Ошибка", "Не удалось выбрать файл");
    }
  };

  const handleOpenManual = () => {
    setDialogVisible(false);
    setCreateModalVisible(true);
  };

  const handleSaveNewServer = (serverData: Omit<Server, "id">) => {
    if (serverData) {
      addServer(serverData);
    }
    setCreateModalVisible(false);
  };

  const handleOpenCamera = () => {
    setDialogVisible(false);
    navigation.navigate("QRScanner");
  };

  const showDialog = () => {
    setDialogVisible(true);
  };

  const hideDialog = () => {
    setDialogVisible(false);
  };

  const handleServerPress = (server: Server) => {
    navigation.navigate("Cameras", { serverId: server.id });
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setEditModalVisible(true);
  };

  const handleDeleteServer = (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    Alert.alert(
      "Удалить сервер",
      `Вы уверены, что хотите удалить сервер "${server?.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => removeServer(serverId),
        },
      ]
    );
  };

  const handleSaveEditedServer = (serverData: Partial<Server>) => {
    if (editingServer) {
      updateServer(editingServer.id, serverData);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditingServer(null);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
  };

  const renderServerCard = ({ item }: { item: Server }) => (
    <ServerCard
      server={item}
      onPress={handleServerPress}
      onEdit={handleEditServer}
      onDelete={handleDeleteServer}
    />
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: top },
      ]}
    >
      <View
        style={[
          styles.content,
          { justifyContent: servers.length === 0 ? "center" : "flex-start" },
        ]}
      >
        {servers.length === 0 ? (
          <Card style={styles.welcomeCard}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface }}>
                Camera View
              </Title>
              <Paragraph style={{ color: theme.colors.onSurface }}>
                Добро пожаловать! Нажмите на кнопку внизу, чтобы отсканировать
                QR-код с помощью камеры или выбрать изображение из галереи.
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Text
              variant="headlineMedium"
              style={[
                styles.serversTitle,
                { color: theme.colors.onBackground },
              ]}
            >
              Мои серверы
            </Text>
            <FlatList
              data={servers}
              renderItem={renderServerCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.serversList}
            />
          </>
        )}
      </View>

      <FAB
        icon="plus"
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary, bottom: bottom },
        ]}
        onPress={showDialog}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>Выберите источник</Dialog.Title>
          <Dialog.Content>
            <Text>Как вы хотите добавить сервер?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleChooseFromGallery}>Из галереи</Button>
            <Button onPress={handleOpenCamera}>Камера</Button>
            <Button onPress={handleOpenManual}>Вручную</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <EditServerModal
        visible={editModalVisible}
        server={editingServer}
        onDismiss={handleCloseEditModal}
        onSave={handleSaveEditedServer}
      />

      <CreateServerModal
        visible={createModalVisible}
        onDismiss={handleCloseCreateModal}
        onSave={handleSaveNewServer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {},
  serversTitle: {
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  serversList: {
    paddingBottom: 100,
  },
  fab: {
    position: "absolute",
    right: 0,
    margin: 16,
  },
});

export default HomeScreen;
