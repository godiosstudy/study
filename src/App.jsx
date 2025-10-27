// src/App.jsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import SearchBar from './components/SearchBar'

function App() {
  const { t, i18n } = useTranslation()

  // Cambia dinámicamente el <title> de la pestaña según el idioma
  useEffect(() => {
    document.title = t('appName')
  }, [i18n.language, t])

  return <SearchBar />
}

export default App