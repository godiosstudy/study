// src/components/SearchBar.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveSearch } from '../hooks/useLiveSearch'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'
import Header from './Header'
import AuthModal from './AuthModal'
import ProfileModal from './ProfileModal'

export default function SearchBar() {
  const { t } = useTranslation()
  const { query, setQuery, results, loading } = useLiveSearch()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [theme, setTheme] = useState('Claro')
  const [currentBible, setCurrentBible] = useState('Reina Valera 1960')
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState('sign_in')
  const [profileOpen, setProfileOpen] = useState(false)

  // Cargar perfil
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setTheme(data.theme || 'Claro')
            setCurrentBible(data.preferred_bible || 'Reina Valera 1960')
          }
        })
    }
  }, [user])

  const toggleTheme = async () => {
    const newTheme = theme === 'Claro' ? 'Oscuro' : 'Claro'
    setTheme(newTheme)
    if (user) {
      await supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id)
    }
  }

  const themeStyle = theme === 'Oscuro' ? {
    background: '#0f172a',
    color: '#f1f5f9'
  } : {
    background: '#ffffff',
    color: '#0f172a'
  }

  const highlightText = (text, query) => {
    if (!query) return text
    const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const normText = normalize(text)
    const normQuery = normalize(query)
    const indices = []
    let start = 0
    while (true) {
      const index = normText.indexOf(normQuery, start)
      if (index === -1) break
      indices.push({ start: index, end: index + normQuery.length })
      start = index + 1
    }
    if (indices.length === 0) return text
    const parts = []
    let lastEnd = 0
    indices.forEach(({ start, end }) => {
      parts.push(text.slice(lastEnd, start))
      parts.push(<mark key={start} style={{ background: '#fbbf24', padding: '0 2px', borderRadius: '2px' }}>{text.slice(start, end)}</mark>)
      lastEnd = end
    })
    parts.push(text.slice(lastEnd))
    return parts
  }

  return (
    <div style={{ ...themeStyle, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header query={query} setQuery={setQuery} theme={theme} toggleTheme={toggleTheme} />

      <main style={{
        flex: 1,
        marginTop: '90px',
        padding: '16px',
        overflowY: 'auto',
        maxWidth: '1200px',
        margin: '90px auto 60px auto'
      }}>
        {loading && <p style={{ textAlign: 'center', fontStyle: 'italic', color: theme === 'Oscuro' ? '#94a3b8' : '#64748b' }}>{t('search.searching')}</p>}
        {results.length === 0 && query.length >= 2 && !loading && (
          <p style={{ textAlign: 'center', fontStyle: 'italic', color: theme === 'Oscuro' ? '#94a3b8' : '#64748b' }}>{t('search.no_results')}</p>
        )}
        {results.map((v) => (
          <div key={v.id} style={{
            padding: '20px',
            background: theme === 'Oscuro' ? '#1e293b' : '#ffffff',
            borderRadius: '12px',
            border: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', color: themeStyle.color, marginBottom: '8px', fontSize: '1.1rem' }}>
              {v.book} {v.chapter}:{v.verse}
              <span style={{ fontWeight: 'normal', color: theme === 'Oscuro' ? '#94a3b8' : '#64748b', fontSize: '0.9em', marginLeft: '10px' }}>
                ({t('version')}: {v.version})
              </span>
            </div>
            <p style={{ margin: 0, color: themeStyle.color, lineHeight: '1.6', fontSize: '1rem' }}>
              {highlightText(v.text, query)}
            </p>
          </div>
        ))}
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
        color: themeStyle.color,
        fontSize: '0.9rem'
      }}>
        {currentBible}
      </footer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialView={authView} />
      <ProfileModal 
        isOpen={profileOpen} 
        onClose={() => setProfileOpen(false)} 
        profile={profile} 
        setProfile={setProfile} 
        currentBible={currentBible} 
        setCurrentBible={setCurrentBible}
        theme={theme}
        setTheme={setTheme}
      />
    </div>
  )
}