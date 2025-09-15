import { AxiosResponse } from "axios";
import { $api } from "..";
import { ILoginResponse, IRegisterResponse } from "../../types/auth";

class AuthApi {
  public async register(
    login: string,
    password: string
  ): Promise<AxiosResponse<IRegisterResponse>> {
    return await $api.post("auth/register", {
      login,
      password,
    });
  }

  public async login(
    login: string,
    password: string
  ): Promise<AxiosResponse<ILoginResponse>> {
    return await $api.post("auth/login", {
      login,
      password,
    });
  }

  public async logout(refreshToken: string): Promise<AxiosResponse> {
    return await $api.post("auth/logout", { refreshToken });
  }

  public async getUser(): Promise<AxiosResponse> {
    return await $api.get("auth/me");
  }
}

export const authApi = new AuthApi();
