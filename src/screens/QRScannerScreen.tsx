import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert, Dimensions } from "react-native";
import {
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
} from "react-native-paper";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useServerStore } from "../store/serverStore";
import { parseQRServerData, createServerFromQR } from "../utils/qrParser";
import { RootStackParamList } from "../navigation/AppNavigator";

const { width, height } = Dimensions.get("window");

const QRScannerScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { addServer } = useServerStore();

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);

    const serverData = parseQRServerData(data);

    console.log(serverData);

    if (serverData) {
      const newServer = createServerFromQR(serverData);
      addServer(newServer);

      Alert.alert(
        "Сервер добавлен!",
        `Сервер "${newServer.name}" успешно добавлен`,
        [
          {
            text: "Сканировать еще",
            onPress: () => setScanned(false),
          },
          {
            text: "На главную",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert("QR код отсканирован!", `Данные: ${data}`, [
        {
          text: "Сканировать еще",
          onPress: () => setScanned(false),
        },
        {
          text: "Назад",
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  if (!permission) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.onBackground }}>
          Запрос разрешения на использование камеры
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Surface style={styles.permissionCard}>
          <Text
            style={[styles.permissionText, { color: theme.colors.onSurface }]}
          >
            Нет доступа к камере
          </Text>
          <Text
            style={{
              color: theme.colors.onSurface,
              textAlign: "center",
              marginVertical: 10,
            }}
          >
            Для сканирования QR-кодов необходим доступ к камере
          </Text>
          <Button
            mode="contained"
            onPress={requestPermission}
            style={{ marginTop: 10, marginBottom: 10 }}
          >
            Предоставить доступ
          </Button>
          <Button mode="outlined" onPress={() => navigation.goBack()}>
            Вернуться назад
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <CameraView
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
      />

      {/* Overlay с рамкой для сканирования */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanFrame}>
            <View
              style={[
                styles.corner,
                styles.topLeft,
                { borderColor: theme.colors.primary },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.topRight,
                { borderColor: theme.colors.primary },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomLeft,
                { borderColor: theme.colors.primary },
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.bottomRight,
                { borderColor: theme.colors.primary },
              ]}
            />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text
            style={[styles.instructionText, { color: theme.colors.onSurface }]}
          >
            Наведите камеру на QR-код
          </Text>

          <View style={styles.controls}>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={{ marginHorizontal: 10 }}
            >
              Назад
            </Button>

            {scanned && (
              <Button mode="outlined" onPress={() => setScanned(false)}>
                Сканировать еще
              </Button>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  middleRow: {
    flexDirection: "row",
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  instructionText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionCard: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  permissionText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default QRScannerScreen;
