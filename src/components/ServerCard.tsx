import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Card,
  Text,
  IconButton,
  useTheme,
  Chip,
  Menu,
  Divider,
} from "react-native-paper";
import { Server } from "../store/serverStore";
import { RTSPServer } from "../store/rtspStore";

type DisplayServer = (Server & { serverType: 'nvr' }) | (RTSPServer & { serverType: 'rtsp' });

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
  const [menuVisible, setMenuVisible] = useState(false);
  const theme = useTheme();

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleEdit = () => {
    closeMenu();
    onEdit(server);
  };

  const handleDelete = () => {
    closeMenu();
    onDelete(server.id);
  };

  const getStatusColor = () => {
    // В будущем можно добавить проверку статуса сервера
    return theme.colors.primary;
  };

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress(server)}
      mode="elevated"
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text
              variant="titleMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              {server.name}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Готов
              </Text>
            </View>
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={openMenu}
                iconColor={theme.colors.onSurfaceVariant}
              />
            }
          >
            <Menu.Item onPress={handleEdit} title="Редактировать" />
            <Divider />
            <Menu.Item
              onPress={handleDelete}
              title="Удалить"
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>

        <View style={styles.details}>
          <View style={styles.urlContainer}>
            <IconButton
              icon={server.serverType === "rtsp" ? "video" : "web"}
              size={16}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.iconButton}
            />
            <Text
              variant="bodyMedium"
              style={[styles.url, { color: theme.colors.onSurface }]}
            >
              {server.serverType === "rtsp" 
                ? (server as RTSPServer).rtspUrl 
                : `${(server as Server).host || (server as Server).url}:${(server as Server).port}`}
            </Text>
          </View>

          {server.serverType !== "rtsp" && ((server as Server).username || (server as Server).login) && (
            <View style={styles.loginContainer}>
              <IconButton
                icon="account"
                size={16}
                iconColor={theme.colors.onSurfaceVariant}
                style={styles.iconButton}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {(server as Server).username || (server as Server).login}
              </Text>
            </View>
          )}

          {server.serverType === "rtsp" && (
            <View style={styles.typeContainer}>
              <Chip 
                icon="video" 
                mode="outlined" 
                compact
                style={styles.typeChip}
                textStyle={styles.typeChipText}
              >
                RTSP поток
              </Chip>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Chip mode="outlined" style={styles.chip}>
            {server.serverType === "rtsp" 
              ? new Date((server as RTSPServer).createdAt).toLocaleDateString("ru-RU")
              : (server as Server).createdAt 
              ? new Date((server as Server).createdAt!).toLocaleDateString("ru-RU")
              : server.lastUsed
              ? new Date(server.lastUsed).toLocaleDateString("ru-RU")
              : "Недавно добавлен"}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 4,
  },
  cardContent: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  details: {
    marginBottom: 12,
  },
  urlContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    margin: 0,
    marginRight: 4,
  },
  url: {
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  chip: {},
  typeContainer: {
    marginTop: 8,
  },
  typeChip: {
    alignSelf: "flex-start",
  },
  typeChipText: {
    fontSize: 11,
  },
});

export default ServerCard;
