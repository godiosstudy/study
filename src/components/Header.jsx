// src/components/Header.jsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import SearchBar from './SearchBar'
import { supabase } from '../services/supabase'

export default function Header({ theme, toggleTheme, currentBible, setCurrentBible, biblePath, setBiblePath }) {
  const { t, i18n } = useTranslation()
  const { user, login, logout } = useAuth() // USAR login y logout del contexto
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 100

  const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  // BÚSQUEDA EN HEADER
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([])
      setOffset(0)
      setHasMore(false)
      return
    }

    const load = async () => {
      const { data, error, count } = await supabase
        .from('verses')
        .select('id, book_name, chapter, verse, text, testament_id', { count: 'exact' })
        .eq('version_name', currentBible)
        .ilike('text', `%${normalize(query)}%`)
        .range(offset, offset + PAGE_SIZE - 1)
        .order('book_order', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })

      if (error) {
        console.error('Error:', error)
        setSearchResults([])
        setHasMore(false)
        return
      }

      const newResults = offset === 0 ? data : [...searchResults, ...data]
      setSearchResults(newResults)
      setHasMore((count || 0) > offset + PAGE_SIZE)
    }
    load()
  }, [query, currentBible, offset])

  const loadMore = () => setOffset(prev => prev + PAGE_SIZE)

  const handleResultClick = (result) => {
    setQuery('')
    setSearchResults([])
    setOffset(0)
    setBiblePath([result.testament_id, result.book_name, result.chapter, result.verse])
  }

  const handleBack = () => {
    setQuery('')
    setSearchResults([])
    setOffset(0)
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: theme === 'Oscuro' ? '#1e293b' : '#f8fafc',
      borderBottom: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
      padding: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{ fontWeight: '600', color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b' }}>
        estudio.godios.org
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOffset(0)
          }}
          placeholder={t('search.placeholder') || 'Buscar...'}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: `1px solid ${theme === 'Oscuro' ? '#475569' : '#e2e8f0'}`,
            background: theme === 'Oscuro' ? '#334155' : '#edf2f7',
            color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b',
            outline: 'none',
            width: '200px'
          }}
        />

        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            background: theme === 'Oscuro' ? '#334155' : '#edf2f7',
            color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${theme === 'Oscuro' ? '#475569' : '#e2e8f0'}`,
            cursor: 'pointer'
          }}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
          <option value="fr">FR</option>
          <option value="de">DE</option>
          <option value="pt">PT</option>
        </select>

        <button
          onClick={toggleTheme}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            background: theme === 'Oscuro' ? '#334155' : '#edf2f7',
            color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {theme === 'Oscuro' ? 'Claro' : 'Oscuro'}
        </button>

        <select
          value={currentBible}
          onChange={(e) => setCurrentBible(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            background: theme === 'Oscuro' ? '#334155' : '#edf2f7',
            color: theme === 'Oscuro' ? '#f1f5f9' : '#1e293b',
            border: `1px solid ${theme === 'Oscuro' ? '#475569' : '#e2e8f0'}`,
            cursor: 'pointer'
          }}
        >
          <option value="Reina Valera 1960">Reina Valera 1960</option>
          <option value="Nueva Versión Internacional">NVI</option>
          <option value="King James Version">KJV</option>
          <option value="La Biblia de las Américas">LBLA</option>
          <option value="Nueva Traducción Viviente">NTV</option>
        </select>

        {/* BOTONES DE AUTENTICACIÓN FUNCIONANDO */}
        {user ? (
          <button
            onClick={logout}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {t('auth.logout') || 'Cerrar sesión'}
          </button>
        ) : (
          <button
            onClick={login}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {t('auth.login') || 'Iniciar sesión'}
          </button>
        )}
      </div>

      {query.length > 0 && (
        <SearchBar
          theme={theme}
          query={query}
          currentBible={currentBible}
          results={searchResults}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onResultClick={handleResultClick}
          onBack={handleBack}
        />
      )}
    </header>
  )
}