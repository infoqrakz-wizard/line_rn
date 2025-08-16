import { XMLParser } from "fast-xml-parser";
import { Server } from "../store/serverStore";

export interface Camera {
  uri: string;
  name: string;
  width: number;
  height: number;
  pixelAspectRatioX: number;
  pixelAspectRatioY: number;
  imageUri: string;
  streamingUri: string;
}

export interface CamerasResponse {
  cameras: Camera[];
  success: boolean;
  error?: string;
}

export const createBasicAuthString = (
  login: string,
  password: string
): string => {
  const credentials = `${login}:${password}`;
  return btoa(credentials);
};

export const fetchCameraList = async (
  server: Server
): Promise<CamerasResponse> => {
  try {
    const { url, port, login, pass } = server;
    const baseUrl = `${url}:${port}`;
    const camerasUrl = `${baseUrl}/cameras`;

    const authString = createBasicAuthString(login, pass);
    const authParam = `?authorization=Basic%20${encodeURIComponent(
      authString
    )}`;

    const fullUrl = `${camerasUrl}${authParam}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Accept: "application/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        parseAttributeValue: true,
        trimValues: true,
      });

      const result = parser.parse(xmlText);

      const cameraList = result["camera-list"];
      if (!cameraList || !cameraList.camera) {
        return {
          cameras: [],
          success: true,
        };
      }

      const cameras: Camera[] = (
        Array.isArray(cameraList.camera)
          ? cameraList.camera
          : [cameraList.camera]
      ).map((cam: any) => ({
        uri: cam.uri || "",
        name: cam.name || "Камера без названия",
        width: parseInt(cam.width || "640", 10),
        height: parseInt(cam.height || "480", 10),
        pixelAspectRatioX: parseInt(cam["pixel-aspect-ratio-x"] || "1", 10),
        pixelAspectRatioY: parseInt(cam["pixel-aspect-ratio-y"] || "1", 10),
        imageUri: cam["image-uri"] || "",
        streamingUri: cam["streaming-uri"] || "",
      }));

      return {
        cameras,
        success: true,
      };
    } catch (parseError) {
      console.error("Ошибка обработки данных камер:", parseError);
      return {
        cameras: [],
        success: false,
        error: "Ошибка обработки данных камер",
      };
    }
  } catch (error) {
    console.error("Ошибка получения списка камер:", error);
    return {
      cameras: [],
      success: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }
};

export const buildStreamingUrl = (server: Server, camera: Camera): string => {
  const { url, port, login, pass, streamFormat = "m3u8" } = server;
  const baseUrl = `${url}:${port}`;
  const authString = createBasicAuthString(login, pass);
  const fileExtension = streamFormat === "mp4" ? "main.mp4" : "main.m3u8";
  const authParam = `/${fileExtension}?authorization=Basic%20${encodeURIComponent(
    authString
  )}`;

  return `${baseUrl}${camera.streamingUri}${authParam}`;
};

export const buildImageUrl = (server: Server, camera: Camera): string => {
  const { url, port, login, pass } = server;
  const baseUrl = `${url}:${port}`;
  const authString = createBasicAuthString(login, pass);
  const authParam = `?authorization=Basic%20${encodeURIComponent(authString)}`;

  return `${baseUrl}${camera.imageUri}${authParam}`;
};
