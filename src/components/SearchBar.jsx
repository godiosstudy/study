import { useLiveSearch } from '../hooks/useLiveSearch'

export default function SearchBar() {
  const { query, setQuery, results, loading } = useLiveSearch()

  // Función para resaltar la palabra buscada
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
    <div
      style={{
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        background: '#f8fafc',
        minHeight: '100vh'
      }}
    >
      {/* Título */}
      <h1
        style={{
          marginBottom: '28px',
          color: '#1e293b',
          fontSize: '2rem',
          fontWeight: '700',
          textAlign: 'center'
        }}
      >
        Study – Navegador de Biblias
      </h1>

      {/* Input de búsqueda */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Escribe para buscar en tiempo real..."
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
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        }}
      />

      {/* Estado de carga */}
      {loading && (
        <p
          style={{
            margin: '20px 0',
            color: '#64748b',
            fontStyle: 'italic',
            textAlign: 'center',
            fontSize: '1rem'
          }}
        >
          Buscando...
        </p>
      )}

      {/* Resultados */}
      <div style={{ marginTop: '24px', display: 'grid', gap: '16px' }}>
        {results.length === 0 && query.length >= 2 && !loading && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
            No se encontraron resultados.
          </p>
        )}

        {results.map((v) => (
          <div
            key={v.id}
            style={{
              padding: '18px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              transition: 'transform 0.1s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {/* Referencia */}
            <div
              style={{
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '6px',
                fontSize: '1.1rem'
              }}
            >
              {v.book} {v.chapter}:{v.verse}
              <span
                style={{
                  fontWeight: 'normal',
                  color: '#64748b',
                  fontSize: '0.9em',
                  marginLeft: '10px'
                }}
              >
                ({v.version})
              </span>
            </div>

            {/* Texto con highlight */}
            <p
              style={{
                margin: 0,
                color: '#334155',
                lineHeight: '1.6',
                fontSize: '1rem'
              }}
            >
              {highlightText(v.text, query)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}