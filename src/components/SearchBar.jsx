// src/components/SearchBar.jsx
// ... imports ...

export default function SearchBar() {
  // ... código anterior ...

  return (
    <div style={{ ...themeStyle, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER FIJO */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: theme === 'Oscuro' ? '#1e293b' : '#f8fafc',
        borderBottom: `1px solid ${theme === 'Oscuro' ? '#334155' : '#e2e8f0'}`,
        zIndex: 1000,
        padding: '12px 16px',  // ← MÁS COMPACTO
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        maxHeight: '80px',  // ← LIMITA ALTURA
        overflow: 'hidden'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          fontSize: '0.9rem'  // ← TEXTO MÁS PEQUEÑO
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.3rem',  // ← TÍTULO MÁS PEQUEÑO
            fontWeight: '700', 
            flex: 1, 
            minWidth: '150px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {currentBible}
          </h1>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            style={{
              flex: 1,
              minWidth: '120px',  // ← MÁS FLEXIBLE
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              background: theme === 'Oscuro' ? '#1e293b' : '#fff',
              color: themeStyle.color
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />

          <select
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value)
              if (user) supabase.from('profiles').update({ preferred_language: e.target.value }).eq('id', user.id)
            }}
            style={{
              padding: '8px 10px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: theme === 'Oscuro' ? '#1e293b' : '#fff',
              color: themeStyle.color
            }}
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="pt">PT</option>
            <option value="it">IT</option>
          </select>

          {!user ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => { setAuthView('sign_in'); setAuthOpen(true) }}
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
                onClick={() => { setAuthView('sign_up'); setAuthOpen(true) }}
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
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => setProfileOpen(true)}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
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
          )}
        </div>
      </header>

      {/* CONTENIDO CON MARGEN SUPERIOR */}
      <main style={{
        flex: 1,
        marginTop: '90px',  // ← MÁS ESPACIO
        padding: '16px',
        overflowY: 'auto',
        maxWidth: '1200px',
        margin: '90px auto 60px auto'
      }}>
        {/* ... resultados ... */}
      </main>

      {/* FOOTER */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left:  dynamique,
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

      {/* Modales */}
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