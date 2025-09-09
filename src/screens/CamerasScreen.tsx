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
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import CachedImage from "expo-cached-image";
import { Button, Card, Icon, useTheme } from "react-native-paper";
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
import { GridCameraIcon, GridPhotoIcon } from "../icons";

const MAX_RETRY_ATTEMPTS = 3;

type CamerasScreenRouteProp = RouteProp<RootStackParamList, "Cameras">;

const CamerasScreen = () => {
  const route = useRoute<CamerasScreenRouteProp>();
  const { serverId } = route.params;
  const navigation = useNavigation();
  const { top, bottom } = useSafeAreaInsets();
  const theme = useTheme();

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

  const [timelineRange, setTimelineRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const [viewMode, setViewMode] = useState<1 | 2>(1);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [previousImageRefreshKey, setPreviousImageRefreshKey] = useState(0);
  const imageRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  const ITEM_HEIGHT = React.useMemo(() => {
    if (viewMode === 2) {
      return isPortrait
        ? (Dimensions.get("screen").height - bottom - top) / 4
        : (Dimensions.get("screen").height - bottom - top) / 2;
    } else {
      return isPortrait
        ? (Dimensions.get("screen").height - bottom - top) / 2
        : Dimensions.get("screen").height - bottom - top;
    }
  }, [isPortrait, viewMode, bottom, top]);

  const server = useServerStore((state) => state.getServer(serverId));

  const saveLastUsedServer = useServerStore(
    (state) => state.saveLastUsedServer
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 1 ? 2 : 1));
  }, []);

  const refreshImages = useCallback(() => {
    setImageRefreshKey((prev) => {
      setPreviousImageRefreshKey(prev);
      return prev + 1;
    });
  }, []);

  const handlePanGesture = useCallback(
    (event: any) => {
      const { translationX, translationY, x, state } = event.nativeEvent;
      const screenWidth = Dimensions.get("window").width;
      const isRightHalf = x > screenWidth * 0.5;
      const isLeftHalf = x < screenWidth * 0.5;

      const isHorizontalGesture =
        Math.abs(translationX) > Math.abs(translationY);

      if (state === 5 && isHorizontalGesture) {
        if (isRightHalf) {
          if (translationX > 50 && viewMode === 1) {
            toggleViewMode();
          } else if (translationX < -50 && viewMode === 2) {
            toggleViewMode();
          }
        } else if (isLeftHalf && translationX > 50) {
          navigation.goBack();
        }
      }
    },
    [toggleViewMode, viewMode, navigation]
  );

  const groupedCameras = React.useMemo(() => {
    if (viewMode === 2) {
      const displayedCameras = cameras.slice(0, 8);
      if (isPortrait) {
        const groups = [];
        for (let i = 0; i < displayedCameras.length; i += 2) {
          const camerasInRow = displayedCameras.slice(i, i + 2);
          groups.push({ cameras: camerasInRow, rowIndex: Math.floor(i / 2) });
        }
        return groups;
      } else {
        const groups = [];
        for (let i = 0; i < displayedCameras.length; i += 4) {
          const camerasInRow = displayedCameras.slice(i, i + 4);
          groups.push({ cameras: camerasInRow, rowIndex: Math.floor(i / 4) });
        }
        return groups;
      }
    } else {
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
    }
  }, [cameras, isPortrait, viewMode]);

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
    if (viewMode === 2) {
      imageRefreshTimer.current = setInterval(refreshImages, 5000);
    } else {
      if (imageRefreshTimer.current) {
        clearInterval(imageRefreshTimer.current);
        imageRefreshTimer.current = null;
      }
    }

    return () => {
      if (imageRefreshTimer.current) {
        clearInterval(imageRefreshTimer.current);
      }
    };
  }, [viewMode, refreshImages]);

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
    setSelectedTime(timestamp);
    setIsLiveMode(false);
  }, []);

  const handleLivePress = useCallback(() => {
    setIsLiveMode(true);
    setSelectedTime(new Date());
  }, []);

  const handleTimeRangeChange = useCallback(
    (startTime: Date, endTime: Date) => {
      setTimelineRange({ start: startTime, end: endTime });
    },
    []
  );

  const getCurrentTimelineDate = (): string => {
    if (!timelineRange) return "";

    const visibleDuration =
      timelineRange.end.getTime() - timelineRange.start.getTime();
    const centerTime = new Date(
      (timelineRange.start.getTime() + timelineRange.end.getTime()) / 2
    );
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (visibleDuration <= 24 * 60 * 60 * 1000) {
      if (centerTime.toDateString() === today.toDateString()) {
        return "Сегодня";
      } else if (centerTime.toDateString() === yesterday.toDateString()) {
        return "Вчера";
      } else {
        return centerTime.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
      }
    } else {
      const startDate = timelineRange.start.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
      const endDate = timelineRange.end.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
      return `${startDate} - ${endDate}`;
    }
  };

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
    const isGridMode = viewMode === 2;

    return (
      <View
        style={[
          isGridMode ? styles.cameraContainerGrid : styles.cameraContainer,
          containerStyle,
        ]}
      >
        <CachedImage
          key={`${imageRefreshKey}`}
          source={{
            uri: buildImageUrl(server!, camera),
            expiresIn: isGridMode ? 10 : 600,
          }}
          cacheKey={`camera-${camera.uri}-${camera.name}-${imageRefreshKey}`}
          style={styles.backgroundImage}
          resizeMode="stretch"
          placeholderContent={
            previousImageRefreshKey >= 0 ? (
              <CachedImage
                source={{
                  uri: buildImageUrl(server!, camera),
                  expiresIn: isGridMode ? 60 : 3600,
                }}
                cacheKey={`camera-${camera.uri}-${camera.name}-${previousImageRefreshKey}`}
                style={styles.backgroundImage}
                resizeMode="stretch"
              />
            ) : undefined
          }
        />

        {!isGridMode && shouldShowVideos && !videoErrors.get(camera.uri) && (
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

        {isGridMode && (
          <View style={styles.gridPressable}>
            <View style={styles.gridOverlay}>
              <Text style={styles.gridCameraName} numberOfLines={1}>
                {camera.name}
              </Text>
            </View>
          </View>
        )}

        {!isGridMode &&
          !videoErrors.get(camera.uri) &&
          retryAttempts.get(camera.uri) &&
          retryAttempts.get(camera.uri)! > 0 && (
            <View style={styles.retryIndicator}>
              <Text style={styles.retryText}>
                Попытка {retryAttempts.get(camera.uri)}/{MAX_RETRY_ATTEMPTS}
              </Text>
            </View>
          )}

        {!isGridMode && videoErrors.get(camera.uri) && (
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
    const isGridMode = viewMode === 2;

    if (isPortrait || (isGridMode && camerasInRow.length <= 2)) {
      // Portrait режим или Grid режим с 2 камерами в ряд
      return (
        <View style={[styles.rowContainer, { height: ITEM_HEIGHT }]}>
          {camerasInRow.map((camera, cameraIndex) => (
            <View
              key={camera.uri}
              style={isGridMode ? styles.gridCameraWrapper : { flex: 1 }}
            >
              {renderSingleCamera(
                camera,
                isGridMode
                  ? styles.cameraContainerGrid
                  : camerasInRow.length === 1
                  ? { height: ITEM_HEIGHT }
                  : styles.cameraContainerLandscape
              )}
            </View>
          ))}
        </View>
      );
    } else {
      // Landscape режим с обычными камерами или Grid режим с 4 камерами в ряд
      return (
        <View style={[styles.rowContainer, { height: ITEM_HEIGHT }]}>
          {camerasInRow.map((camera, cameraIndex) => (
            <View
              key={camera.uri}
              style={
                isGridMode
                  ? styles.gridCameraWrapper
                  : styles.cameraContainerLandscape
              }
            >
              {renderSingleCamera(
                camera,
                isGridMode
                  ? styles.cameraContainerGrid
                  : styles.cameraContainerLandscape
              )}
            </View>
          ))}
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler
          onHandlerStateChange={handlePanGesture}
          activeOffsetX={[-30, 30]}
          failOffsetY={[-50, 50]}
        >
          <SafeAreaView style={styles.container}>
            <StatusBar hidden />

            {!isModalVisible && (
              <Pressable
                style={[
                  styles.exitButton,
                  {
                    top: Platform.OS === "ios" ? top : top + 10,
                    backgroundColor: theme.colors.onBackground,
                  },
                ]}
                onPress={navigation.goBack}
              >
                <Icon source="arrow-left" size={24} color="white" />
              </Pressable>
            )}

            {!isModalVisible && (
              <View
                style={[
                  styles.modeIndicator,
                  {
                    top: Platform.OS === "ios" ? top + 40 : top + 50,
                    backgroundColor: theme.colors.onBackground,
                  },
                ]}
              >
                <Text style={styles.modeText}>
                  {viewMode === 1 ? "Видео режим" : "Режим сетки"}
                </Text>
              </View>
            )}

            {!isModalVisible && (
              <View
                style={[
                  styles.modeToggleContainer,
                  {
                    top: Platform.OS === "ios" ? top : top + 10,
                  },
                ]}
              >
                <Pressable
                  style={[
                    styles.modeToggleButton,
                    { backgroundColor: theme.colors.onBackground },
                  ]}
                  onPress={() => setViewMode(1)}
                >
                  <GridCameraIcon
                    fill={viewMode === 1 ? "#CFCFCF" : "#676767"}
                    width={20}
                    height={20}
                  />
                </Pressable>

                <Pressable
                  style={[
                    styles.modeToggleButton,
                    { backgroundColor: theme.colors.onBackground },
                  ]}
                  onPress={() => setViewMode(2)}
                >
                  <GridPhotoIcon
                    fill={viewMode === 2 ? "#CFCFCF" : "#676767"}
                    width={20}
                    height={20}
                  />
                </Pressable>
              </View>
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
              maxToRenderPerBatch={viewMode === 2 ? 4 : 2}
              windowSize={viewMode === 2 ? 2 : 3}
              initialNumToRender={viewMode === 2 ? 4 : 2}
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              pagingEnabled={false}
              snapToAlignment="start"
              snapToOffsets={groupedCameras.map(
                (_, index) => index * ITEM_HEIGHT
              )}
            />
          </SafeAreaView>
        </PanGestureHandler>
      </GestureHandlerRootView>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
        presentationStyle="fullScreen"
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
            <ReactNativeZoomableView
              maxZoom={3}
              minZoom={1}
              zoomStep={0.25}
              initialZoom={1}
              bindToBorders={true}
              style={[
                styles.zoomContainer,
                {
                  width: zoomContainerSize.width,
                  height: zoomContainerSize.height,
                },
              ]}
            >
              <Video
                key={`fullscreen-${selectedCamera.uri}-${
                  retryAttempts.get(selectedCamera.uri) || 0
                }-${isLiveMode ? "live" : selectedTime.getTime()}`}
                source={{
                  uri: getVideoUrl(selectedCamera, true),
                }}
                style={styles.fullscreenVideo}
                shouldPlay
                isLooping={isLiveMode}
                isMuted
                resizeMode={ResizeMode.CONTAIN}
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
          )}

          {selectedCamera && (
            <>
              <View
                style={[
                  styles.dateDisplayOverlay,
                  { top: Platform.OS === "ios" ? top : top + 10 },
                ]}
              >
                <Text style={styles.dateDisplayText}>
                  {getCurrentTimelineDate()}
                </Text>
              </View>

              <View style={styles.timelineWrapper}>
                <Timeline
                  camera={selectedCamera}
                  server={server!}
                  onTimeSelect={handleTimeSelect}
                  onLivePress={handleLivePress}
                  currentTime={selectedTime}
                  isLive={isLiveMode}
                  isVisible={isModalVisible}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              </View>
            </>
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
  },
  cameraContainerLandscape: {
    width: "50%",
    margin: 0,
  },
  cameraContainerGrid: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    margin: 1,
  },
  gridCameraWrapper: {
    flex: 1,
    margin: 1,
  },
  gridPressable: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  gridOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  gridCameraName: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
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
  zoomContainer: {
    flex: 1,
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
    borderRadius: 50,
    padding: 2,
  },
  modeIndicator: {
    position: "absolute",
    left: 20,
    zIndex: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.9,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  dateDisplayOverlay: {
    position: "absolute",
    left: 20,
    zIndex: 3,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateDisplayText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.9,
  },
  modeToggleContainer: {
    position: "absolute",
    right: 20,
    zIndex: 2,
    flexDirection: "row",
    gap: 8,
  },
  modeToggleButton: {
    borderRadius: 8,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CamerasScreen;
