import { useThemeContext } from './ThemeContext';

export const useTheme = () => {
  const { theme } = useThemeContext();
  return theme;
};