// src/hooks/useLiveSearch.js
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export function useLiveSearch(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)

      const normalize = (str) => str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      const normalizedQuery = normalize(query)

      const refMatch = normalizedQuery.match(/^(\w+)\s+(\d+)(?::(\d+))?$/)
      if (refMatch) {
        const [_, bookPart, chapter, verse] = refMatch
        const qb = supabase
          .from('verses')
          .select('id, version_name, book_name, chapter, verse, text')
          .ilike('book_id', `%${bookPart}%`)
          .eq('chapter', parseInt(chapter))

        if (verse) qb.eq('verse', parseInt(verse)).limit(1)
        else qb.order('verse').limit(100)

        const { data } = await qb
        setResults((data || []).map(v => ({
          id: v.id,
          version: v.version_name,
          book: v.book_name,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text
        })))
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('verses')
        .select('id, version_name, book_name, chapter, verse, text')
        .ilike('search_text', `%${normalizedQuery}%`)
        .order('book_order', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })
        .limit(50)

      setResults((data || []).map(v => ({
        id: v.id,
        version: v.version_name,
        book: v.book_name,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text
      })))

      setLoading(false)
    }

    const timeout = setTimeout(search, 300)
    return () => clearTimeout(timeout)
  }, [query])

  return { results, loading }
}