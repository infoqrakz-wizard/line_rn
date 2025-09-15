import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { MMKV } from "react-native-mmkv";
import { IRefreshResponse } from "../types/auth";

const storage = new MMKV();

const getToken = () => {
  const tokenString = storage.getString("accessToken");
  return tokenString ? tokenString : null;
};

const getRefreshToken = () => {
  const refreshTokenString = storage.getString("refreshToken");
  return refreshTokenString ? refreshTokenString : null;
};

let accessToken = getToken();
let refreshToken = getRefreshToken();

storage.addOnValueChangedListener((key) => {
  if (key === "accessToken") {
    accessToken = storage.getString(key) ?? null;
  }
});

storage.addOnValueChangedListener((key) => {
  if (key === "refreshToken") {
    refreshToken = storage.getString(key) ?? null;
  }
});

export const $api = axios.create({
  baseURL: "https://linecam.ru/api/",
  timeout: 60000,
});

$api.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

$api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _isRetry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._isRetry) {
      originalRequest._isRetry = true;
      try {
        const response = await axios.post<IRefreshResponse>(
          "https://linecam.ru/api/auth/refresh",
          { refreshToken: refreshToken }
        );

        const newAccessToken = response.data.accessToken;

        storage.set("accessToken", newAccessToken);

        accessToken = newAccessToken;

        if (!originalRequest.headers) {
          originalRequest.headers = {};
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return $api.request(originalRequest);
      } catch (refreshError) {
        storage.delete("accessToken");
        storage.delete("refreshToken");
        storage.set("isAuth", false);
      }
    }
    return Promise.reject(error);
  }
);
