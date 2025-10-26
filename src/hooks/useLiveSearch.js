// src/hooks/useLiveSearch.js
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export function useLiveSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)

      try {
        // Búsqueda parcial con ilike (insensible a mayúsculas)
        const { data, error } = await supabase
          .from('verses')
          .select('id, book, chapter, verse, text, version')
          .ilike('text', `%${query}%`)  // ← Aquí está la clave
          .limit(15)

        if (error) throw error

        setResults(data || [])
      } catch (err) {
        console.error('Error en búsqueda:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return { query, setQuery, results, loading }
}