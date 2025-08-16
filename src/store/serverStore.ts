import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export interface Server {
  id: string;
  name: string;
  url: string;
  port: number;
  login: string;
  pass: string;
  createdAt: string;
  streamFormat?: "mp4" | "m3u8";
}

interface ServerState {
  servers: Server[];
  addServer: (serverData: Omit<Server, "id">) => void;
  updateServer: (id: string, serverData: Partial<Server>) => void;
  removeServer: (id: string) => void;
  getServer: (id: string) => Server | undefined;
  updateStreamFormat: (id: string, format: "mp4" | "m3u8") => void;
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
          streamFormat: serverData.streamFormat || "m3u8",
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
      updateStreamFormat: (id, format) => {
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id ? { ...server, streamFormat: format } : server
          ),
        }));
      },
    }),
    {
      name: "server-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
