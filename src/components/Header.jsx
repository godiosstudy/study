// src/components/Header.jsx
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'
import { useState } from 'react'

export default function Header({ query, setQuery, theme, toggleTheme }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState('sign_in')
  const [profileOpen, setProfileOpen] = useState(false)

  const getBlessedName = () => {
    if (!user?.user_metadata?.first_name) return t('auth.login')
    return i18n.language === 'en' 
      ? `Blessed ${user.user_metadata.first_name}` 
      : `Bendecido ${user.user_metadata.first_name}`
  }

  const themeStyle = theme === 'Oscuro' 
    ? { background: '#1e293b', color: '#f1f5f9' }
    : { background: '#f8fafc', color: '#1e293b' }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: themeStyle.background,
      borderBottom: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
      zIndex: 1000,
      padding: '12px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      maxHeight: '80px',
      overflow: 'hidden'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        fontSize: '0.9rem'
      }}>
        {/* IZQUIERDA: NOMBRE DE LA APP */}
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.3rem', 
          fontWeight: '700', 
          flex: 1,
          color: themeStyle.color
        }}>
          {t('appName')}
        </h1>

        {/* BUSCADOR */}
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 2,
            minWidth: '200px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${theme === 'Oscuro' ? '#475569' : '#cbd5e1'}`,
            background: theme === 'Oscuro' ? '#334155' : '#ffffff',
            color: themeStyle.color,
            fontSize: '0.95rem'
          }}
        />

        {/* SELECTOR DE IDIOMA */}
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            padding: '6px 12px',
            background: theme === 'Oscuro' ? '#334155' : '#e2e8f0',
            color: themeStyle.color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="pt">PT</option>
          <option value="it">IT</option>
        </select>

        {/* BOTONES DE AUTENTICACIÓN */}
        {user ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setProfileOpen(true)}
              style={{
                padding: '6px 12px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {getBlessedName()}
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                padding: '6px 12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {t('auth.logout')}
            </button>
            <button
              onClick={toggleTheme}
              style={{
                padding: '6px 12px',
                background: theme === 'Claro' ? '#e2e8f0' : '#334155',
                color: theme === 'Claro' ? '#1e293b' : '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {theme}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setAuthOpen(true); setAuthView('sign_in') }}
              style={{
                padding: '6px 12px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => { setAuthOpen(true); setAuthView('sign_up') }}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {t('auth.register')}
            </button>
            <button
              onClick={toggleTheme}
              style={{
                padding: '6px 12px',
                background: theme === 'Claro' ? '#e2e8f0' : '#334155',
                color: theme === 'Claro' ? '#1e293b' : '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {theme}
            </button>
          </div>
        )}
      </div>

      {/* MODALES */}
      {/* Puedes mover AuthModal y ProfileModal aquí o dejarlos en SearchBar */}
    </header>
  )
}