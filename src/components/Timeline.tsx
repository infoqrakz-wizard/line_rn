import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Pressable,
  GestureResponderEvent,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Button } from "react-native-paper";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
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
  orientation?: "horizontal" | "vertical";
}

const BUFFER_MULTIPLIER = 2;
const VERTICAL_BLOCK_WIDTH = 56;

export const Timeline: React.FC<TimelineProps> = ({
  camera,
  server,
  onTimeSelect,
  onLivePress,
  currentTime = new Date(),
  isLive,
  isVisible,
  onTimeRangeChange,
  orientation = "horizontal",
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

  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get("window").width
  );

  const initialWindow = Dimensions.get("window");
  const [timelineHeight, setTimelineHeight] = useState(
    orientation === "vertical"
      ? initialWindow.height
      : 120
  );

  const [isPanning, setIsPanning] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<TimeRange | null>(null);
  const bufferUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
      const isPortrait = window.height >= window.width;
      setTimelineHeight(
        orientation === "vertical"
          ? window.height
          : isPortrait
          ? 200
          : window.height / 2
      );
    });

    return () => {
      subscription?.remove();
      if (bufferUpdateTimeoutRef.current) {
        clearTimeout(bufferUpdateTimeoutRef.current);
      }
    };
  }, [orientation]);

  const isVertical = orientation === "vertical";

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

      if (isLive && bufferedTimeRange) {
        const screenDuration = endTime.getTime() - startTime.getTime();
        const bufferStart = new Date(
          startTime.getTime() - screenDuration * BUFFER_MULTIPLIER
        );
        const bufferEnd = new Date(
          endTime.getTime() + screenDuration * BUFFER_MULTIPLIER
        );

        const overlapStart = Math.max(bufferStart.getTime(), bufferedTimeRange.start.getTime());
        const overlapEnd = Math.min(bufferEnd.getTime(), bufferedTimeRange.end.getTime());
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);
        const newDuration = bufferEnd.getTime() - bufferStart.getTime();

        if (overlapDuration / newDuration > 0.8) {
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
    [camera, server, isVisible, intervalIndex, bufferedTimeRange, isLive]
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

  const lastAutoCenterBucketRef = useRef<number | null>(null);
  const lastInteractionRef = useRef<number>(0);

  useEffect(() => {
    lastAutoCenterBucketRef.current = null;
  }, [intervalIndex, isLive, isVisible]);

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isVisible || !visibleTimeRange || isPanningRef.current) return;

    if (Date.now() - lastInteractionRef.current < 800) return;

    const visibleDuration =
      visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();
    const unitMs = (UNIT_LENGTHS[intervalIndex] ?? 60) * 1000;
    const refTime = isLive ? serverTime?.getTime() : currentTime?.getTime();
    if (!refTime || unitMs <= 0) return;

    const bucket = Math.floor(refTime / unitMs);
    if (lastAutoCenterBucketRef.current === bucket) return;

    const half = visibleDuration / 2;
    const start = new Date(refTime - half);
    const end = new Date(refTime + half);

    setVisibleTimeRange({ start, end });
    
    if (isLive && bufferedTimeRange) {
      const screenDuration = end.getTime() - start.getTime();
      const bufferStart = new Date(
        start.getTime() - screenDuration * BUFFER_MULTIPLIER
      );
      const bufferEnd = new Date(
        end.getTime() + screenDuration * BUFFER_MULTIPLIER
      );
      setBufferedTimeRange({ start: bufferStart, end: bufferEnd });
    }
    
    lastAutoCenterBucketRef.current = bucket;
  }, [isLive, currentTime, serverTime, isVisible, visibleTimeRange, intervalIndex, bufferedTimeRange]);

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

  useEffect(() => {
    if (!isLive || !isVisible || !serverTime || !bufferedTimeRange) return;

    const currentTime = serverTime.getTime();
    const bufferStart = bufferedTimeRange.start.getTime();
    const bufferEnd = bufferedTimeRange.end.getTime();
    
    const bufferDuration = bufferEnd - bufferStart;
    const edgeThreshold = bufferDuration * 0.2;
    
    if (currentTime < bufferStart + edgeThreshold || currentTime > bufferEnd - edgeThreshold) {
      if (visibleTimeRange) {
        loadTimeline(visibleTimeRange.start, visibleTimeRange.end, intervalIndex);
      }
    }
  }, [isLive, isVisible, serverTime, bufferedTimeRange, visibleTimeRange, loadTimeline, intervalIndex]);

  const isArchiveRestricted = Boolean(
    error?.includes("Доступен только просмотр LIVE") ||
    error?.includes("Доступен только LIVE режим") ||
    error?.includes("не может просматривать архив") ||
    error?.includes("недоступен на этом сервере")
  );

  const handleTimelineTap = useCallback(
    (event: GestureResponderEvent) => {
      if (!visibleTimeRange || isArchiveRestricted) return;

      setTimeout(() => {
        if (isPanningRef.current) return;
        lastInteractionRef.current = Date.now();

        const axisLength = isVertical
          ? Math.max(1, contentSize.height)
          : Math.max(1, contentSize.width);
        const tapCoord = isVertical
          ? Math.max(0, event.nativeEvent.locationY)
          : Math.max(0, event.nativeEvent.locationX);

        const visibleDuration =
          visibleTimeRange.end.getTime() - visibleTimeRange.start.getTime();
        const timeOffset = (tapCoord / axisLength) * visibleDuration;
        const selectedTime = new Date(
          visibleTimeRange.start.getTime() + timeOffset
        );

        const halfInterval = visibleDuration / 2;
        const start = new Date(selectedTime.getTime() - halfInterval);
        const end = new Date(selectedTime.getTime() + halfInterval);
        setVisibleTimeRange({ start, end });
        setBufferedTimeRange(null);

        onTimeSelect(selectedTime);
      }, 50);
    },
    [onTimeSelect, visibleTimeRange, screenWidth, isArchiveRestricted, isVertical, contentSize]
  );

  const handleTapFromGesture = useCallback(
    (x: number, y: number) => {
      handleTimelineTap({
        nativeEvent: { locationX: x, locationY: y },
      } as unknown as GestureResponderEvent);
    },
    [handleTimelineTap]
  );

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

  const tapGesture = useMemo(() => {
    const resetPanningJS = () => {
      isPanningRef.current = false;
      setIsPanning(false);
    };

    return Gesture.Tap()
      .runOnJS(true)
      .enabled(true)
      .maxDuration(250)
      .onStart((event) => {
        runOnJS(resetPanningJS)();
        runOnJS(handleTapFromGesture)(event.x, event.y);
      });
  }, [handleTapFromGesture]);

  const onPanStartJS = useCallback(() => {
    if (!visibleTimeRange || !serverTime) return;
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = visibleTimeRange;
    if (bufferUpdateTimeoutRef.current) {
      clearTimeout(bufferUpdateTimeoutRef.current);
    }
  }, [visibleTimeRange, serverTime]);

  const onPanUpdateJS = useCallback(
    (translation: number) => {
      const startRange = panStartRef.current;
      if (!startRange) return;
      const axisLength = isVertical
        ? Math.max(1, contentSize.height)
        : Math.max(1, contentSize.width);
      const visibleDuration =
        startRange.end.getTime() - startRange.start.getTime();
      const timeOffset = (translation / axisLength) * visibleDuration;
      const newStart = new Date(startRange.start.getTime() - timeOffset);
      const newEnd = new Date(startRange.end.getTime() - timeOffset);
      setVisibleTimeRange({ start: newStart, end: newEnd });
    },
    [screenWidth, isVertical, contentSize]
  );

  const onPanEndJS = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
    if (bufferUpdateTimeoutRef.current) {
      clearTimeout(bufferUpdateTimeoutRef.current);
    }
    lastInteractionRef.current = Date.now();
  }, []);

  const onPanFinalizeJS = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
    lastInteractionRef.current = Date.now();
  }, []);

  const timePanGesture = useMemo(() => {
    const pan = Gesture.Pan().runOnJS(true).enabled(!isArchiveRestricted);
    if (isVertical) {
      pan.activeOffsetY([-10, 10]).failOffsetX([-20, 20]);
      pan.onStart(() => runOnJS(onPanStartJS)());
      pan.onUpdate((event) => runOnJS(onPanUpdateJS)(event.translationY));
      pan.onEnd(() => runOnJS(onPanEndJS)());
      pan.onFinalize(() => runOnJS(onPanFinalizeJS)());
    } else {
      pan.activeOffsetX([-10, 10]).failOffsetY([-20, 20]);
      pan.onStart(() => runOnJS(onPanStartJS)());
      pan.onUpdate((event) => runOnJS(onPanUpdateJS)(event.translationX));
      pan.onEnd(() => runOnJS(onPanEndJS)());
      pan.onFinalize(() => runOnJS(onPanFinalizeJS)());
    }
    return pan;
  }, [isArchiveRestricted, isVertical, onPanStartJS, onPanUpdateJS, onPanEndJS, onPanFinalizeJS]);

  const onVerticalPanStartJS = useCallback(() => {
    isPanningRef.current = true;
    setIsPanning(true);
  }, []);

  const onVerticalPanEndJS = useCallback(
    (translationY: number) => {
      if (!visibleTimeRange || !serverTime) return;
      const threshold = 30;
      if (Math.abs(translationY) > threshold) {
        if (translationY < 0) {
          // Увеличить масштаб (уменьшить интервал)
          changeZoomLevel(Math.max(0, intervalIndex - 1));
        } else {
          // Уменьшить масштаб (увеличить интервал)
          changeZoomLevel(
            Math.min(TIMELINE_INTERVALS.length - 1, intervalIndex + 1)
          );
        }
      }
      isPanningRef.current = false;
      setIsPanning(false);
      lastInteractionRef.current = Date.now();
    },
    [visibleTimeRange, serverTime, intervalIndex, changeZoomLevel]
  );

  const onVerticalPanFinalizeJS = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
    lastInteractionRef.current = Date.now();
  }, []);

  const zoomPanGesture = useMemo(() => {
    const pan = Gesture.Pan().runOnJS(true).enabled(!isArchiveRestricted);
    if (isVertical) {
      // In vertical mode: left/right to change scale
      pan.activeOffsetX([-10, 10]).failOffsetY([-20, 20]);
      pan.onStart(() => runOnJS(onVerticalPanStartJS)());
      pan.onEnd((event) => runOnJS(onVerticalPanEndJS)(event.translationX));
      pan.onFinalize(() => runOnJS(onVerticalPanFinalizeJS)());
    } else {
      // In horizontal mode: up/down to change scale
      pan.activeOffsetY([-10, 10]).failOffsetX([-20, 20]);
      pan.onStart(() => runOnJS(onVerticalPanStartJS)());
      pan.onEnd((event) => runOnJS(onVerticalPanEndJS)(event.translationY));
      pan.onFinalize(() => runOnJS(onVerticalPanFinalizeJS)());
    }
    return pan;
  }, [isArchiveRestricted, isVertical, onVerticalPanStartJS, onVerticalPanEndJS, onVerticalPanFinalizeJS]);

  const composedGesture = useMemo(() => {
    return Gesture.Race(
      tapGesture,
      Gesture.Simultaneous(timePanGesture, zoomPanGesture)
    );
  }, [tapGesture, timePanGesture, zoomPanGesture]);

  const renderTimelineBlocks = () => {
    if (!visibleTimeRange || !bufferedTimeRange || timelineData.length === 0) {
      return null;
    }

    const blocks = [];
    const axisSize = isVertical
      ? Math.max(1, contentSize.height)
      : Math.max(1, contentSize.width);

    const totalFragments = timelineData.length;
    const blockSize = axisSize / totalFragments;
  
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

      let blockStyle: StyleProp<ViewStyle> = {
        backgroundColor: hasArchive
          ? "#4CAF50"
          : "rgba(255, 255, 255, 0.1)",
      };

      if (isVertical) {
        const blockTop = ((i - startIndex) / (endIndex - startIndex + 1)) * contentSize.height;
        blockStyle.left = 0;
        blockStyle.width = VERTICAL_BLOCK_WIDTH;
        blockStyle.top = blockTop;
        blockStyle.height = Math.max(1, blockSize);
      } else {
        const blockLeft = ((i - startIndex) / (endIndex - startIndex + 1)) * (screenWidth - 20);
        blockStyle.left = blockLeft;
        blockStyle.width = Math.max(1, blockSize);
      }

      blocks.push(
        <View
          key={i}
          style={[
            styles.timelineBlock,
            blockStyle,
          ]}
        />
      );
    }

    return blocks;
  };

  const renderTimeLabels = () => {
    if (!visibleTimeRange) return null;

    const labels = [];
    const axisSize = isVertical
      ? Math.max(1, contentSize.height)
      : Math.max(1, contentSize.width);
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
      const position = ((time - startTime) / visibleDuration) * axisSize;

      const timeString = labelDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const dateString = labelDate.toLocaleDateString(['ru-RU'], {
        day: "2-digit",
        month: "2-digit",
      });

      const isMainLabel = labelInterval >= 60 * 60 * 1000;

      if (isVertical) {
        labels.push(
          <View
            key={time}
            style={[
              styles.timeLabel,
              {
                top: position,
                left: VERTICAL_BLOCK_WIDTH + 8,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <View>
              <Text
                style={
                  isMainLabel ? styles.timeLabelText : styles.timeLabelTextSmall
                }
              >
                {timeString === '00:00' ? dateString : timeString}
              </Text>
              {visibleDuration >= 24 * 60 * 60 * 1000 && (
                <Text style={styles.dateLabelText}>{dateString}</Text>
              )}
            </View>
          </View>
        );
      } else {
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
    }
    return labels;
  };

  const renderCurrentTimeIndicator = () => {
    if (!visibleTimeRange) return null;

    const axisSize = isVertical
      ? Math.max(1, contentSize.height)
      : Math.max(1, contentSize.width);
    const centerPos = axisSize / 2;
    const centerTime = new Date(
      (visibleTimeRange.start.getTime() + visibleTimeRange.end.getTime()) / 2
    );

    return (
      <View
        style={
          isVertical
            ? [styles.currentTimeIndicator, { top: 0 }]
            : [styles.currentTimeIndicator, { left: centerPos }]
        }
      >
        <View style={[styles.currentTimeLine, isVertical ? styles.currentTimeLineVertical : styles.currentTimeLineHorizontal]} />
        <View
          style={
            isVertical
              ? { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5722", position: "absolute", left: VERTICAL_BLOCK_WIDTH - 4 }
              : styles.currentTimeCircle
          }
        />
        {!isLive && (
          <Text style={styles.selectedTimeLabel}>
            {centerTime.getHours().toString().padStart(2, "0")}:
            {centerTime.getMinutes().toString().padStart(2, "0")}:
            {centerTime.getSeconds().toString().padStart(2, "0")}
          </Text>
        )}
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { height: isVertical ? '100%' as const : timelineHeight }]}>
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

          {isArchiveRestricted && !isLive && (
            <View style={styles.restrictionIndicator}>
              <Text style={styles.restrictionText}>🔒</Text>
            </View>
          )}
        </View>

        <View style={styles.timelineContainer}>
          {error ? (
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
            <GestureDetector gesture={composedGesture}>
              <View
                style={[
                  styles.timelineContent,
                  isArchiveRestricted && styles.timelineDisabled,
                    isPanning && styles.timelinePanning,
                ]}
                onLayout={(e) =>
                  setContentSize({
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                  })
                }
              >
                {renderTimeLabels()}

                <View style={[styles.timelineBlocksContainer, { top: isVertical ? 0 : 30 }]}>
                  {renderTimelineBlocks()}
                </View>

                {renderCurrentTimeIndicator()}
              </View>
            </GestureDetector>
          ) : null}
        </View>
      </View >
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#333333",
    flexDirection: "column",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  topControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 5,
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
    overflow: "hidden",
  },
  timelineDisabled: {
    opacity: 0.5,
  },
  timelinePanning: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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
    left: 0,
    right: 0,
    bottom: 0,
  },
  timelineBlock: {
    position: "absolute",
    height: '100%',
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
    backgroundColor: "#FF5722",
    position: "absolute",
  },
  currentTimeLineHorizontal: {
    width: 2,
    height: "100%",
  },
  currentTimeLineVertical: {
    flex: 1,
    width: VERTICAL_BLOCK_WIDTH,
    left: 0,
    right: 0,
    height: 2,
    top: "50%",
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
