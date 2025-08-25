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

export interface TimelineRequest {
  channel?: number;
  stream: "video" | "video2" | "video3" | "audio";
  start_time: number[];
  end_time: number[];
  unit_len: number;
}

export interface TimelineResponse {
  timeline: number[];
  success: boolean;
  error?: string;
}

export interface ArchivePlaybackInfo {
  isArchive: boolean;
  timestamp?: Date;
  isLive: boolean;
}

export const createBasicAuthString = (
  login: string,
  password: string
): string => {
  const credentials = `${login}:${password}`;
  return btoa(credentials);
};

const testUrlConnectivity = async (
  url: string,
  port: number,
  login: string,
  password: string,
  timeoutMs: number = 5000
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeoutMs);

    const controller = new AbortController();
    const testUrl = `${url}:${port}/cameras`;
    const authString = createBasicAuthString(login, password);
    const authParam = `?authorization=Basic%20${encodeURIComponent(
      authString
    )}`;
    const fullUrl = `${testUrl}${authParam}`;

    fetch(fullUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        Accept: "application/xml",
      },
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (response.ok || response.status === 401) {
          resolve(url);
        } else {
          reject(new Error(`HTTP ${response.status}`));
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        controller.abort();
        reject(error);
      });
  });
};

export const determineProtocolForUrl = async (
  url: string,
  port: number,
  login: string,
  password: string
): Promise<string> => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const httpUrl = `http://${url}`;
  const httpsUrl = `https://${url}`;

  try {
    const fasterUrl = await Promise.race([
      testUrlConnectivity(httpUrl, port, login, password),
      testUrlConnectivity(httpsUrl, port, login, password),
    ]);

    return fasterUrl;
  } catch (error) {
    try {
      await testUrlConnectivity(httpsUrl, port, login, password, 10000);
      return httpsUrl;
    } catch {
      try {
        await testUrlConnectivity(httpUrl, port, login, password, 10000);
        return httpUrl;
      } catch {
        return httpsUrl;
      }
    }
  }
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

export const buildStreamingUrl = (
  server: Server,
  camera: Camera,
  isMain: boolean = false
): string => {
  const { url, port, login, pass } = server;
  const baseUrl = `${url}:${port}`;
  const authString = createBasicAuthString(login, pass);
  const authParam = `/${
    isMain ? "main" : "sub"
  }.mp4?authorization=Basic%20${encodeURIComponent(authString)}`;

  return `${baseUrl}${camera.streamingUri}${authParam}`;
};

export const buildImageUrl = (server: Server, camera: Camera): string => {
  const { url, port, login, pass } = server;
  const baseUrl = `${url}:${port}`;
  const authString = createBasicAuthString(login, pass);
  const authParam = `?authorization=Basic%20${encodeURIComponent(authString)}`;

  return `${baseUrl}${camera.imageUri}${authParam}`;
};

export const fetchArchiveTimeline = async (
  server: Server,
  request: TimelineRequest
): Promise<TimelineResponse> => {
  try {
    const { url, port, login, pass } = server;
    const baseUrl = `${url}:${port}`;
    const rpcUrl = `${baseUrl}/rpc`;

    const authString = createBasicAuthString(login, pass);
    const authParam = `?authorization=Basic%20${encodeURIComponent(
      authString
    )}`;
    const fullUrl = `${rpcUrl}${authParam}`;

    const versionRequest = {
      id: 1,
      method: "get_version",
    };

    const versionResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(versionRequest),
    });

    if (!versionResponse.ok) {
      throw new Error(
        `HTTP error getting version! status: ${versionResponse.status}`
      );
    }

    const versionJson = await versionResponse.json();

    let apiVersion = 13;
    if (versionJson.result?.version?.value) {
      apiVersion = versionJson.result.version.value;
    } else {
    }

    const rpcRequest = {
      id: 2,
      method: "archive.get_frames_timeline",
      version: apiVersion,
      params: {
        ...(request.channel !== undefined && { channel: request.channel }),
        stream: request.stream,
        start_time: request.start_time,
        end_time: request.end_time,
        unit_len: request.unit_len,
      },
    };

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(rpcRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonResponse = await response.json();

    if (jsonResponse.error) {
      if (
        jsonResponse.error.type === "auth" &&
        jsonResponse.error.message === "forbidden"
      ) {
        console.log("Archive access denied: insufficient user permissions");
        return {
          timeline: [],
          success: false,
          error: "Недостаточно прав: пользователь не имеет доступа к архиву",
        };
      }

      if (
        jsonResponse.error.type === "version" ||
        jsonResponse.error.type === "method_not_found" ||
        jsonResponse.error.message?.includes("not supported") ||
        jsonResponse.error.message?.includes("not found")
      ) {
        console.log(
          `Archive not supported: ${jsonResponse.error.type} (API v${apiVersion})`
        );
        return {
          timeline: [],
          success: false,
          error: `Архив недоступен: сервер не поддерживает функцию таймлайна (версия API: ${apiVersion})`,
        };
      }

      return {
        timeline: [],
        success: false,
        error: `RPC Error: ${jsonResponse.error.type} - ${jsonResponse.error.message}`,
      };
    }

    const timeline = jsonResponse.result?.timeline || [];

    return {
      timeline,
      success: true,
    };
  } catch (error) {
    console.error("Ошибка получения таймлайна архива:", error);
    return {
      timeline: [],
      success: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
  }
};

