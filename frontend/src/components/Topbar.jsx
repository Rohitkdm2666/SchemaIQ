import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  Search,
  Loader2,
  Database,
  Table,
  Columns,
  MessageSquare,
  Bell
} from 'lucide-react'

export default function Topbar() {
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState({ tables: [], columns: [] })
  const [schema, setSchema] = useState([])
  const [loadingSchema, setLoadingSchema] = useState(false)
  const dropdownRef = useRef(null)

  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch schema for search functionality - only from the active connected DB
    setLoadingSchema(true)
    fetch('http://localhost:8001/api/schema?infer=true')
      .then(r => r.json())
      .then(data => {
        if (data && data.tables) {
          setSchema(data.tables)
        } else {
          setSchema([])
        }
        setLoadingSchema(false)
      })
      .catch(err => {
        console.error('Search data fetch failed:', err)
        setSchema([])
        setLoadingSchema(false)
      })
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setResults({ tables: [], columns: [] })
      return
    }

    const s = search.toLowerCase()
    const matchedTables = []
    const matchedColumns = []

    // Related searches strictly from the connected schema
    schema.forEach(t => {
      const tableNameLower = t.name.toLowerCase()
      if (tableNameLower.includes(s)) {
        matchedTables.push(t.name)
      }
      t.columns.forEach(c => {
        const colNameLower = c.name.toLowerCase()
        if (colNameLower.includes(s)) {
          // Check if column is related to this database context
          matchedColumns.push({ table: t.name, column: c.name })
        }
      })
    })

    setResults({
      tables: matchedTables.slice(0, 5),
      columns: matchedColumns.slice(0, 8)
    })
  }, [search, schema])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownRef])

  const handleSelect = (tableName) => {
    setSearch('')
    setFocused(false)
    navigate(`/schema?table=${tableName}`)
  }

  return (
    <header style={{
      height: 64,
      background: '#0f0f17',
      borderBottom: '1px solid #1e1e2e',
      display: 'flex', alignItems: 'center',
      padding: '0 36px', gap: 16,
      position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#16161f',
          border: `1px solid ${focused ? '#c0392b' : '#1e1e2e'}`,
          borderRadius: 10, padding: '0 16px', height: 40,
          transition: 'border-color 0.2s',
        }}>
          <Search size={16} color="#444458" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            placeholder="Search tables, columns, relationships…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: '#e8e8f0',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        {/* Search Results Dropdown */}
        {focused && (
          <div ref={dropdownRef} style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: '#0f0f17', border: '1px solid #1e1e2e',
            borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            maxHeight: 400, overflowY: 'auto', zIndex: 100,
            padding: '8px 0',
          }}>
            {loadingSchema && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 11, color: '#666680', fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin" /> Syncing schema intelligence...
              </div>
            )}

            {!loadingSchema && schema.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ color: '#444458', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                  <Database size={24} />
                </div>
                <div style={{ fontSize: 12, color: '#e8e8f0', fontWeight: 600 }}>No Database Connected</div>
                <p style={{ fontSize: 11, color: '#444458', marginTop: 4 }}>Connect a DB to search tables and columns.</p>
              </div>
            )}

            {!loadingSchema && schema.length > 0 && search.trim() === '' && (
              <div style={{ padding: '12px 16px', fontSize: 11, color: '#666680', fontFamily: "'Space Mono', monospace", display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={12} /> Search {schema.length} tables in active connection...
              </div>
            )}

            {!loadingSchema && schema.length > 0 && search.trim() !== '' && results.tables.length === 0 && results.columns.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#666680', fontSize: 12 }}>
                No matches found in current database.
              </div>
            )}

            {results.tables.length > 0 && (
              <div style={{ padding: '8px 16px', fontSize: 10, color: '#c0392b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                Live Tables
              </div>
            )}
            {results.tables.map(t => (
              <div
                key={t}
                onClick={() => handleSelect(t)}
                style={{
                  padding: '10px 16px', fontSize: 13, color: '#e8e8f0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: '0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.08)'; e.currentTarget.style.color = '#f0828a' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#e8e8f0' }}
              >
                <span style={{ opacity: 0.6 }}><Table size={14} /></span> {t}
              </div>
            ))}

            {results.columns.length > 0 && (
              <div style={{ padding: '16px 16px 8px', fontSize: 10, color: '#c0392b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                Database Columns
              </div>
            )}
            {results.columns.map(c => (
              <div
                key={`${c.table}-${c.column}`}
                onClick={() => handleSelect(c.table)}
                style={{
                  padding: '10px 16px', fontSize: 13, color: '#e8e8f0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: '0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.08)'; e.currentTarget.style.color = '#f0828a' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#e8e8f0' }}
              >
                <span style={{ opacity: 0.6 }}><Columns size={14} /></span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{c.column}</span>
                  <span style={{ fontSize: 10, color: '#444458' }}>in {c.table}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>

        {/* QueryBot shortcut */}
        <button
          onClick={() => navigate('/querybot')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #1e1e2e', background: 'none',
            color: '#f0828a', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0828a'; e.currentTarget.style.background = 'rgba(240,130,138,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.background = 'none' }}
        >
          <MessageSquare size={13} /> QueryBot
        </button>

        <span style={{ color: '#444458', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Bell size={18} /></span>

        {user && (
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c0392b, #f0828a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Mono', monospace", fontSize: 12,
            fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0,
          }}>
            {user.initials}
          </div>
        )}
      </div>
    </header>
  )
}