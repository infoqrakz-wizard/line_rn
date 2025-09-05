import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { DisplayServer } from "../store/serverStore";
import { EventFourthIcon, SettingIcon, ShieldIcon } from "../icons";
import { Icon } from "react-native-paper";

interface ServerCardProps {
  server: DisplayServer;
  onPress: (server: DisplayServer) => void;
  onEdit: (server: DisplayServer) => void;
  onDelete: (serverId: string) => void;
  onSettings?: () => void;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onPress,
  onEdit,
  onDelete,
  onSettings,
}) => {
  const theme = useTheme();

  const handleEdit = () => {
    onEdit(server);
    onSettings?.();
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
        <View style={styles.contentValueContainer}>
          <Text
            style={[
              styles.contentValueText,
              { color: theme.colors.onBackground },
            ]}
            ellipsizeMode="tail"
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
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
            <ShieldIcon />
          </View>
        </View>

        {server.serverType === "nvr" ? (
          <>
            <View style={styles.content}>
              {renderContent("IP адрес", server.url)}
              {renderContent("Дней архива", "14")}
              {renderContent("Количество камер", "13")}
            </View>
            <View style={styles.footer}>
              <View style={styles.footerCameraInfo}>
                {server.url !== "name265d0000" && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleEdit}
                    disabled={!onSettings}
                  >
                    <SettingIcon />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPress(server)}
                style={styles.footerCameraInfo}
              >
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
                      <View
                        style={[
                          styles.footerCameraInfoItemTouchable,
                          {
                            backgroundColor: theme.colors.onBackground,
                            zIndex: 100,
                            borderLeftWidth: 2,
                            borderLeftColor: theme.colors.primaryContainer,
                          },
                        ]}
                      >
                        <Icon
                          source="arrow-right"
                          size={20}
                          color={theme.colors.primaryContainer}
                        />
                      </View>
                    )}
                  </>
                ))}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.rtspContainer}>
            <View style={styles.content}>
              {renderContent("IP адрес", server.url)}
              {renderContent("Дней архива", "14")}
              {renderContent("Количество камер", "13")}
              {server.url !== "name265d0000" && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleEdit}
                  disabled={!onSettings}
                  style={styles.settingsIcon}
                >
                  <SettingIcon />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPress(server)}
              style={styles.rtspCameraInfoItemContainer}
            >
              <Image
                source={require("../../assets/cameraTemplate.png")}
                resizeMode="cover"
                style={styles.rtspCameraInfoItem}
              />
              <View style={styles.overlay}>
                <EventFourthIcon fill={theme.colors.onPrimary} />
                <Text style={styles.overlayText}>Смотреть все</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    elevation: 4,
    flex: 1,
  },
  cardContent: {
    paddingVertical: 16,
    gap: 20,
    flex: 1,
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
    alignItems: "center",
    justifyContent: "flex-end",
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
    flex: 1,
  },
  settingsIcon: {
    marginTop: 12,
  },
  contentText: {
    flex: 0,
  },
  contentValueContainer: {
    flex: 1,
    marginLeft: 16,
  },
  contentValueText: {
    textAlign: "right",
  },
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerCameraInfo: {
    alignItems: "center",
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
  rtspContainer: {
    gap: 24,
    flexDirection: "row",
    flex: 1,
  },
  rtspCameraInfoItemContainer: {
    position: "relative",
  },
  rtspCameraInfoItem: {
    width: 130,
    height: 130,
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 130,
    height: 130,
    borderRadius: 4,
  },
  overlayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  overlayIcon: {
    width: 20,
    height: 20,
  },
});

export default ServerCard;
