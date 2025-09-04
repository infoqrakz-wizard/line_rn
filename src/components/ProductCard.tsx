import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import React from "react";
import { Button, Card, Icon, Text, useTheme } from "react-native-paper";

const ProductCard = () => {
  const theme = useTheme();
  return (
    <Card
      mode="contained"
      style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.contentContainer}>
          <TouchableOpacity activeOpacity={0.8} style={styles.closeIcon}>
            <Icon source="close" size={20} color={theme.colors.outline} />
          </TouchableOpacity>
          <Image
            source={require("../../assets/camera.png")}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              Tiandy Spark TC-C32QN
            </Text>
            <Text
              style={[styles.description, { color: theme.colors.onBackground }]}
            >
              Уличная IP-камера
            </Text>
            <Text style={[styles.price, { color: theme.colors.secondary }]}>
              5 390 ₽
            </Text>
          </View>
        </View>
        <Button onPress={() => {}} mode="contained" style={styles.button}>
          <Text style={styles.buttonText}>Купить на Ozon</Text>
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  closeIcon: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  image: {
    width: (Dimensions.get("window").width - 20) / 2.5,
    height: 100,
    flex: 1,
  },
  cardContent: {
    gap: 12,
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 32,
  },
  description: {
    fontSize: 13,
  },
  price: {
    fontSize: 22,
    fontWeight: "600",
  },
  button: {
    borderRadius: 10,
    marginTop: 12,
  },
  buttonText: {
    fontWeight: "700",
  },
});
export default ProductCard;
