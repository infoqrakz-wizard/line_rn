import React from "react";
import { View, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { Server } from "../store/serverStore";
import { RTSPServer } from "../store/rtspStore";
import { CameraTabIcon, SettingIcon, ShieldIcon } from "../icons";
import { Icon } from "react-native-paper";

type DisplayServer =
  | (Server & { serverType: "nvr" })
  | (RTSPServer & { serverType: "rtsp" });

interface ServerCardProps {
  server: DisplayServer;
  onPress: (server: DisplayServer) => void;
  onEdit: (server: DisplayServer) => void;
  onDelete: (serverId: string) => void;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onPress,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();

  const handleEdit = () => {
    onEdit(server);
  };

  const handleDelete = () => {
    onDelete(server.id);
  };

  const getStatusColor = () => {
    return { backgroundColor: "#84E3AD59", textColor: "#21965399" };
  };

  const renderContent = (title: string, value: string | undefined) => {
    return (
      <View
        style={[
          styles.contentItem,
          { borderBottomWidth: 1, borderBottomColor: theme.colors.outline },
        ]}
      >
        <Text
          style={[styles.contentText, { color: theme.colors.onBackground }]}
        >
          {title}
        </Text>
        <Text
          style={[styles.contentText, { color: theme.colors.onBackground }]}
        >
          {value}
        </Text>
      </View>
    );
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
      onPress={() => onPress(server)}
      mode="contained"
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View
              style={[
                styles.statusContainer,
                { backgroundColor: getStatusColor().backgroundColor },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor().textColor },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor().textColor },
                ]}
              >
                активен
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              {server.name}
            </Text>
          </View>
          <View style={styles.iconContainer}>
            <TouchableOpacity activeOpacity={0.8}>
              <SettingIcon />
            </TouchableOpacity>
            <ShieldIcon />
          </View>
        </View>
        <View style={styles.content}>
          {renderContent("IP адрес", server.url)}
          {renderContent("Дней архива", "14")}
          {renderContent("Режим охраны", "Вкл")}
        </View>
        <View style={styles.footer}>
          <View style={styles.footerCameraInfo}>
            <CameraTabIcon />
            <Text
              style={[styles.footerText, { color: theme.colors.onBackground }]}
            >
              13 Камер
            </Text>
          </View>
          <View style={styles.footerCameraInfo}>
            {Array.from({ length: 3 }).map((_, index) => (
              <>
                <Image
                  source={require("../../assets/cameraTemplate.png")}
                  resizeMode="cover"
                  style={[
                    styles.footerCameraInfoItem,
                    {
                      zIndex: 100 - index - 1,
                      right: (index + 1) * 50 - 12 * (index + 1),
                      borderLeftWidth: 2,
                      borderTopWidth: 2,
                      borderBottomWidth: 2,
                      borderColor: theme.colors.primaryContainer,
                    },
                  ]}
                />
                {index === 2 && (
                  <TouchableOpacity
                    style={[
                      styles.footerCameraInfoItemTouchable,
                      {
                        backgroundColor: theme.colors.onBackground,
                        zIndex: 100,
                        borderLeftWidth: 2,
                        borderLeftColor: theme.colors.primaryContainer,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Icon
                      source="arrow-right"
                      size={20}
                      color={theme.colors.primaryContainer}
                    />
                  </TouchableOpacity>
                )}
              </>
            ))}
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  cardContent: {
    paddingVertical: 16,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 6,
    fontSize: 18,
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 30,
    width: 73,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    paddingBottom: 2,
  },
  content: {
    gap: 8,
  },
  contentText: {},
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerCameraInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  footerCameraInfoItemContainer: {
    width: 50,
    height: 50,
    position: "absolute",
  },
  footerCameraInfoItem: {
    width: 50,
    height: 50,
    borderRadius: 12,
    position: "absolute",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerCameraInfoItemTouchable: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
});

export default ServerCard;
