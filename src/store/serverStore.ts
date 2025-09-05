import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MMKV } from "react-native-mmkv";
import { RTSPServer } from "./rtspStore";

const storage = new MMKV();

export interface Server {
  id: string;
  name: string;
  host?: string;
  port: number;
  username?: string;
  password?: string;
  type?: "nvr" | "rtsp";
  lastUsed?: number;
  createdAt?: string;
  url: string;
  login?: string;
  pass?: string;
}

export type DisplayServer =
  | (Server & { serverType: "nvr" })
  | (RTSPServer & { serverType: "rtsp" });

interface ServerState {
  servers: Server[];
  addServer: (serverData: Omit<Server, "id">) => void;
  updateServer: (id: string, serverData: Partial<Server>) => void;
  removeServer: (id: string) => void;
  getServer: (id: string) => Server | undefined;
  saveLastUsedServer: (id: string) => void;
  getLastUsedServer: () => string | null;
  getLastUsedServerTime: () => number | null;
}

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      servers: [],
      addServer: (serverData) => {
        const newServer: Server = {
          ...serverData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        };
        set((state) => ({
          servers: [...state.servers, newServer],
        }));
      },
      updateServer: (id, serverData) => {
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id ? { ...server, ...serverData } : server
          ),
        }));
      },
      removeServer: (id) => {
        set((state) => ({
          servers: state.servers.filter((server) => server.id !== id),
        }));
      },
      getServer: (id) => {
        return get().servers.find((server) => server.id === id);
      },
      saveLastUsedServer: (id: string) => {
        const now = Date.now();
        storage.set("lastUsedServer", id);
        storage.set("lastUsedServerTime", now.toString());
      },
      getLastUsedServer: () => {
        return storage.getString("lastUsedServer") ?? null;
      },
      getLastUsedServerTime: () => {
        const time = storage.getString("lastUsedServerTime");
        return time ? parseInt(time, 10) : null;
      },
    }),
    {
      name: "server-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
