import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('oa-theme') || 'oa';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('oa-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'oa' ? 'oa-dark' : 'oa'));
  };

  const isDark = theme === 'oa-dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
