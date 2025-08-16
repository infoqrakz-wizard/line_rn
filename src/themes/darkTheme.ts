import { MD3DarkTheme } from 'react-native-paper';

export const darkColdTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#64B5F6', // Холодный синий
    primaryContainer: '#1565C0',
    secondary: '#81C784', // Холодный зеленый
    secondaryContainer: '#2E7D32',
    tertiary: '#B39DDB', // Холодный фиолетовый
    tertiaryContainer: '#512DA8',
    surface: '#1A1A1F', // Темно-серый с синим оттенком
    surfaceVariant: '#2A2A3A',
    background: '#121218', // Очень темный с холодным оттенком
    error: '#CF6679',
    errorContainer: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onSurface: '#E8EAF6', // Холодный светло-серый
    onBackground: '#E3F2FD',
    outline: '#4A4A5A',
    onSurfaceVariant: '#B0BEC5',
    inverseSurface: '#E8EAF6',
    inverseOnSurface: '#1A1A1F',
    inversePrimary: '#1976D2',
  },
}; 