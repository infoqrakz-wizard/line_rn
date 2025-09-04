import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import {
  FAB,
  Text,
  Card,
  Title,
  Paragraph,
  useTheme,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useServerStore, Server } from "../store/serverStore";
import { useRTSPStore, RTSPServer } from "../store/rtspStore";
import { parseQRServerData, createServerFromQR } from "../utils/qrParser";
import ServerCard from "../components/ServerCard";
import EditServerModal from "../components/EditServerModal";
import { RootStackParamList } from "../navigation/AppNavigator";
import CreateServerModal from "../components/CreateServerModal";
import RTSPModal from "../components/RTSPModal";
import EditRTSPModal from "../components/EditRTSPModal";
import { Camera, CameraView } from "expo-camera";

const HomeScreen = () => {
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [rtspModalVisible, setRtspModalVisible] = useState(false);
  const [editRTSPModalVisible, setEditRTSPModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [editingRTSPServer, setEditingRTSPServer] = useState<RTSPServer | null>(
    null
  );
  const fadeAnim = useSharedValue(0);
  const translateY1 = useSharedValue(0);
  const translateY2 = useSharedValue(0);
  const translateY3 = useSharedValue(0);
  const translateY4 = useSharedValue(0);
  const rotation = useSharedValue(0);
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { bottom, top } = useSafeAreaInsets();
  const {
    servers,
    addServer,
    updateServer,
    removeServer,
    getLastUsedServer,
    getLastUsedServerTime,
  } = useServerStore();
  const {
    rtspServers,
    addRTSPServer,
    updateRTSPServer,
    removeRTSPServer,
    getLastUsedRTSPServer,
    getLastUsedRTSPServerTime,
  } = useRTSPStore();

  useEffect(() => {
    const lastUsedRTSPServer = getLastUsedRTSPServer();
    const lastUsedRTSPServerTime = getLastUsedRTSPServerTime();

    const lastUsedServer = getLastUsedServer();
    const lastUsedServerTime = getLastUsedServerTime();

    if (lastUsedRTSPServerTime && lastUsedServerTime) {
      if (lastUsedRTSPServerTime > lastUsedServerTime && lastUsedRTSPServer) {
        navigation.navigate("RTSP", { rtspServerId: lastUsedRTSPServer });
      } else if (lastUsedServer) {
        navigation.navigate("Cameras", { serverId: lastUsedServer });
      }
    } else if (lastUsedRTSPServerTime && lastUsedRTSPServer) {
      navigation.navigate("RTSP", { rtspServerId: lastUsedRTSPServer });
    } else if (lastUsedServerTime && lastUsedServer) {
      navigation.navigate("Cameras", { serverId: lastUsedServer });
    }
  }, [
    navigation,
    getLastUsedServer,
    getLastUsedRTSPServer,
    getLastUsedServerTime,
    getLastUsedRTSPServerTime,
  ]);

  const openFabMenu = () => {
    setFabMenuOpen(true);
    rotation.value = withTiming(45, { duration: 200 });
    fadeAnim.value = withTiming(1, { duration: 300 });
    translateY1.value = withTiming(-70, { duration: 300 });
    translateY2.value = withTiming(-130, { duration: 300 });
    translateY3.value = withTiming(-190, { duration: 300 });
    translateY4.value = withTiming(-250, { duration: 300 });
  };

  const closeFabMenu = () => {
    rotation.value = withTiming(0, { duration: 200 });
    fadeAnim.value = withTiming(0, { duration: 300 });
    translateY1.value = withTiming(0, { duration: 300 });
    translateY2.value = withTiming(0, { duration: 300 });
    translateY3.value = withTiming(0, { duration: 300 });
    translateY4.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setFabMenuOpen)(false);
      }
    });
  };

  const toggleFabMenu = () => {
    if (fabMenuOpen) {
      closeFabMenu();
    } else {
      openFabMenu();
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const menuItem1Style = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: translateY1.value }],
  }));

  const menuItem2Style = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: translateY2.value }],
  }));

  const menuItem3Style = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: translateY3.value }],
  }));

  const menuItem4Style = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: translateY4.value }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleChooseFromGallery = async () => {
    closeFabMenu();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        try {
          const scanResult = await Camera.scanFromURLAsync(
            result.assets[0].uri,
            ["qr"]
          );

          if (scanResult && scanResult.length > 0) {
            const qrResult = scanResult[0].data;
            const serverData = parseQRServerData(qrResult);

            if (serverData) {
              const newServer = createServerFromQR(serverData);
              addServer(newServer);

              Alert.alert(
                "Сервер добавлен!",
                `Сервер "${newServer.name}" успешно добавлен`,
                [{ text: "OK" }]
              );
            } else {
              Alert.alert("QR-код найден", `Содержимое: ${qrResult}`, [
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
    closeFabMenu();
    setCreateModalVisible(true);
  };

  const handleSaveNewServer = (serverData: Omit<Server, "id">) => {
    if (serverData) {
      addServer(serverData);
    }
    setCreateModalVisible(false);
  };

  const handleOpenCamera = () => {
    closeFabMenu();
    navigation.navigate("QRScanner");
  };

  const handleOpenRTSP = () => {
    closeFabMenu();
    setRtspModalVisible(true);
  };

  const handleSaveRTSPServer = (serverData: Omit<RTSPServer, "id">) => {
    addRTSPServer(serverData);
    setRtspModalVisible(false);
  };

  const handleCloseRTSPModal = () => {
    setRtspModalVisible(false);
  };

  type DisplayServer =
    | (Server & { serverType: "nvr" })
    | (RTSPServer & { serverType: "rtsp" });

  const allServers: DisplayServer[] = React.useMemo(() => {
    const nvrServers: DisplayServer[] = servers.map((server) => ({
      ...server,
      serverType: "nvr" as const,
    }));
    const rtspDisplayServers: DisplayServer[] = rtspServers.map((server) => ({
      ...server,
      serverType: "rtsp" as const,
    }));

    return [...nvrServers, ...rtspDisplayServers].sort((a, b) => {
      const aTime = a.lastUsed || 0;
      const bTime = b.lastUsed || 0;
      return bTime - aTime;
    });
  }, [servers, rtspServers]);

  const handleServerPress = (server: DisplayServer) => {
    if (server.serverType === "rtsp") {
      navigation.navigate("RTSP", { rtspServerId: server.id });
    } else {
      navigation.navigate("Cameras", { serverId: server.id });
    }
  };

  const handleEditServer = (server: DisplayServer) => {
    if (server.serverType === "nvr") {
      setEditingServer(server as Server);
      setEditModalVisible(true);
    } else {
      setEditingRTSPServer(server as RTSPServer);
      setEditRTSPModalVisible(true);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    const server = allServers.find((s) => s.id === serverId);
    if (!server) return;

    Alert.alert(
      "Удалить сервер",
      `Вы уверены, что хотите удалить сервер "${server.name}"?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            if (server.serverType === "rtsp") {
              removeRTSPServer(serverId);
            } else {
              removeServer(serverId);
            }
          },
        },
      ]
    );
  };

  const handleSaveEditedServer = (serverData: Partial<Server>) => {
    if (editingServer) {
      updateServer(editingServer.id, serverData);
    }
  };

  const handleSaveEditedRTSPServer = (serverData: Partial<RTSPServer>) => {
    if (editingRTSPServer) {
      updateRTSPServer(editingRTSPServer.id, serverData);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setEditingServer(null);
  };

  const handleCloseEditRTSPModal = () => {
    setEditRTSPModalVisible(false);
    setEditingRTSPServer(null);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
  };

  const renderServerCard = ({ item }: { item: DisplayServer }) => (
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
          { justifyContent: allServers.length === 0 ? "center" : "flex-start" },
        ]}
      >
        {allServers.length === 0 ? (
          <Card style={styles.welcomeCard}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface }}>
                Camera View
              </Title>
              <Paragraph style={{ color: theme.colors.onSurface }}>
                Добро пожаловать! Нажмите на кнопку внизу, чтобы добавить сервер
                камер или RTSP поток.
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
              data={allServers}
              renderItem={renderServerCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.serversList}
            />
          </>
        )}
      </View>

      {fabMenuOpen && (
        <TouchableWithoutFeedback onPress={closeFabMenu}>
          <Animated.View style={[styles.overlay, overlayStyle]} />
        </TouchableWithoutFeedback>
      )}

      {fabMenuOpen && (
        <>
          <Animated.View
            style={[
              styles.fabMenuItem,
              {
                right: 16,
                bottom: bottom + 16,
              },
              menuItem4Style,
            ]}
          >
            <FAB
              icon="video"
              size="small"
              label="RTSP"
              style={[
                styles.fabMenuButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleOpenRTSP}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.fabMenuItem,
              {
                right: 16,
                bottom: bottom + 16,
              },
              menuItem3Style,
            ]}
          >
            <FAB
              icon="image"
              size="small"
              label="Галерея"
              style={[
                styles.fabMenuButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleChooseFromGallery}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.fabMenuItem,
              {
                right: 16,
                bottom: bottom + 16,
              },
              menuItem2Style,
            ]}
          >
            <FAB
              icon="camera"
              size="small"
              label="Камера"
              style={[
                styles.fabMenuButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleOpenCamera}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.fabMenuItem,
              {
                right: 16,
                bottom: bottom + 16,
              },
              menuItem1Style,
            ]}
          >
            <FAB
              icon="pencil-plus"
              size="small"
              label="Вручную"
              style={[
                styles.fabMenuButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleOpenManual}
            />
          </Animated.View>
        </>
      )}

      <FAB
        icon={fabMenuOpen ? "close" : "plus"}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            bottom: bottom,
          },
          fabStyle,
        ]}
        onPress={toggleFabMenu}
      />

      <EditServerModal
        visible={editModalVisible}
        server={editingServer}
        onDismiss={handleCloseEditModal}
        onSave={handleSaveEditedServer}
      />

      <EditRTSPModal
        visible={editRTSPModalVisible}
        rtspServer={editingRTSPServer}
        onDismiss={handleCloseEditRTSPModal}
        onSave={handleSaveEditedRTSPServer}
      />

      <CreateServerModal
        visible={createModalVisible}
        onDismiss={handleCloseCreateModal}
        onSave={handleSaveNewServer}
      />

      <RTSPModal
        visible={rtspModalVisible}
        onDismiss={handleCloseRTSPModal}
        onSave={handleSaveRTSPServer}
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
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  fabMenuItem: {
    position: "absolute",
    alignItems: "flex-end",
  },
  fabMenuButton: {
    marginBottom: 8,
  },
});

export default HomeScreen;
