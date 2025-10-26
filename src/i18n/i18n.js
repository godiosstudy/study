// src/i18n/i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Carga dinámica de JSONs
const loadTranslations = async (lng) => {
  const response = await fetch(`/locales/${lng}/translation.json`)
  return await response.json()
}

i18n
  .use({
    type: 'backend',
    read: (language, namespace, callback) => {
      loadTranslations(language)
        .then(data => callback(null, data))
        .catch(error => callback(error, null))
    }
  })
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'fr', 'pt', 'it'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n