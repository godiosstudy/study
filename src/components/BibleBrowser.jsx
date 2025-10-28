// src/components/BibleBrowser.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

export default function BibleBrowser({ currentBible, initialPath = [] }) {
  const { user } = useAuth()
  const [path, setPath] = useState(initialPath)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [testaments, setTestaments] = useState([])
  const [booksByTestament, setBooksByTestament] = useState({})
  const [maxChaptersByBook, setMaxChaptersByBook] = useState({})

  useEffect(() => {
    if (initialPath.length > 0) {
      setPath(initialPath)
    }
  }, [initialPath])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('verses')
        .select('testament_id')
        .eq('version_name', currentBible)

      if (error) return

      const unique = [...new Set(data?.map(d => d.testament_id) || [])]
      const sorted = unique.sort((a, b) => a.localeCompare(b))
      setTestaments(sorted)
    }
    load()
  }, [currentBible])

  useEffect(() => {
    if (user && initialPath.length === 0) {
      supabase
        .from('profiles')
        .select('last_view')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const saved = data?.last_view?.path
          setPath(Array.isArray(saved) && saved.length > 0 ? saved : [])
        })
        .catch(() => setPath([]))
    } else if (initialPath.length === 0) {
      setPath([])
    }
  }, [user, currentBible, initialPath])

  const savePath = async (newPath) => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ last_view: { path: newPath } })
        .eq('id', user.id)
    }
  }

  useEffect(() => {
    if (path.length === 1) {
      const testament = path[0]
      const load = async () => {
        setLoadingBooks(true)

        let allData = []
        let start = 0
        const pageSize = 1000

        while (true) {
          const { data, error } = await supabase
            .from('verses')
            .select('book_name, book_order')
            .eq('version_name', currentBible)
            .eq('testament_id', testament)
            .order('book_order', { ascending: true })
            .range(start, start + pageSize - 1)

          if (error || !data || data.length === 0) break
          allData = allData.concat(data)
          if (data.length < pageSize) break
          start += pageSize
        }

        const bookMap = new Map()
        allData.forEach(row => {
          if (!bookMap.has(row.book_name)) {
            bookMap.set(row.book_name, row.book_order)
          }
        })

        const uniqueBooks = Array.from(bookMap.entries())
          .sort((a, b) => a[1] - b[1])
          .map(([name]) => name)

        setBooksByTestament(current => ({ ...current, [testament]: uniqueBooks }))
        setLoadingBooks(false)
      }
      load()
    }
  }, [path[0], currentBible])

  useEffect(() => {
    if (path.length === 2) {
      const book = path[1]
      const load = async () => {
        const { data, error } = await supabase
          .from('verses')
          .select('chapter')
          .eq('version_name', currentBible)
          .eq('book_name', book)
          .order('chapter', { ascending: false })
          .limit(1)

        if (error) return

        const max = data[0]?.chapter || 0
        setMaxChaptersByBook(prev => ({ ...prev, [book]: max }))
      }
      load()
    }
  }, [path, currentBible])

  useEffect(() => {
    if (path.length >= 3) {
      const book = path[1]
      const chapter = path[2]
      const load = async () => {
        setLoading(true)
        const { data, error } = await supabase
          .from('verses')
          .select('verse, text')
          .eq('version_name', currentBible)
          .eq('book_name', book)
          .eq('chapter', chapter)
          .order('verse')

        if (error) {
          setVerses([])
          setLoading(false)
          return
        }

        setVerses(data || [])
        setLoading(false)
      }
      load()
    }
  }, [path, currentBible])

  const navigate = (newPath) => {
    setPath(newPath)
    savePath(newPath)
  }

  const goTo = (index) => {
    if (index === 0) navigate([])
    else navigate(path.slice(0, index))
  }

  // BREADCRUMB CON NOMBRE DE BIBLIA + RESULTADOS (SOLO SI >1)
  const renderBreadcrumb = () => {
    const items = []
    items.push(
      <span key="bible" style={{ color: '#6366f1', fontWeight: '700' }}>
        {currentBible}
      </span>
    )
    if (path[0]) items.push(path[0])
    if (path[1]) items.push(path[1])
    if (path[2]) items.push(path[2].toString())
    if (path[3]) items.push(path[3].toString())

    // CONTAR RESULTADOS
    let resultCount = 0
    if (path.length === 0) resultCount = testaments.length
    else if (path.length === 1) resultCount = booksByTestament[path[0]]?.length || 0
    else if (path.length === 2) resultCount = maxChaptersByBook[path[1]] || 0
    else if (path.length === 3) resultCount = verses.length
    else if (path.length === 4) resultCount = 1

    const showCount = resultCount > 1

    return (
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
        gap: '8px'
      }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <span style={{ margin: '0 8px', color: '#94a3b8' }}>{'>'}</span>}
            <button
              onClick={() => goTo(i)}
              style={{
                background: 'none',
                border: 'none',
                color: i === items.length - 1 ? '#6366f1' : '#1e293b',
                fontWeight: i === items.length - 1 ? '700' : '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {item}
            </button>
          </span>
        ))}
        {showCount && (
          <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.9rem' }}>
            ({resultCount} resultados)
          </span>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (path.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
            {testaments.map(t => (
              <button
                key={t}
                onClick={() => navigate([t])}
                style={{
                  padding: '24px 48px',
                  fontSize: '1.3rem',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  minWidth: '240px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (path.length === 1) {
      const testament = path[0]
      const list = booksByTestament[testament] || []

      if (loadingBooks) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            fontSize: '1.2rem',
            color: '#64748b'
          }}>
            Cargando libros...
          </div>
        )
      }

      return (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            {list.map(book => (
              <button
                key={book}
                onClick={() => navigate([testament, book])}
                style={{
                  padding: '16px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {book}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (path.length === 2) {
      const book = path[1]
      const max = maxChaptersByBook[book] || 0
      const list = Array.from({ length: max }, (_, i) => i + 1)
      return (
        <div style={{ padding: '20px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
          {list.map(ch => (
            <button
              key={ch}
              onClick={() => navigate([...path, ch])}
              style={{
                padding: '16px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {ch}
            </button>
          ))}
        </div>
      )
    }

    if (path.length === 3) {
      return (
        <div style={{ padding: '20px' }}>
          {loading ? (
            <p style={{ textAlign: 'center' }}>Cargando...</p>
          ) : verses.length === 0 ? (
            <p style={{ textAlign: 'center' }}>No hay versículos</p>
          ) : (
            verses.map(v => (
              <div
                key={v.verse}
                onClick={() => navigate([...path, v.verse])}
                style={{
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                <strong>{v.verse}.</strong> {v.text}
              </div>
            ))
          )}
        </div>
      )
    }

    if (path.length === 4) {
      const verse = path[3]
      const current = verses.find(v => v.verse === verse)
      const prev = verses.find(v => v.verse === verse - 1)
      const next = verses.find(v => v.verse === verse + 1)

      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            fontSize: '1.5rem',
            lineHeight: '2',
            maxWidth: '800px',
            margin: '0 auto 40px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <strong>{verse}.</strong> {current?.text || 'Cargando...'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button
              onClick={() => navigate([...path.slice(0, 3), verse - 1])}
              disabled={!prev}
              style={{
                padding: '12px 24px',
                background: prev ? '#6366f1' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              ← {verse - 1}
            </button>
            <button
              onClick={() => navigate([...path.slice(0, 3), verse + 1])}
              disabled={!next}
              style={{
                padding: '12px 24px',
                background: next ? '#10b981' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              {verse + 1} →
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div>
      {renderBreadcrumb()}
      <div style={{ minHeight: 'calc(100vh - 140px)', paddingBottom: '60px' }}>
        {renderContent()}
      </div>
    </div>
  )
}