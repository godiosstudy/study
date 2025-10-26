// src/components/SearchBar.jsx
import { useTranslation } from 'react-i18next'
import { useLiveSearch } from '../hooks/useLiveSearch'

export default function SearchBar() {
  const { t, i18n } = useTranslation()
  const { query, setQuery, results, loading } = useLiveSearch()

  const highlightText = (text, query) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            background: '#fef3c7',
            padding: '0 3px',
            borderRadius: '3px',
            fontWeight: '600'
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div style={{
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* TÍTULO */}
      <h1 style={{
        marginBottom: '28px',
        color: '#1e293b',
        fontSize: '2rem',
        fontWeight: '700',
        textAlign: 'center'
      }}>
        {t('title')}
      </h1>

      {/* SELECTOR DE IDIOMA */}
      <div style={{ textAlign: '>center', marginBottom: '20px' }}>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#475569'
          }}
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="pt">Português</option>
          <option value="it">Italiano</option>
        </select>
      </div>

      {/* INPUT */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('placeholder')}
        style={{
          width: '100%',
          padding: '16px 18px',
          fontSize: '18px',
          borderRadius: '14px',
          border: '2px solid #e2e8f0',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#6366f1'
          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0'
          e.target.style.boxShadow = '0 