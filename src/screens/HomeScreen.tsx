import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useTheme, Text, Icon } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useServerStore, Server, DisplayServer } from "../store/serverStore";
import { useRTSPStore, RTSPServer } from "../store/rtspStore";
import { parseQRServerData, createServerFromQR } from "../utils/qrParser";
import ServerCard from "../components/ServerCard";
import { RootStackParamList } from "../navigation/AppNavigator";
import CreateServerModal from "../components/CreateServerModal";
import RTSPModal from "../components/RTSPModal";
import { Camera } from "expo-camera";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import CameraSettings from "../components/CameraSettings";

const testServer: DisplayServer = {
  id: "1",
  name: "Демо-сервер",
  url: "name265d0000",
  username: "test",
  password: "test",
  lastUsed: 0,
  serverType: "nvr" as const,
  port: 0,
};

const HomeScreen = () => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [rtspModalVisible, setRtspModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [editingRTSPServer, setEditingRTSPServer] = useState<RTSPServer | null>(
    null
  );
  const [isSettingsStage, setIsSettingsStage] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [280], []);
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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

    // if (lastUsedRTSPServerTime && lastUsedServerTime) {
    //   if (lastUsedRTSPServerTime > lastUsedServerTime && lastUsedRTSPServer) {
    //     navigation.navigate("RTSP", { rtspServerId: lastUsedRTSPServer });
    //   } else if (lastUsedServer) {
    //     navigation.navigate("Cameras", { serverId: lastUsedServer });
    //   }
    // } else if (lastUsedRTSPServerTime && lastUsedRTSPServer) {
    //   navigation.navigate("RTSP", { rtspServerId: lastUsedRTSPServer });
    // } else if (lastUsedServerTime && lastUsedServer) {
    //   navigation.navigate("Cameras", { serverId: lastUsedServer });
    // }
  }, [
    navigation,
    getLastUsedServer,
    getLastUsedRTSPServer,
    getLastUsedServerTime,
    getLastUsedRTSPServerTime,
  ]);

  const handleSettingsStage = () => {
    setIsSettingsStage(true);
  };

  const handleCloseSettingsStage = () => {
    setIsSettingsStage(false);
  };

  const handleChooseFromGallery = async () => {
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
    setCreateModalVisible(true);
  };

  const handleSaveNewServer = (serverData: Omit<Server, "id">) => {
    if (serverData) {
      addServer(serverData);
    }
    setCreateModalVisible(false);
  };

  const handleOpenCamera = () => {
    navigation.navigate("QRScanner");
  };

  const handleOpenRTSP = () => {
    setRtspModalVisible(true);
  };

  const handleSaveRTSPServer = (serverData: Omit<RTSPServer, "id">) => {
    addRTSPServer(serverData);
    setRtspModalVisible(false);
  };

  const handleCloseRTSPModal = () => {
    setRtspModalVisible(false);
  };

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
      setIsSettingsStage(true);
    } else {
      setEditingRTSPServer(server as RTSPServer);
      setIsSettingsStage(true);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    const server = allServers.find((s) => s.id === serverId);
    if (!server) return;

    if (server.serverType === "rtsp") {
      removeRTSPServer(serverId);
    } else {
      removeServer(serverId);
    }

    handleCloseEditModal();
  };

  const handleSaveEditedServer = (serverData: Partial<DisplayServer>) => {
    if (editingServer) {
      updateServer(editingServer.id, serverData as Server);
    }
    if (editingRTSPServer) {
      updateRTSPServer(editingRTSPServer.id, serverData as RTSPServer);
    }

    handleCloseEditModal();
  };

  const handleCloseEditModal = () => {
    setIsSettingsStage(false);
    setEditingServer(null);
    setEditingRTSPServer(null);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
  };

  const handleBottomSheetOpen = () => {
    bottomSheetRef.current?.snapToIndex(1);
  };

  const handleBottomSheetClose = () => {
    bottomSheetRef.current?.close();
  };

  const bottomSheetMenuItems = [
    {
      title: "QR-Код",
      onPress: () => {
        handleBottomSheetClose();
        handleOpenCamera();
      },
    },
    {
      title: "Из галереи",
      onPress: () => {
        handleBottomSheetClose();
        handleChooseFromGallery();
      },
    },
    {
      title: "Ввести вручную",
      onPress: () => {
        handleBottomSheetClose();
        handleOpenManual();
      },
    },
    {
      title: "RTSP сервер",
      onPress: () => {
        handleBottomSheetClose();
        handleOpenRTSP();
      },
    },
  ];

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={1}
        style={[
          props.style,
          {
            backgroundColor: "#0000007D",
          },
        ]}
      />
    ),
    []
  );

  const renderBottomSheetContent = useCallback(
    () => (
      <BottomSheetView
        style={[
          styles.bottomSheetContent,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
      >
        <View style={styles.bottomSheetHeader}>
          <Text
            variant="titleMedium"
            style={[
              styles.bottomSheetTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            Добавить сервер
          </Text>
          <TouchableOpacity onPress={handleBottomSheetClose}>
            <Icon source="close" size={24} color={theme.colors.outline} />
          </TouchableOpacity>
        </View>

        {bottomSheetMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.bottomSheetMenuItem,
              index < bottomSheetMenuItems.length - 1 &&
                styles.bottomSheetMenuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Text
              variant="bodyLarge"
              style={[
                styles.bottomSheetMenuItemText,
                { color: theme.colors.onBackground },
              ]}
            >
              {item.title}
            </Text>
            <Icon
              source="chevron-right"
              size={24}
              color={theme.colors.outline}
            />
          </TouchableOpacity>
        ))}
      </BottomSheetView>
    ),
    [bottomSheetMenuItems, theme.colors, handleBottomSheetClose]
  );

  const renderServerCard = ({ item }: { item: DisplayServer }) => (
    <View style={{ width: "100%" }}>
      <ServerCard
        server={item}
        onPress={handleServerPress}
        onEdit={handleEditServer}
        onDelete={handleDeleteServer}
        onSettings={handleSettingsStage}
      />
    </View>
  );

  return (
    <>
      <Header />
      {isSettingsStage ? (
        <Animated.View
          key={isSettingsStage ? "settingsStage" : "homeStage"}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
          style={styles.settingsStage}
        >
          <CameraSettings
            server={(editingServer || editingRTSPServer) as DisplayServer}
            onBack={handleCloseEditModal}
            onSave={handleSaveEditedServer}
            handleDeleteCamera={handleDeleteServer}
          />
        </Animated.View>
      ) : (
        <Animated.View
          key={isSettingsStage ? "settingsStage" : "homeStage"}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={[styles.content]}>
            <FlatList
              data={allServers}
              renderItem={renderServerCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.serversListContainer}
              contentContainerStyle={styles.serversList}
              ListHeaderComponent={() => (
                <View style={{ width: "100%" }}>
                  <ServerCard
                    server={testServer}
                    onPress={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </View>
              )}
              ListFooterComponent={() => <ProductCard />}
            />
          </View>

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

          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
            onPress={handleBottomSheetOpen}
            activeOpacity={0.8}
          >
            <Icon source="plus" size={24} color={theme.colors.secondary} />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.secondary, marginLeft: 8 }}
            >
              Добавить сервер
            </Text>
          </TouchableOpacity>

          <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backgroundStyle={{
              backgroundColor: theme.colors.primaryContainer,
            }}
            handleIndicatorStyle={{ height: 0 }}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
          >
            {renderBottomSheetContent()}
          </BottomSheet>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
  },
  welcomeCard: {},
  serversListContainer: {
    flex: 1,
    paddingTop: 12,
  },
  serversList: {
    gap: 12,
    paddingBottom: 72,
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
  addButton: {
    position: "absolute",
    bottom: 10,
    width: "75%",
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  bottomSheetTitle: {
    fontWeight: "700",
  },
  bottomSheetMenuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 0,
  },
  bottomSheetMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  bottomSheetMenuItemText: {
    flex: 1,
  },
  settingsStage: {
    flex: 1,
  },
});

export default HomeScreen;
