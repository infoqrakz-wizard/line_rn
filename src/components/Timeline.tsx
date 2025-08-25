import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Pressable,
  GestureResponderEvent,
} from "react-native";
import { Button, ActivityIndicator, IconButton } from "react-native-paper";
import {
  fetchArchiveTimeline,
  getTimelineRequest,
  getServerTime,
  Camera,
  TimelineResponse,
  TimeRange,
  TIMELINE_INTERVALS,
  UNIT_LENGTHS,
} from "../utils/cameraApi";
import { Server } from "../store/serverStore";

interface TimelineProps {
  camera: Camera;
  server: Server;
  onTimeSelect: (timestamp: Date) => void;
  onLivePress: () => void;
  currentTime?: Date;
  isLive: boolean;
  isVisible: boolean;
  onTimeRangeChange?: (startTime: Date, endTime: Date) => void;
}

const TIMELINE_HEIGHT = 100;
const BUFFER_MULTIPLIER = 2;

const INTERVAL_NAMES = [
  "5 мин",
  "10 мин",
  "15 мин",
  "30 мин",
  "1 час",
  "4 часа",
  "6 часов",
  "1 день",
];

export const Timeline: React.FC<TimelineProps> = ({
  camera,
  server,
  onTimeSelect,
  onLivePress,
  currentTime = new Date(),
  isLive,
  isVisible,
  onTimeRangeChange,
}) => {
  const [timelineData, setTimelineData] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serverTime, setServerTime] = useState<Date | null>(null);

  const [intervalIndex, setIntervalIndex] = useState(4);

  const [visibleTimeRange, setVisibleTimeRange] = useState<TimeRange | null>(
    null
  );

  const [bufferedTimeRange, setBufferedTimeRange] = useState<TimeRange | null>(
    null
  );

  const [currentTimeIndicator, setCurrentTimeIndicator] = useState(
    () => new Date()
  );

  // Динамически получаем ширину экрана
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);

  // Отслеживаем изменения размеров экрана
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const initializeTimeline = useCallback(async () => {
    if (!isVisible || serverTime) return;

    try {
      setLoading(true);
      const time = await getServerTime(server);
      setServerTime(time);

      const currentInterval = TIMELINE_INTERVALS[intervalIndex];
      const halfInterval = currentInterval / 2;
      const start = new Date(time.getTime() - halfInterval);
      const end = new Date(time.getTime() + halfInterval);

      setVisibleTimeRange({ start, end });
    } catch (err) {
      console.error("Ошибка инициализации таймлайна:", err);
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  }, [isVisible, serverTime, server, intervalIndex]);

  const loadTimeline = useCallback(
    async (
      startTime: Date,
      endTime: Date,
      zoomIndex: number = intervalIndex
    ) => {
      if (!isVisible) return;

      if (bufferedTimeRange) {
        const screenDuration = endTime.getTime() - startTime.getTime();
        const bufferStart = new Date(
          startTime.getTime() - screenDuration * BUFFER_MULTIPLIER
        );
        const bufferEnd = new Date(
          endTime.getTime() + screenDuration * BUFFER_MULTIPLIER
        );

        if (
          bufferedTimeRange.start <= bufferStart &&
          bufferedTimeRange.end >= bufferEnd
        ) {
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const screenDuration = endTime.getTime() - startTime.getTime();
        const bufferStart = new Date(
          startTime.getTime() - screenDuration * BUFFER_MULTIPLIER
        );
        const bufferEnd = new Date(
          endTime.getTime() + screenDuration * BUFFER_MULTIPLIER
        );

        const request = getTimelineRequest(
          camera,
          bufferStart,
          bufferEnd,
          UNIT_LENGTHS[zoomIndex],
          "video"
        );

        const response: TimelineResponse = await fetchArchiveTimeline(
          server,
          request
        );

        if (response.success) {
          setTimelineData(response.timeline);
          setBufferedTimeRange({ start: bufferStart, end: bufferEnd });
        } else {
          if (response.error?.includes("не поддерживает функцию таймлайна")) {
            setError(
              "Архив недоступен на этом сервере. Доступен только просмотр LIVE."
            );
          } else if (response.error?.includes("не имеет доступа к архиву")) {
            setError(
              "Недостаточно прав для просмотра архива. Доступен только LIVE режим."
            );
          } else {
            setError(response.error || "Ошибка загрузки таймлайна");
          }
          setTimelineData([]);
        }
      } catch (err) {
        console.error("Ошибка загрузки таймлайна:", err);
        setError("Ошибка подключения к серверу");
        setTimelineData([]);
      } finally {
        setLoading(false);
      }
    },
    [camera, server, isVisible, intervalIndex, bufferedTimeRange]
  );

  useEffect(() => {
    initializeTimeline();
  }, [initializeTimeline]);

  useEffect(() => {
    if (visibleTimeRange) {
      loadTimeline(visibleTimeRange.start, visibleTimeRange.end, intervalIndex);
      onTimeRangeChange?.(visibleTimeRange.start, visibleTimeRange.end);
    }
  }, [visibleTimeRange, intervalIndex, loadTimeline, onTimeRangeChange]);

  useEffect(() => {
    if (isLive) {
      setCurrentTimeIndicator(serverTime || new Date());
    } else {
      setCurrentTimeIndicator(currentTime);
    }
  }, [isLive, serverTime, currentTime]);

  useEffect(() => {
    if (!isLive || !isVisible) return;

    const interval = setInterval(async () => {
      try {
        const newTime = await getServerTime(server);
        setServerTime(newTime);
        setCurrentTimeIndicator(newTime);
      } catch (err) {
        setCurrentTimeIndicator(new Date());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, isVisible, server]);

  const handleTimelineTap = useCallback(
    (event: GestureResponderEvent) => {
      if (
        error?.includes("не может просматривать архив") ||
        error?.includes("недоступен на этом сервере") ||
        error?.includes("Доступен только просмотр LIVE") ||
        error?.includes("Доступен только LIVE режим") ||
        !visibleTimeRange
      ) {
        return;
      }

              const tapX = event.nativeEvent.locationX;
        const containerWidth = screenWidth - 20;

      const visibleDuration =
        visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();
      const timeOffset = (tapX / containerWidth) * visibleDuration;
      const selectedTime = new Date(
        visibleTimeRange.start.getTime() + timeOffset
      );

              onTimeSelect(selectedTime);
      },
      [onTimeSelect, error, visibleTimeRange, screenWidth]
  );

  const renderTimelineBlocks = () => {
    if (!visibleTimeRange || !bufferedTimeRange || timelineData.length === 0) {
      return null;
    }

    const blocks = [];
    const containerWidth = screenWidth - 20;

    const totalFragments = timelineData.length;
    const blockWidth = containerWidth / totalFragments;

    const bufferedDuration =
      bufferedTimeRange.end.getTime() - bufferedTimeRange.start.getTime();
    const visibleDuration =
      visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();

    const startOffset =
      (visibleTimeRange.start.getTime() - bufferedTimeRange.start.getTime()) /
      bufferedDuration;
    const endOffset =
      (visibleTimeRange.end.getTime() - bufferedTimeRange.start.getTime()) /
      bufferedDuration;

    const startIndex = Math.max(0, Math.floor(startOffset * totalFragments));
    const endIndex = Math.min(
      totalFragments - 1,
      Math.ceil(endOffset * totalFragments)
    );

    for (let i = startIndex; i <= endIndex; i++) {
      const hasArchive = timelineData[i] === 1;
      const blockLeft =
        ((i - startIndex) / (endIndex - startIndex + 1)) * containerWidth;

      blocks.push(
        <View
          key={i}
          style={[
            styles.timelineBlock,
            {
              position: "absolute",
              left: blockLeft,
              width: Math.max(1, blockWidth),
              backgroundColor: hasArchive
                ? "#4CAF50"
                : "rgba(255, 255, 255, 0.1)",
            },
          ]}
        />
      );
    }

    return blocks;
  };

  const renderTimeLabels = () => {
    if (!visibleTimeRange) return null;

    const labels = [];
    const containerWidth = screenWidth - 20;
    const visibleDuration =
      visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();

    let labelInterval: number;
    if (visibleDuration <= 5 * 60 * 1000) {
      labelInterval = 1 * 60 * 1000; // каждую минуту
    } else if (visibleDuration <= 30 * 60 * 1000) {
      labelInterval = 5 * 60 * 1000; // каждые 5 минут
    } else if (visibleDuration <= 2 * 60 * 60 * 1000) {
      labelInterval = 15 * 60 * 1000; // каждые 15 минут
    } else if (visibleDuration <= 12 * 60 * 60 * 1000) {
      labelInterval = 60 * 60 * 1000; // каждый час
    } else {
      labelInterval = 4 * 60 * 60 * 1000; // каждые 4 часа
    }

    const startTime = visibleTimeRange.start.getTime();
    const firstLabelTime = Math.ceil(startTime / labelInterval) * labelInterval;

    for (
      let time = firstLabelTime;
      time <= visibleTimeRange.end.getTime();
      time += labelInterval
    ) {
      const labelDate = new Date(time);
      const position = ((time - startTime) / visibleDuration) * containerWidth;

      const timeString = labelDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const dateString = labelDate.toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
      });

      const isMainLabel = labelInterval >= 60 * 60 * 1000;

      labels.push(
        <View key={time} style={[styles.timeLabel, { left: position - 20 }]}>
          <Text
            style={
              isMainLabel ? styles.timeLabelText : styles.timeLabelTextSmall
            }
          >
            {timeString}
          </Text>
          {visibleDuration >= 24 * 60 * 60 * 1000 && (
            <Text style={styles.dateLabelText}>{dateString}</Text>
          )}
          <View
            style={[
              styles.timeTick,
              isMainLabel ? styles.mainTick : styles.subTick,
            ]}
          />
        </View>
      );
    }
    return labels;
  };

  const renderCurrentTimeIndicator = () => {
    if (!visibleTimeRange) return null;

    const now = isLive ? currentTimeIndicator : currentTime;
    const containerWidth = screenWidth - 20;
    const visibleDuration =
      visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();

    const nowTime = now.getTime();
    if (
      nowTime < visibleTimeRange.start.getTime() ||
      nowTime > visibleTimeRange.end.getTime()
    ) {
      return null;
    }

    const timeOffset = nowTime - visibleTimeRange.start.getTime();
    const leftPosition = (timeOffset / visibleDuration) * containerWidth;

    return (
      <View style={[styles.currentTimeIndicator, { left: leftPosition }]}>
        <View style={styles.currentTimeLine} />
        <View style={styles.currentTimeCircle} />
        {!isLive && (
          <Text style={styles.selectedTimeLabel}>
            {now.getHours().toString().padStart(2, "0")}:
            {now.getMinutes().toString().padStart(2, "0")}
          </Text>
        )}
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  const isArchiveRestricted =
    error?.includes("Доступен только просмотр LIVE") ||
    error?.includes("Доступен только LIVE режим") ||
    error?.includes("не может просматривать архив") ||
    error?.includes("недоступен на этом сервере");

  const goToPreviousInterval = useCallback(() => {
    if (!visibleTimeRange || !serverTime) return;

    const currentInterval = TIMELINE_INTERVALS[intervalIndex];
    const newStart = new Date(
      visibleTimeRange.start.getTime() - currentInterval
    );
    const newEnd = new Date(visibleTimeRange.end.getTime() - currentInterval);

    setVisibleTimeRange({ start: newStart, end: newEnd });
    setBufferedTimeRange(null);
  }, [visibleTimeRange, serverTime, intervalIndex]);

  const goToNextInterval = useCallback(() => {
    if (!visibleTimeRange || !serverTime) return;

    const currentInterval = TIMELINE_INTERVALS[intervalIndex];
    const newStart = new Date(
      visibleTimeRange.start.getTime() + currentInterval
    );
    const newEnd = new Date(visibleTimeRange.end.getTime() + currentInterval);

    setVisibleTimeRange({ start: newStart, end: newEnd });
    setBufferedTimeRange(null);
  }, [visibleTimeRange, serverTime, intervalIndex]);

  const centerOnCurrentTime = useCallback(() => {
    if (!serverTime) return;

    const currentInterval = TIMELINE_INTERVALS[intervalIndex];
    const halfInterval = currentInterval / 2;
    const currentDateTime = isLive ? serverTime : currentTime;
    const start = new Date(currentDateTime.getTime() - halfInterval);
    const end = new Date(currentDateTime.getTime() + halfInterval);

    setVisibleTimeRange({ start, end });
    setBufferedTimeRange(null);
  }, [serverTime, intervalIndex, isLive, currentTime]);

  const changeZoomLevel = useCallback(
    (newIndex: number) => {
      if (
        newIndex < 0 ||
        newIndex >= TIMELINE_INTERVALS.length ||
        !visibleTimeRange ||
        !serverTime
      )
        return;

      const centerTime = new Date(
        (visibleTimeRange.start.getTime() + visibleTimeRange.end.getTime()) / 2
      );

      const newInterval = TIMELINE_INTERVALS[newIndex];
      const halfInterval = newInterval / 2;
      const start = new Date(centerTime.getTime() - halfInterval);
      const end = new Date(centerTime.getTime() + halfInterval);

      setIntervalIndex(newIndex);
      setVisibleTimeRange({ start, end });
      setBufferedTimeRange(null);
    },
    [visibleTimeRange, serverTime]
  );

  return (
    <View style={styles.container}>

      <View style={styles.topControls}>
        <Pressable
          style={[styles.liveButton, isLive && styles.liveButtonActive]}
          onPress={() => {
            onLivePress();
          }}
        >
          <Text
            style={[
              styles.liveButtonText,
              isLive && styles.liveButtonTextActive,
            ]}
          >
            LIVE
          </Text>
        </Pressable>

        <View style={styles.zoomControls}>
          <IconButton
            icon="minus"
            size={14}
            iconColor="white"
            onPress={() =>
              changeZoomLevel(
                Math.min(TIMELINE_INTERVALS.length - 1, intervalIndex + 1)
              )
            }
            disabled={intervalIndex >= TIMELINE_INTERVALS.length - 1}
          />
          <Text style={styles.zoomLabel}>
            {INTERVAL_NAMES[intervalIndex]}
          </Text>
          <IconButton
            icon="plus"
            size={14}
            iconColor="white"
            onPress={() => changeZoomLevel(Math.max(0, intervalIndex - 1))}
            disabled={intervalIndex <= 0}
          />
        </View>

        <View style={styles.navigationControls}>
          <IconButton
            icon="chevron-left"
            size={14}
            iconColor="white"
            onPress={goToPreviousInterval}
          />
          <IconButton
            icon="crosshairs-gps"
            size={14}
            iconColor={isLive ? "#FF5722" : "white"}
            onPress={centerOnCurrentTime}
          />
          <IconButton
            icon="chevron-right"
            size={14}
            iconColor="white"
            onPress={goToNextInterval}
          />
        </View>

        {isArchiveRestricted && !isLive && (
          <View style={styles.restrictionIndicator}>
            <Text style={styles.restrictionText}>🔒</Text>
          </View>
        )}
      </View>

      <View style={styles.timelineContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Загрузка...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={() =>
                visibleTimeRange &&
                loadTimeline(visibleTimeRange.start, visibleTimeRange.end)
              }
              style={styles.retryButton}
              labelStyle={styles.retryButtonText}
            >
              Повторить
            </Button>
          </View>
        ) : visibleTimeRange ? (
          <Pressable
            style={[
              styles.timelineContent,
              isArchiveRestricted && styles.timelineDisabled,
            ]}
            onPress={handleTimelineTap}
            disabled={isArchiveRestricted}
          >
            {renderTimeLabels()}

            <View style={styles.timelineBlocksContainer}>
              {renderTimelineBlocks()}
            </View>

            {renderCurrentTimeIndicator()}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: TIMELINE_HEIGHT,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    flexDirection: "column",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  liveButton: {
    width: 42,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 13,
    paddingHorizontal: 3,
  },
  zoomLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
    paddingHorizontal: 3,
    maxWidth: 50,
    textAlign: "center",
  },
  navigationControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 13,
    marginLeft: 5,
  },

  liveButtonActive: {
    backgroundColor: "#FF5722",
  },
  liveButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  liveButtonTextActive: {
    color: "white",
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 5,
    minHeight: 60,
  },
  timelineContent: {
    flex: 1,
    position: "relative",
    minHeight: 60,
  },
  timelineDisabled: {
    opacity: 0.5,
  },
  dateLabelText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 8,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginLeft: 10,
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  errorText: {
    color: "#FF5722",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: {
    height: 30,
  },
  retryButtonText: {
    fontSize: 10,
  },
  timelineBlocksContainer: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    height: 20,
  },
  timelineBlock: {
    height: 20,
    borderRadius: 1,
  },
  timeLabel: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },
  timeLabelText: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
  },
  timeLabelTextSmall: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 8,
    fontWeight: "400",
  },
  timeTick: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  mainTick: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  subTick: {
    width: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginTop: 2,
  },
  currentTimeIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  currentTimeLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#FF5722",
    position: "absolute",
  },
  currentTimeCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5722",
    position: "absolute",
    top: 15,
  },
  selectedTimeLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    position: "absolute",
    top: -25,
    minWidth: 35,
    textAlign: "center",
  },
  restrictionIndicator: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 3,
  },
  restrictionText: {
    fontSize: 14,
  },
  clickIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  clickLine: {
    width: 3,
    height: "100%",
    backgroundColor: "#FF9800",
    position: "absolute",
  },
  clickCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF9800",
    position: "absolute",
    top: 15,
  },
  clickTimeLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#FF9800",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    position: "absolute",
    top: -25,
    minWidth: 35,
    textAlign: "center",
  },
  debugContainer: {
    position: "absolute",
    bottom: -20,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 5,
    borderRadius: 3,
  },
  debugText: {
    color: "#FF9800",
    fontSize: 10,
    textAlign: "center",
  },
});

export default Timeline;
