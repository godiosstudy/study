// src/components/SearchBar.jsx
import { useTranslation } from 'react-i18next'

export default function SearchBar({ 
  theme, query, results, hasMore, onLoadMore, onResultClick, onBack, currentBible 
}) {
  const { t } = useTranslation()

  const themeStyle = theme === 'Oscuro' 
    ? { background: '#0f172a', color: '#f1f5f9' }
    : { background: '#ffffff', color: '#0f172a' }

  const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const highlightText = (text, query) => {
    if (!query) return text
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
      parts.push(
        <mark key={start} style={{ background: '#fbbf24', padding: '0 2px', borderRadius: '2px' }}>
          {text.slice(start, end)}
        </mark>
      )
      lastEnd = end
    })
    parts.push(text.slice(lastEnd))
    return parts
  }

  return (
    <div style={{ ...themeStyle, minHeight: 'calc(100vh - 80px)', position: 'absolute', top: '80px', left: 0, right: 0 }}>
      {/* BREADCRUMB CON VER 100 MÁS */}
      <div style={{
        padding: '16px',
        fontSize: '1.1rem',
        fontWeight: '600',
        textAlign: 'center',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {currentBible}
        </button>
        <span style={{ margin: '0 8px', color: '#94a3b8' }}>{'>'}</span>
        <span style={{ color: '#1e293b' }}>Resultados</span>
        <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.9rem' }}>
          ({results.length} {results.length === 1 ? 'resultado' : 'resultados'})
        </span>
        {hasMore && (
          <button
            onClick={onLoadMore}
            style={{
              marginLeft: '16px',
              padding: '6px 16px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Ver 100 más
          </button>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {results.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>
              {t('search.no_results') || 'No se encontraron resultados'}
            </p>
          ) : (
            results.map((v, index) => (
              <div
                key={`${v.id}-${index}`}
                onClick={() => onResultClick(v)}
                style={{
                  padding: '20px',
                  background: theme === 'Oscuro' ? '#1e293b' : '#ffffff',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ 
                  fontWeight: '600', 
                  color: themeStyle.color, 
                  marginBottom: '8px', 
                  fontSize: '1.1rem' 
                }}>
                  {v.book_name} {v.chapter}:{v.verse}
                </div>
                <p style={{ 
                  margin: 0, 
                  color: themeStyle.color, 
                  lineHeight: '1.6', 
                  fontSize: '1rem' 
                }}>
                  {highlightText(v.text, query)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}