import { Server } from '../store/serverStore';

export interface QRServerData {
  url: string;
  port: number;
  login: string;
  pass: string;
}

export const parseQRServerData = (qrData: string): QRServerData | null => {
  try {
    const parsedData = JSON.parse(qrData);
    
    if (parsedData.url && typeof parsedData.url === 'string') {
      return {
        url: parsedData.url,
        port: parsedData.port || 443,
        login: parsedData.login || '',
        pass: parsedData.pass || '',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Ошибка парсинга QR данных:', error);
    return null;
  }
};

export const generateDefaultServerName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Если URL некорректный, извлекаем домен вручную
    const cleanUrl = url.replace(/^https?:\/\//, '');
    const domain = cleanUrl.split('/')[0];
    return domain || 'Сервер';
  }
};

export const createServerFromQR = (qrData: QRServerData): Omit<Server, 'id'> => {
  const defaultName = generateDefaultServerName(qrData.url);
  
  return {
    name: defaultName,
    url: qrData.url,
    port: qrData.port,
    login: qrData.login,
    pass: qrData.pass,
    createdAt: new Date().toISOString(),
  };
}; 