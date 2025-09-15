export interface IRegisterResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshResponse {
  accessToken: string;
}