export const getServerTime = async (server: Server): Promise<Date> => {
  try {
    const { url, port, login, pass } = server;
    const baseUrl = `${url}:${port}`;
    const rpcUrl = `${baseUrl}/rpc`;

    const authString = createBasicAuthString(login, pass);
    const authParam = `?authorization=Basic%20${encodeURIComponent(
      authString
    )}`;
    const fullUrl = `${rpcUrl}${authParam}`;

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: 1,
        method: "get_server_info",
        version: 12,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonResponse = await response.json();

    if (jsonResponse.error) {
      throw new Error(`RPC Error: ${jsonResponse.error.type} - ${jsonResponse.error.message}`);
    }

    const localTime = jsonResponse.result?.info?.local_time;
    
    if (Array.isArray(localTime) && localTime.length >= 7) {
      // local_time format: [year, month, day, hour, minute, second, millisecond]
      // Note: JavaScript months are 0-indexed, but the API returns 1-indexed months
      const [year, month, day, hour, minute, second, millisecond] = localTime;
      return new Date(year, month - 1, day, hour, minute, second, millisecond);
    } else {
      throw new Error("Invalid server time format");
    }
  } catch (error) {
    console.error("Ошибка получения времени сервера:", error);
    throw error;
  }
};

export const buildArchiveStreamingUrl = (
  server: Server,
  camera: Camera,
  timestamp: Date,
  isMain: boolean = false
): string => {
  const { url, port, login, pass } = server;
  const baseUrl = `${url}:${port}`;
  const authString = createBasicAuthString(login, pass);
  const streamParam = isMain ? "main" : "sub";

  const streamType = "m3u8";

  const timeISO = timestamp.toISOString().split(".")[0];

  const archiveUrl = `${baseUrl}${
    camera.streamingUri
  }/${streamParam}.${streamType}?authorization=Basic%20${encodeURIComponent(
    authString
  )}&time=${timeISO}&autoplay=1`;

  return archiveUrl;
};

export const getCameraIdFromUri = (camera: Camera): number => {
  const match = camera.uri.match(/\/cameras\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const dateToTimeArray = (date: Date): number[] => {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  ];
};

// Интервалы масштабирования в миллисекундах (убрали 12 часов)
export const TIMELINE_INTERVALS = [
  5 * 60 * 1000,    // 5 минут
  10 * 60 * 1000,   // 10 минут
  15 * 60 * 1000,   // 15 минут
  30 * 60 * 1000,   // 30 минут
  60 * 60 * 1000,   // 1 час
  4 * 60 * 60 * 1000, // 4 часа
  6 * 60 * 60 * 1000, // 6 часов
  24 * 60 * 60 * 1000 // 1 день
];

// Длина единицы времени для каждого интервала (в секундах)
export const UNIT_LENGTHS = [
  5,    // 5 минут - 5 сек на фрагмент
  10,   // 10 минут - 10 сек на фрагмент  
  15,   // 15 минут - 15 сек на фрагмент
  30,   // 30 минут - 30 сек на фрагмент
  60,   // 1 час - 1 мин на фрагмент
  240,  // 4 часа - 4 мин на фрагмент
  360,  // 6 часов - 6 мин на фрагмент
  1440  // 24 часов - 24 мин на фрагмент
];

export interface TimeRange {
  start: Date;
  end: Date;
}

export const getTimelineRequest = (
  camera: Camera,
  startTime: Date,
  endTime: Date,
  unitLength: number = 3600,
  stream: "video" | "video2" | "video3" | "audio" = "video"
): TimelineRequest => {
  return {
    channel: getCameraIdFromUri(camera),
    stream,
    start_time: dateToTimeArray(startTime),
    end_time: dateToTimeArray(endTime),
    unit_len: unitLength,
  };
};

export const getTodayTimelineRequest = (
  camera: Camera,
  stream: "video" | "video2" = "video"
): TimelineRequest => {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return getTimelineRequest(camera, startOfDay, endOfDay, 3600, stream);
};
