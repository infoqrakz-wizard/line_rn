import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export interface RTSPServer {
  id: string;
  name: string;
  rtspUrl: string;
  lastUsed?: number;
  createdAt: string;
}

interface RTSPServerState {
  rtspServers: RTSPServer[];
  addRTSPServer: (serverData: Omit<RTSPServer, "id">) => void;
  updateRTSPServer: (id: string, serverData: Partial<RTSPServer>) => void;
  removeRTSPServer: (id: string) => void;
  getRTSPServer: (id: string) => RTSPServer | undefined;
  saveLastUsedRTSPServer: (id: string) => void;
  getLastUsedRTSPServer: () => string | null;
  getLastUsedRTSPServerTime: () => number | null;
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

export const useRTSPStore = create<RTSPServerState>()(
  persist(
    (set, get) => ({
      rtspServers: [],
      addRTSPServer: (serverData) => {
        const newServer: RTSPServer = {
          ...serverData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          rtspServers: [...state.rtspServers, newServer],
        }));
      },
      updateRTSPServer: (id, serverData) => {
        set((state) => ({
          rtspServers: state.rtspServers.map((server) =>
            server.id === id ? { ...server, ...serverData } : server
          ),
        }));
      },
      removeRTSPServer: (id) => {
        set((state) => ({
          rtspServers: state.rtspServers.filter((server) => server.id !== id),
        }));
      },
      getRTSPServer: (id) => {
        return get().rtspServers.find((server) => server.id === id);
      },
      saveLastUsedRTSPServer: (id: string) => {
        const now = Date.now();
        storage.set("lastUsedRTSPServer", id);
        storage.set("lastUsedRTSPServerTime", now.toString());
      },
      getLastUsedRTSPServer: () => {
        return storage.getString("lastUsedRTSPServer") ?? null;
      },
      getLastUsedRTSPServerTime: () => {
        const time = storage.getString("lastUsedRTSPServerTime");
        return time ? parseInt(time, 10) : null;
      },
    }),
    {
      name: "rtsp-server-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
