import { useTranslation } from 'react-i18next'

function App() {
  const { t, i18n } = useTranslation()

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>{t('title')}</h1>
      <p>Idioma actual: {i18n.language}</p>
      <button onClick={() => i18n.changeLanguage('en')}>EN</button>
      <button onClick={() => i18n.changeLanguage('es')}>ES</button>
    </div>
  )
}

export default App