import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Icon,
  Portal,
  TextInput,
  useTheme,
} from "react-native-paper";
import { DisplayServer, Server } from "../store/serverStore";
import {
  EventFirstIcon,
  EventSecondIcon,
  EventThirdIcon,
  EventFourthIcon,
} from "../icons";

interface CameraSettingsProps {
  server: DisplayServer;
  onBack: () => void;
  handleDeleteCamera: (id: string) => void;
  onSave: (serverData: Partial<DisplayServer>) => void;
}

const CameraSettings = ({
  server,
  onBack,
  handleDeleteCamera,
  onSave,
}: CameraSettingsProps) => {
  const theme = useTheme();
  const [serverName, setServerName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [serverPort, setServerPort] = useState("");
  const [serverLogin, setServerLogin] = useState("");
  const [serverPass, setServerPass] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<number[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<number>(0);

  const [visible, setVisible] = useState(false);

  const onDismiss = () => {
    setVisible(false);
  };

  useEffect(() => {
    setServerName(server.name);
    setServerUrl(server.url);
    if (server.serverType === "nvr") {
      setServerPort(server.port?.toString() || "");
      setServerLogin(server.login || "");
      setServerPass(server.pass || "");
    }
  }, [server]);

  const handleSave = () => {
    const serverData: Partial<Server> = {
      name: serverName,
      url: serverUrl,
    };
    if (server.serverType === "nvr") {
      serverData.port = parseInt(serverPort);
      serverData.login = serverLogin;
      serverData.pass = serverPass;
    }
    onSave(serverData);
  };
  const contentItem = (
    title: string,
    value: string,
    setValue: (text: string) => void
  ) => (
    <View style={styles.contentItem}>
      <Text style={[styles.contentText, { color: theme.colors.onBackground }]}>
        {title}:
      </Text>
      <TextInput
        value={value}
        onChangeText={(text) => setValue(text)}
        mode="outlined"
        autoCapitalize="none"
        multiline={title === "URL"}
        cursorColor={theme.colors.outline}
        style={[
          styles.input,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
        contentStyle={{
          color: theme.colors.onBackground,
        }}
        outlineStyle={{
          borderColor: theme.colors.outline,
        }}
        theme={{
          roundness: 10,
        }}
      />
    </View>
  );

  const eventsContentItem = (
    icon: (fill?: string) => React.ReactNode,
    text: string,
    isSelected: boolean,
    onPress: () => void
  ) => (
    <View style={styles.eventsContentItem}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.eventsContentItemTouchable,
          {
            backgroundColor: isSelected
              ? theme.colors.onBackground
              : theme.colors.primaryContainer,
          },
        ]}
        onPress={onPress}
      >
        {icon(isSelected ? theme.colors.secondaryContainer : undefined)}
      </TouchableOpacity>
      <Text
        style={[
          styles.eventsContentItemText,
          { color: theme.colors.onBackground },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  const handleEventPress = (event: number) => {
    const allEvents = [0, 1, 2, 3];
    const individualEvents = [0, 1, 2];

    if (event === 3) {
      const hasAllSelected = selectedEvent.length === 4;
      setSelectedEvent(hasAllSelected ? [] : allEvents);
    } else {
      const isSelected = selectedEvent.includes(event);

      if (isSelected) {
        setSelectedEvent((prev) => prev.filter((e) => e !== event && e !== 3));
      } else {
        const newEvents = [...selectedEvent.filter((e) => e !== 3), event];
        const hasAllIndividual = individualEvents.every((e) =>
          newEvents.includes(e)
        );
        setSelectedEvent(hasAllIndividual ? allEvents : newEvents);
      }
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.8}
          style={styles.header}
        >
          <Icon source="chevron-left" size={32} color={theme.colors.outline} />
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            {server.name}
          </Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {server.serverType === "nvr" ? (
            <>
              {contentItem("Имя сервера", serverName, setServerName)}
              {contentItem("IP адрес", serverUrl, setServerUrl)}
              {contentItem("Порт", serverPort, setServerPort)}
              {contentItem("Логин", serverLogin, setServerLogin)}
              {contentItem("Пароль", serverPass, setServerPass)}
            </>
          ) : (
            <>
              {contentItem("Имя сервера", serverName, setServerName)}
              {contentItem("URL", serverUrl, setServerUrl)}
            </>
          )}
        </View>
        <View style={[styles.hr, { backgroundColor: theme.colors.scrim }]} />
        <View style={styles.events}>
          <Text
            style={[styles.eventsTitle, { color: theme.colors.onBackground }]}
          >
            События
          </Text>
          <Text
            style={[styles.eventsDescription, { color: theme.colors.outline }]}
          >
            Выберите триггер на начало записи
          </Text>
          <View style={styles.eventsContent}>
            {eventsContentItem(
              (fill) => (
                <EventFirstIcon fill={fill} />
              ),
              "Люди",
              selectedEvent.includes(0),
              () => {
                handleEventPress(0);
              }
            )}
            {eventsContentItem(
              (fill) => (
                <EventSecondIcon fill={fill} />
              ),
              "Транспорт",
              selectedEvent.includes(1),
              () => {
                handleEventPress(1);
              }
            )}
            {eventsContentItem(
              (fill) => (
                <EventThirdIcon fill={fill} />
              ),
              "Движение",
              selectedEvent.includes(2),
              () => {
                handleEventPress(2);
              }
            )}
            {eventsContentItem(
              (fill) => (
                <EventFourthIcon fill={fill} />
              ),
              "Всё",
              selectedEvent.includes(3),
              () => {
                handleEventPress(3);
              }
            )}
          </View>
        </View>
        <View style={[styles.hr, { backgroundColor: theme.colors.scrim }]} />
        <View style={styles.archive}>
          <Text
            style={[styles.archiveTitle, { color: theme.colors.onBackground }]}
          >
            Архив
          </Text>
          <Text
            style={[styles.archiveDescription, { color: theme.colors.outline }]}
          >
            Выберите период, по истечении которого записи удаляются с сервера
          </Text>
          <View
            style={[
              styles.archiveContent,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedArchive(0)}
              style={[
                styles.archiveContentItem,
                {
                  backgroundColor:
                    selectedArchive === 0
                      ? theme.colors.onBackground
                      : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedArchive === 0
                      ? theme.colors.primaryContainer
                      : theme.colors.onBackground,
                }}
              >
                0 дней
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedArchive(7)}
              style={[
                styles.archiveContentItem,
                {
                  backgroundColor:
                    selectedArchive === 7
                      ? theme.colors.onBackground
                      : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedArchive === 7
                      ? theme.colors.primaryContainer
                      : theme.colors.onBackground,
                }}
              >
                7 дней
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedArchive(14)}
              style={[
                styles.archiveContentItem,
                {
                  backgroundColor:
                    selectedArchive === 14
                      ? theme.colors.onBackground
                      : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedArchive === 14
                      ? theme.colors.primaryContainer
                      : theme.colors.onBackground,
                }}
              >
                14 дней
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedArchive(21)}
              style={[
                styles.archiveContentItem,
                {
                  backgroundColor:
                    selectedArchive === 21
                      ? theme.colors.onBackground
                      : theme.colors.primaryContainer,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedArchive === 21
                      ? theme.colors.primaryContainer
                      : theme.colors.onBackground,
                }}
              >
                21 дней
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => handleSave()}
        >
          <Text style={styles.buttonText}>Сохранить изменения</Text>
        </Button>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setVisible(true)}
          activeOpacity={0.8}
        >
          <Icon
            source="trash-can"
            size={18}
            color={theme.colors.onBackground}
          />
          <Text
            style={[
              styles.deleteButtonText,
              { color: theme.colors.onBackground },
            ]}
          >
            Удалить камеру
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Portal>
        <Dialog
          style={[styles.dialog, { backgroundColor: theme.colors.background }]}
          theme={{
            ...theme,
            colors: {
              ...theme.colors,
            },
          }}
          visible={visible}
          onDismiss={onDismiss}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onBackground }]}
          >
            Вы уверены, что хотите удалить сервер {server.name}?
          </Dialog.Title>
          <Dialog.Content>
            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.cancelModalButton}
            >
              Отменить
            </Button>
            <Button
              style={styles.deleteModalButton}
              mode="outlined"
              onPress={() => handleDeleteCamera(server.id)}
            >
              Удалить
            </Button>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  content: {
    marginTop: 20,
    gap: 5,
  },
  contentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
  },
  contentText: {
    fontSize: 15,
    fontWeight: "500",
    width: Dimensions.get("window").width * 0.25,
  },
  hr: {
    height: 1,
    width: "100%",
    marginVertical: 20,
  },
  button: {
    marginTop: 20,
    width: "60%",
    alignSelf: "center",
    borderRadius: 10,
    paddingVertical: 4,
  },
  deleteButton: {
    marginTop: 25,
    marginBottom: 20,
    width: "60%",
    alignSelf: "center",
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  events: {
    gap: 5,
  },
  archive: {
    gap: 5,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  eventsDescription: {
    fontSize: 14,
    fontWeight: "400",
  },
  archiveTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  archiveDescription: {
    fontSize: 14,
    fontWeight: "400",
  },
  archiveContent: {
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
    padding: 4,
    borderRadius: 12,
  },
  archiveContentItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    padding: 4,
  },
  eventsContent: {
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
  },
  eventsContentItemTouchable: {
    width: (Dimensions.get("window").width - 35) * 0.25,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  eventsContentItem: {
    alignItems: "center",
    gap: 10,
  },
  eventsContentItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dialog: {
    borderRadius: 20,
    margin: 20,
    zIndex: 1000,
  },
  dialogTitle: {
    textAlign: "center",
    fontWeight: "500",
  },
  cancelModalButton: {
    width: "60%",
    alignSelf: "center",
    borderRadius: 10,
    paddingVertical: 2,
    marginTop: 15,
  },
  deleteModalButton: {
    width: "60%",
    alignSelf: "center",
    borderRadius: 10,
    paddingVertical: 0,
    marginTop: 5,
  },
});

export default CameraSettings;
