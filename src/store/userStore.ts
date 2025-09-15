import { create } from "zustand";
import { authApi } from "../api/auth";
import { MMKV } from "react-native-mmkv";
import { IUser } from "../types/user";
import { createJSONStorage, persist } from "zustand/middleware";

const storage = new MMKV();

interface UserState {
  user: IUser | null;
  isAuth: boolean;
  getUser: () => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuth: false,
      getUser: async () => {
        const response = await authApi.getUser();
        set({ user: response.data });
      },
      register: async (login: string, password: string) => {
        try {
          const response = await authApi.register(login, password);
          storage.set("accessToken", response.data.accessToken);
          storage.set("refreshToken", response.data.refreshToken);
          set({ isAuth: true });
          await get().getUser();
        } catch (error: any) {
          console.log(error.response);
          throw error;
        }
      },
      login: async (login: string, password: string) => {
        try {
          const response = await authApi.login(login, password);
          console.log(response.data);
          storage.set("accessToken", response.data.accessToken);
          storage.set("refreshToken", response.data.refreshToken);
          set({ isAuth: true });
          await get().getUser();
        } catch (error: any) {
          console.log(error);
          throw error;
        }
      },
      logout: async () => {
        try {
          await authApi.logout(storage.getString("refreshToken") ?? "");
          storage.delete("accessToken");
          storage.delete("refreshToken");
          set({ user: null, isAuth: false });
        } catch (error: any) {
          console.log(error.response);
          throw error;
        }
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

storage.addOnValueChangedListener((key) => {
  if (key === "isAuth") {
    useUserStore.getState().isAuth = storage.getBoolean(key) ?? false;
  }
});
