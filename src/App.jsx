import { useTranslation } from 'react-i18next'

function App() {
  const { t, i18n } = useTranslation()

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20hra' }}>
        {t('title')}
      </h1>
      <p>Idioma actual: <strong>{i18n.language}</strong></p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => i18n.changeLanguage('es')} style={{ margin: '0 5px' }}>ES</button>
        <button onClick={() => i18n.changeLanguage('en')} style={{ margin: '0 5px' }}>EN</button>
        <button onClick={() => i18n.changeLanguage('fr')} style={{ margin: '0 5px' }}>FR</button>
      </div>
    </div>
  )
}

export default App