import React, { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar, Dimensions } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { LibVlcPlayerView } from "expo-libvlc-player";
import {
  IconButton,
  Text,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { useRTSPStore } from "../store/rtspStore";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ReactNativeZoomableView } from "@openspacelabs/react-native-zoomable-view";

type RTSPScreenRouteProp = RouteProp<RootStackParamList, "RTSP">;

const RTSPScreen = () => {
  const route = useRoute<RTSPScreenRouteProp>();
  const { rtspServerId } = route.params;
  const navigation = useNavigation();
  const { top, bottom } = useSafeAreaInsets();
  const theme = useTheme();

  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get("screen"));

  const rtspServer = useRTSPStore((state) => state.getRTSPServer(rtspServerId));
  const saveLastUsedRTSPServer = useRTSPStore(
    (state) => state.saveLastUsedRTSPServer
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (rtspServer) {
      saveLastUsedRTSPServer(rtspServerId);
    }
  }, [rtspServer, rtspServerId, saveLastUsedRTSPServer]);

  useEffect(() => {
    // Сбрасываем состояние загрузки при изменении сервера
    setIsLoading(true);
    setVideoError(false);
  }, [rtspServerId]);

  const handlePlayerError = (error: any) => {
    console.error("VLC Player Error:", error);
    setVideoError(true);
    setIsLoading(false);
  };

  const handlePlayerPlaying = () => {
    console.log("VLC Player playing");
    setVideoError(false);
    setIsLoading(false);
  };

  const handlePlayerPaused = () => {
    console.log("VLC Player paused");
  };

  const handlePlayerStopped = () => {
    console.log("VLC Player stopped");
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (!rtspServer) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={[styles.videoContainer, { paddingTop: top }]}>
          <Text
            variant="headlineSmall"
            style={{ color: theme.colors.error, marginBottom: 16 }}
          >
            Сервер не найден
          </Text>
          <IconButton
            icon="arrow-left"
            size={32}
            mode="contained"
            onPress={handleGoBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: top,
            paddingBottom: bottom,
          },
        ]}
      >
        {/* Video Container */}
        <View style={styles.videoContainer}>
          {videoError && (
            <View style={styles.errorOverlay}>
              <Text
                variant="headlineSmall"
                style={[styles.errorTitle, { color: theme.colors.error }]}
              >
                Ошибка воспроизведения
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.errorText, { color: theme.colors.onBackground }]}
              >
                Не удалось загрузить RTSP поток
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.urlText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {rtspServer.rtspUrl}
              </Text>
            </View>
          )}

          {isLoading && !videoError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" animating={true} />
              <Text
                variant="bodyMedium"
                style={[
                  styles.loadingText,
                  { color: theme.colors.onBackground },
                ]}
              >
                Подключение к потоку...
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.urlText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {rtspServer.rtspUrl}
              </Text>
            </View>
          )}
          <ReactNativeZoomableView
            maxZoom={3}
            minZoom={1}
            zoomStep={0.25}
            initialZoom={1}
            bindToBorders={true}
            style={[
              {
                flex: 1,
                width: dimensions.width,
                height: dimensions.height,
              },
            ]}
          >
            <LibVlcPlayerView
              autoplay={true}
              source={rtspServer.rtspUrl}
              options={[
                "--no-audio",
                "--rtsp-tcp",
                "--network-caching=150",
                "--rtsp-caching=150",
                "--no-stats",
                "--tcp-caching=150",
                "--realrtsp-caching=150",
              ]}
              style={[
                {
                  width: dimensions.width,
                  height: dimensions.height - top - bottom,
                },
              ]}
              onPlaying={handlePlayerPlaying}
              onEncounteredError={handlePlayerError}
              onPaused={handlePlayerPaused}
              onStopped={handlePlayerStopped}
            />
          </ReactNativeZoomableView>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    backgroundColor: "#000",
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 32,
    zIndex: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 32,
    zIndex: 5,
  },
  errorTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  urlText: {
    textAlign: "center",
    fontSize: 12,
  },
});

export default RTSPScreen;
