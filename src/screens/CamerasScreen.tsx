import React, { useEffect, useState, useRef, useCallback } from "react";
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
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import CachedImage from "expo-cached-image";
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
  const { top, bottom } = useSafeAreaInsets();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Map<string, boolean>>(
    new Map()
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    Dimensions.get("window").height < Dimensions.get("window").width
  );

  const [isScrolling, setIsScrolling] = useState(false);
  const [shouldShowVideos, setShouldShowVideos] = useState(true);
  const lastScrollTime = useRef(Date.now());
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const ITEM_HEIGHT = (Dimensions.get("screen").height - bottom - top) / 2; // Половина экрана

  const server = useServerStore((state) => state.getServer(serverId));
  const updateStreamFormat = useServerStore(
    (state) => state.updateStreamFormat
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsPortrait(window.height < window.width);
    });

    return () => {
      subscription?.remove();
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
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

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastScrollTime.current;

      if (deltaTime > 16) {
        if (!isScrolling) {
          setIsScrolling(true);
        }

        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
        }

        scrollTimeout.current = setTimeout(() => {
          setIsScrolling(false);
          setShouldShowVideos(true);
        }, 200);

        lastScrollTime.current = currentTime;
      }
    },
    [shouldShowVideos]
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const allVisibleCameras = new Set<string>();
      viewableItems
        .filter((item) => item.isViewable)
        .forEach((item) => {
          const camera = item.item as Camera;
          allVisibleCameras.add(camera.uri);
        });

      if (shouldShowVideos && !isScrolling) {
        const visibleCameraIndices = viewableItems
          .filter((item) => item.isViewable)
          .map((item) => item.index!)
          .filter((index) => index !== null);

        const cameraIndicesToLoad = new Set<number>();

        visibleCameraIndices.forEach((index) => {
          cameraIndicesToLoad.add(index);
        });

        const camerasToPlay = new Set<string>();
        Array.from(cameraIndicesToLoad).forEach((cameraIndex) => {
          if (cameras[cameraIndex]) {
            camerasToPlay.add(cameras[cameraIndex].uri);
          }
        });
      }
    },
    [shouldShowVideos, isScrolling, cameras]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 50,
    waitForInteraction: false,
  });

  const onViewableItemsChangedRef = useRef(onViewableItemsChanged);
  onViewableItemsChangedRef.current = onViewableItemsChanged;

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
    console.log(camera);
    return (
      <View
        style={[
          styles.cameraContainer,
          { height: ITEM_HEIGHT },
          isPortrait && styles.cameraContainerPortrait,
        ]}
      >
        <CachedImage
          source={{
            uri: buildImageUrl(server!, camera),
            expiresIn: 600,
          }}
          cacheKey={`camera-${camera.uri}-${camera.name}`}
          style={styles.backgroundImage}
          resizeMode="stretch"
        />

        {shouldShowVideos && !videoErrors.get(camera.uri) && (
          <Pressable onPress={() => openFullscreen(camera)}>
            <Video
              source={{ uri: buildStreamingUrl(server!, camera) }}
              style={[styles.video]}
              shouldPlay={true}
              isLooping
              isMuted
              resizeMode={ResizeMode.STRETCH}
              onError={() => handleVideoError(camera.uri)}
            />
          </Pressable>
        )}

        {videoErrors.get(camera.uri) && (
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
          keyExtractor={keyExtractor}
          renderItem={renderCameraItem}
          decelerationRate={0.95}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfig.current}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          maxToRenderPerBatch={2}
          windowSize={3}
          initialNumToRender={2}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          pagingEnabled={false}
          snapToAlignment="start"
          snapToOffsets={cameras.map((_, index) => index * ITEM_HEIGHT)}
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
  groupContainer: {
    flex: 1,
  },
  groupContainerPortrait: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  cameraContainerPortrait: {
    width: "50%",
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  scrollHint: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
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
