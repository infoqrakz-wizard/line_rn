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
import { Button, Card, Icon } from "react-native-paper";
import { useServerStore } from "../store/serverStore";
import {
  fetchCameraList,
  Camera,
  buildStreamingUrl,
  buildImageUrl,
  buildArchiveStreamingUrl,
} from "../utils/cameraApi";
import Timeline from "../components/Timeline";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";

const MAX_RETRY_ATTEMPTS = 3;

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
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(
    new Map()
  );
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    Dimensions.get("window").height > Dimensions.get("window").width
  );
  const [zoomContainerSize, setZoomContainerSize] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const [isScrolling, setIsScrolling] = useState(false);
  const [shouldShowVideos, setShouldShowVideos] = useState(true);
  const lastScrollTime = useRef(Date.now());
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  // Anchor time for archive playback start (used to derive current playback time without remounting video)
  const archiveStartTimeRef = useRef<Date | null>(null);

  const [timelineRange, setTimelineRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const ITEM_HEIGHT = isPortrait
    ? (Dimensions.get("screen").height - bottom - top) / 2
    : Dimensions.get("screen").height - bottom - top;

  const server = useServerStore((state) => state.getServer(serverId));

  const saveLastUsedServer = useServerStore(
    (state) => state.saveLastUsedServer
  );

  const groupedCameras = React.useMemo(() => {
    if (isPortrait) {
      return cameras.map((camera, index) => ({
        cameras: [camera],
        rowIndex: index,
      }));
    } else {
      const groups = [];
      for (let i = 0; i < cameras.length; i += 2) {
        const camerasInRow = cameras.slice(i, i + 2);
        groups.push({ cameras: camerasInRow, rowIndex: Math.floor(i / 2) });
      }
      return groups;
    }
  }, [cameras, isPortrait]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsPortrait(window.height > window.width);
      setZoomContainerSize({
        width: window.width,
        height: window.height,
      });
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
          saveLastUsedServer(serverId);
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

  const retryVideo = useCallback((cameraUri: string) => {
    setVideoErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(cameraUri);
      return newMap;
    });
  }, []);

  const manualRetryVideo = useCallback((cameraUri: string) => {
    setVideoErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(cameraUri);
      return newMap;
    });

    setRetryAttempts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(cameraUri);
      return newMap;
    });
  }, []);

  const handleVideoLoad = useCallback((cameraUri: string) => {
    setRetryAttempts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(cameraUri);
      return newMap;
    });
  }, []);

  const handleVideoError = useCallback(
    (cameraUri: string) => {
      setRetryAttempts((prev) => {
        const currentAttempts = prev.get(cameraUri) || 0;
        const newAttempts = currentAttempts + 1;

        if (newAttempts <= MAX_RETRY_ATTEMPTS) {
          const newMap = new Map(prev);
          newMap.set(cameraUri, newAttempts);

          setTimeout(() => {
            retryVideo(cameraUri);
          }, 1000 * newAttempts);

          return newMap;
        } else {
          setVideoErrors((prevErrors) => {
            const newErrorMap = new Map(prevErrors);
            newErrorMap.set(cameraUri, true);
            return newErrorMap;
          });

          return prev;
        }
      });
    },
    [retryVideo]
  );

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
          const group = item.item as { cameras: Camera[]; rowIndex: number };
          group.cameras.forEach((camera) => {
            allVisibleCameras.add(camera.uri);
          });
        });

      if (shouldShowVideos && !isScrolling) {
        const visibleGroupIndices = viewableItems
          .filter((item) => item.isViewable)
          .map((item) => item.index!)
          .filter((index) => index !== null);

        const cameraIndicesToLoad = new Set<number>();

        visibleGroupIndices.forEach((index) => {
          cameraIndicesToLoad.add(index);
        });

        const camerasToPlay = new Set<string>();
        Array.from(cameraIndicesToLoad).forEach((groupIndex) => {
          if (groupedCameras[groupIndex]) {
            groupedCameras[groupIndex].cameras.forEach((camera) => {
              camerasToPlay.add(camera.uri);
            });
          }
        });
      }
    },
    [shouldShowVideos, isScrolling, groupedCameras]
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
    setIsLiveMode(true);
  };

  const handleTimeSelect = useCallback((timestamp: Date) => {
    // When user selects a new time, set anchor and switch to archive mode
    archiveStartTimeRef.current = timestamp;
    setSelectedTime(timestamp);
    setIsLiveMode(false);
  }, []);

  const handleLivePress = useCallback(() => {
    setIsLiveMode(true);
    const now = new Date();
    archiveStartTimeRef.current = now;
    setSelectedTime(now);
  }, []);

  const handleTimeRangeChange = useCallback(
    (startTime: Date, endTime: Date) => {
      setTimelineRange({ start: startTime, end: endTime });
    },
    []
  );

  const getVideoUrl = useCallback(
    (camera: Camera, isMain: boolean = true) => {
      if (isLiveMode) {
        return buildStreamingUrl(server!, camera, isMain);
      } else {
        return buildArchiveStreamingUrl(server!, camera, selectedTime, isMain);
      }
    },
    [server, isLiveMode, selectedTime]
  );

  const renderSingleCamera = (camera: Camera, containerStyle?: any) => {
    return (
      <View style={[styles.cameraContainer, containerStyle]}>
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
          <Pressable
            onPress={() => {
              if (!retryAttempts.get(camera.uri)) {
                openFullscreen(camera);
              }
            }}
          >
            <Video
              key={`${camera.uri}-${retryAttempts.get(camera.uri) || 0}`}
              source={{ uri: buildStreamingUrl(server!, camera) }}
              style={[styles.video]}
              shouldPlay={true}
              isLooping
              isMuted
              resizeMode={ResizeMode.STRETCH}
              onError={() => handleVideoError(camera.uri)}
              onReadyForDisplay={() => handleVideoLoad(camera.uri)}
            />
          </Pressable>
        )}

        {!videoErrors.get(camera.uri) &&
          retryAttempts.get(camera.uri) &&
          retryAttempts.get(camera.uri)! > 0 && (
            <View style={styles.retryIndicator}>
              <Text style={styles.retryText}>
                Попытка {retryAttempts.get(camera.uri)}/{MAX_RETRY_ATTEMPTS}
              </Text>
            </View>
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
                  onPress={() => manualRetryVideo(camera.uri)}
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

  const renderCameraRow = ({
    item,
    index,
  }: {
    item: { cameras: Camera[]; rowIndex: number };
    index: number;
  }) => {
    const { cameras: camerasInRow } = item;

    if (isPortrait) {
      return renderSingleCamera(camerasInRow[0], { height: ITEM_HEIGHT });
    } else {
      return (
        <View style={[styles.rowContainer, { height: ITEM_HEIGHT }]}>
          {camerasInRow[0] &&
            renderSingleCamera(
              camerasInRow[0],
              styles.cameraContainerLandscape
            )}
          {camerasInRow[1] &&
            renderSingleCamera(
              camerasInRow[1],
              styles.cameraContainerLandscape
            )}
        </View>
      );
    }
  };

  const keyExtractor = (item: { cameras: Camera[]; rowIndex: number }) =>
    `row-${item.rowIndex}-${item.cameras.map((c) => c.uri).join("-")}`;

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

  if (groupedCameras.length === 0) {
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

        {!isModalVisible && (
          <Pressable
            style={[
              styles.exitButton,
              { top: Platform.OS === "ios" ? top : top + 10 },
            ]}
            onPress={navigation.goBack}
          >
            <Icon source="arrow-left" size={24} color="white" />
          </Pressable>
        )}

        <FlatList
          data={groupedCameras}
          keyExtractor={keyExtractor}
          renderItem={renderCameraRow}
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
          snapToOffsets={groupedCameras.map((_, index) => index * ITEM_HEIGHT)}
        />
      </SafeAreaView>

      <Modal
        visible={Boolean(isModalVisible && selectedCamera)}
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
        presentationStyle="fullScreen"
      >
        <View style={[styles.cameraContainer, { height: ITEM_HEIGHT }]}>
          <StatusBar hidden />

          <Pressable
            style={[
              styles.exitButton,
              { top: Platform.OS === "ios" ? top : top + 10 },
            ]}
            onPress={closeFullscreen}
          >
            <Icon source="arrow-left" size={24} color="white" />
          </Pressable>

          {selectedCamera && (
            <View
              style={[
                styles.modalContent,
                isPortrait ? styles.modalContentPortrait : styles.modalContentLandscape,
              ]}
            >
              <View style={isPortrait ? { flex: 1 } : styles.videoPaneLandscape}>
                <ReactNativeZoomableView
                  maxZoom={3}
                  minZoom={1}
                  zoomStep={0.25}
                  initialZoom={1}
                  bindToBorders={true}
                  style={styles.zoomContainer}
                >
                  <Video
                    key={`fullscreen-${selectedCamera.uri}-${retryAttempts.get(selectedCamera.uri) || 0}-${isLiveMode ? "live" : "archive"}`}
                    source={{
                      uri: getVideoUrl(selectedCamera, true),
                    }}
                    style={[styles.video]}
                    shouldPlay
                    isLooping={isLiveMode}
                    isMuted
                    resizeMode={ResizeMode.COVER}
                    onPlaybackStatusUpdate={(status) => {
                      // Derive current archive playback time to drive the timeline
                      if (!isLiveMode && status && (status as any).isLoaded) {
                        const s: any = status;
                        if (typeof s.positionMillis === 'number' && archiveStartTimeRef.current) {
                          const currentTs = new Date(archiveStartTimeRef.current.getTime() + s.positionMillis);
                          setSelectedTime(currentTs);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.log(
                        `Video error in ${isLiveMode ? "live" : "archive"} mode:`,
                        error
                      );
                      if (!isLiveMode) {
                        handleLivePress();
                      } else {
                        handleVideoError(selectedCamera.uri);
                      }
                    }}
                    onReadyForDisplay={() => handleVideoLoad(selectedCamera.uri)}
                  />
                </ReactNativeZoomableView>
              </View>

              <View style={isPortrait ? styles.timelineWrapper : styles.timelineWrapperLandscape}>
                <Timeline
                  camera={selectedCamera}
                  server={server!}
                  onTimeSelect={handleTimeSelect}
                  onLivePress={handleLivePress}
                  currentTime={selectedTime}
                  isLive={isLiveMode}
                  isVisible={isModalVisible}
                  onTimeRangeChange={handleTimeRangeChange}
                  orientation={isPortrait ? "horizontal" : "vertical"}
                />
              </View>
            </View>
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
  rowContainer: {
    flexDirection: "row",
    width: "100%",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height: "100%",
    backgroundColor: "#333333",
  },
  cameraContainerLandscape: {
    width: "50%",
    margin: 0,
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
    // justifyContent: "center",
    // alignItems: "center",
  },
  zoomContainer: {
    flex: 1,
  },
  fullscreenVideo: {
    width: "100%",
    minHeight: 100,
    marginTop: 120,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
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
  retryIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  retryText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  timelineWrapper: {
    flex: 1,
    zIndex: 2,
  },
  modalContent: {
    flex: 1,
  },
  modalContentPortrait: {
    flexDirection: "column",
  },
  modalContentLandscape: {
    flexDirection: "row",
  },
  videoPaneLandscape: {
    flex: 1,
  },
  timelineWrapperLandscape: {
    width: 120,
    zIndex: 2,
  },
});

export default CamerasScreen;
