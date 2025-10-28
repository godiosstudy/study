// src/App.jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import BibleBrowser from './components/BibleBrowser'

function App() {
  const { t } = useTranslation()
  const { loading } = useAuth()
  const [currentBible, setCurrentBible] = useState('Reina Valera 1960')
  const [theme, setTheme] = useState('Claro')
  const [biblePath, setBiblePath] = useState([]) // ESTADO PARA NAVEGACIÓN

  useEffect(() => {
    document.title = t('appName')
  }, [t])

  const toggleTheme = () => {
    setTheme(prev => prev === 'Claro' ? 'Oscuro' : 'Claro')
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#64748b'
      }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', paddingBottom: '60px' }}>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        currentBible={currentBible}
        setCurrentBible={setCurrentBible}
        biblePath={biblePath}          // PASAR
        setBiblePath={setBiblePath}    // PASAR
      />
      <main style={{ paddingTop: '80px' }}>
        <BibleBrowser 
          currentBible={currentBible} 
          initialPath={biblePath} // RECIBIR
        />
      </main>

      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: theme === 'Oscuro' ? '#1e293b' : '#f8fafc',
        borderTop: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
        padding: '12px',
        textAlign: 'center',
        zIndex: 1000,
        fontWeight: '600',
        color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b',
        fontSize: '0.9rem'
      }}>
        © 2025 GODiOS
      </footer>
    </div>
  )
}

export default App