// src/i18n/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'  // ← AÑADIR

i18n
  .use(HttpBackend)  // ← AÑADIR
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'es',
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'fr', 'pt', 'it'],
    backend: {
      loadPath: '/locales/{{lng}}/translation.json'
    },
    interpolation: {
      escapeValue: false
    }
  })

export default i18n