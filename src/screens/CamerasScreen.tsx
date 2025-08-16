import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ViewToken,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Image } from "expo-image";
import { Button, Card, Icon, Switch } from "react-native-paper";
import { useServerStore } from "../store/serverStore";
import {
  fetchCameraList,
  Camera,
  buildStreamingUrl,
  buildImageUrl,
} from "../utils/cameraApi";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type CamerasScreenRouteProp = RouteProp<RootStackParamList, "Cameras">;

const CamerasScreen = () => {
  const route = useRoute<CamerasScreenRouteProp>();
  const { serverId } = route.params;
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Map<string, boolean>>(
    new Map()
  );
  const [visibleCameras, setVisibleCameras] = useState<Set<string>>(new Set());
  const [playingCameras, setPlayingCameras] = useState<Set<string>>(new Set());
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    Dimensions.get("window").height < Dimensions.get("window").width
  );

  const server = useServerStore((state) => state.getServer(serverId));
  const updateStreamFormat = useServerStore(
    (state) => state.updateStreamFormat
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsPortrait(window.height < window.width);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const loadCameras = async () => {
      if (!server) {
        setError("Сервер не найден");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchCameraList(server);

        if (response.success) {
          setCameras(response.cameras);
        } else {
          setError(response.error || "Ошибка загрузки камер");
        }
      } catch (err) {
        setError("Ошибка подключения к серверу");
      } finally {
        setLoading(false);
      }
    };

    loadCameras();
  }, [server]);

  const handleVideoError = (cameraUri: string) => {
    setVideoErrors((prev) => {
      const newMap = new Map(prev);
      newMap.set(cameraUri, true);
      return newMap;
    });
  };

  const retryVideo = (cameraUri: string) => {
    setVideoErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(cameraUri);
      return newMap;
    });
  };

  const onViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
  }) => {
    const currentVisible = new Set(
      viewableItems
        .filter((item) => item.isViewable)
        .map((item) => (item.item as Camera).uri)
    );

    setVisibleCameras(currentVisible);

    const visibleArray = Array.from(currentVisible);
    const newPlayingCameras = new Set(visibleArray.slice(0, 4));

    setPlayingCameras(newPlayingCameras);
  };

  const openFullscreen = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsModalVisible(true);
  };

  const closeFullscreen = () => {
    setIsModalVisible(false);
    setSelectedCamera(null);
  };

  const toggleStreamFormat = () => {
    if (server) {
      const newFormat = server.streamFormat === "mp4" ? "m3u8" : "mp4";
      updateStreamFormat(serverId, newFormat);

      setVideoErrors(new Map());

      const loadCameras = async () => {
        if (!server) return;

        try {
          setLoading(true);
          const response = await fetchCameraList(server);

          if (response.success) {
            setCameras(response.cameras);
          } else {
            setError(response.error || "Ошибка загрузки камер");
          }
        } catch (err) {
          setError("Ошибка подключения к серверу");
        } finally {
          setLoading(false);
        }
      };

      loadCameras();
    }
  };

  const renderCameraItem = ({
    item: camera,
    index,
  }: {
    item: Camera;
    index: number;
  }) => {
    const shouldPlayVideo =
      playingCameras.has(camera.uri) && !videoErrors.get(camera.uri);

    const containerWidth = isPortrait ? "49%" : "100%";
    const containerHeight = isPortrait
      ? Dimensions.get("window").height
      : Dimensions.get("window").height / 2;

    return (
      <View style={[styles.cameraWrapper, { width: containerWidth }]}>
        <View style={[styles.cameraContainer, { height: containerHeight }]}>
          <Image
            source={{ uri: buildImageUrl(server!, camera) }}
            style={styles.backgroundImage}
            contentFit="fill"
          />
          {!videoErrors.get(camera.uri) ? (
            <Pressable onPress={() => openFullscreen(camera)}>
              <Video
                source={{ uri: buildStreamingUrl(server!, camera) }}
                style={[styles.video, { height: containerHeight }]}
                shouldPlay={shouldPlayVideo}
                isLooping
                isMuted
                resizeMode={ResizeMode.STRETCH}
                onError={() => handleVideoError(camera.uri)}
              />
            </Pressable>
          ) : (
            <View style={styles.errorOverlay}>
              <Card style={styles.errorCard}>
                <Card.Content style={styles.errorContent}>
                  <Text style={styles.errorTitle}>Ошибка загрузки видео</Text>
                  <Text style={styles.errorDescription}>
                    Не удалось загрузить видеопоток с камеры
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => retryVideo(camera.uri)}
                    style={styles.retryButton}
                    labelStyle={styles.retryButtonText}
                  >
                    Повторить
                  </Button>
                </Card.Content>
              </Card>
            </View>
          )}
        </View>
      </View>
    );
  };

  const keyExtractor = (item: Camera) => item.uri;

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fff" animating={true} />
        <Text style={styles.loadingText}>Загрузка камер...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (cameras.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Камеры не найдены</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />

        <Pressable
          style={[
            styles.exitButton,
            { top: Platform.OS === "ios" ? top : top + 10 },
          ]}
          onPress={navigation.goBack}
        >
          <Icon source="arrow-left" size={24} color="white" />
        </Pressable>

        <View
          style={[
            styles.formatSwitchContainer,
            { top: Platform.OS === "ios" ? top : top + 10 },
          ]}
        >
          <Text style={styles.formatLabel}>MP4</Text>
          <Switch
            value={server?.streamFormat !== "mp4"}
            onValueChange={toggleStreamFormat}
            color="#2196F3"
          />
          <Text style={styles.formatLabel}>M3U8</Text>
        </View>

        <FlatList
          data={cameras}
          renderItem={renderCameraItem}
          keyExtractor={keyExtractor}
          numColumns={isPortrait ? 2 : 1}
          key={isPortrait ? "portrait" : "landscape"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          columnWrapperStyle={isPortrait ? styles.row : undefined}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 30,
            minimumViewTime: 100,
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          windowSize={10}
        />
      </SafeAreaView>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden />

          <Pressable
            style={[
              styles.closeButton,
              { top: Platform.OS === "ios" ? top : top + 10 },
            ]}
            onPress={closeFullscreen}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          {selectedCamera && (
            <Video
              source={{ uri: buildStreamingUrl(server!, selectedCamera) }}
              style={styles.fullscreenVideo}
              shouldPlay
              isLooping
              isMuted
              resizeMode={ResizeMode.CONTAIN}
              onError={() => {
                handleVideoError(selectedCamera.uri);
                closeFullscreen();
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
    marginTop: 20,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    textAlign: "center",
    margin: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  cameraWrapper: {
    margin: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 2,
  },
  cameraContainer: {
    height: Dimensions.get("window").height / 2,
    width: "100%",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.3,
  },
  video: {
    width: "100%",
    height: Dimensions.get("window").height / 2,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  errorCard: {
    margin: 20,
  },
  errorContent: {
    alignItems: "center",
    padding: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
  },
  separator: {
    height: 2,
    backgroundColor: "black",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenVideo: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  exitButton: {
    position: "absolute",
    left: 20,
    zIndex: 1,
  },
  formatSwitchContainer: {
    position: "absolute",
    right: 10,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  formatLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginHorizontal: 4,
  },
});

export default CamerasScreen;
