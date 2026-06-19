import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageContextType {
  lang: 'ka' | 'en';
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ka',
  toggleLang: () => {}
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState<'ka' | 'en'>(
    () => (localStorage.getItem('lang') as 'ka' | 'en') || 'ka'
  );

  const toggleLang = () => {
    const next = lang === 'ka' ? 'en' : 'ka';
    setLang(next);
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
