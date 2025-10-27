// src/components/AuthModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTranslation } from 'react-i18next'

export default function AuthModal({ isOpen, onClose, initialView = 'sign_in' }) {
  const { t, i18n } = useTranslation()
  const [view, setView] = useState(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [preferredBible, setPreferredBible] = useState('Reina Valera 1960')
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language)
  const [emailStatus, setEmailStatus] = useState('') // '', 'checking', 'valid', 'invalid', 'format'
  const [emailMessage, setEmailMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const bibleVersions = [
    'Reina Valera 1960',
    'Nueva Versión Internacional',
    'King James Version',
    'Biblia de Jerusalén',
    'Nueva Traducción Viviente'
  ]

  const isValidEmailFormat = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validateEmail = async (email) => {
    if (!email) {
      setEmailStatus('')
      setEmailMessage('')
      return
    }

    if (!isValidEmailFormat(email)) {
      setEmailStatus('format')
      setEmailMessage(t('auth.invalid_format'))
      return
    }

    setEmailStatus('checking')
    setEmailMessage(t('auth.checking'))

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (data) {
      setEmailStatus('invalid')
      setEmailMessage(t('auth.email_exists'))
    } else if (error && error.code !== 'PGRST116') {
      setEmailStatus('invalid')
      setEmailMessage(t('auth.email_error'))
    } else {
      setEmailStatus('valid')
      setEmailMessage(t('auth.email_available'))
    }
  }

  const isFormValid = () => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      emailStatus === 'valid' &&
      password.length >= 6
    )
  }

  const handleSignUp = async () => {
    setLoading(true)
    setStatus('')

    if (!isFormValid()) {
      setStatus(t('auth.fill_all'))
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } }
    })

    if (error) {
      setStatus(error.message)
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          birth_date: birthDate,
          gender,
          preferred_bible: preferredBible,
          preferred_language: preferredLanguage,
          theme: 'Claro'
        })

      if (profileError) {
        setStatus(t('auth.profile_error'))
      } else {
        setStatus(t('auth.success'))
        setTimeout(() => onClose(), 1500)
      }
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus(error.message)
    } else {
      onClose()
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => setView('sign_in')} style={{ flex: 1, padding: '10px', background: view === 'sign_in' ? '#fff' : '#f1f5f9', border: 'none', borderBottom: view === 'sign_in' ? '2px solid #6366f1' : 'none', fontWeight: view === 'sign_in' ? '600' : '500' }}>
            {t('auth.login')}
          </button>
          <button onClick={() => setView('sign_up')} style={{ flex: 1, padding: '10px', background: view === 'sign_up' ? '#fff' : '#f1f5f9', border: 'none', borderBottom: view === 'sign_up' ? '2px solid #6366f1' : 'none', fontWeight: view === 'sign_up' ? '600' : '500' }}>
            {t('auth.register')}
          </button>
        </div>

        {view === 'sign_in' ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            <input placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <button onClick={handleSignIn} disabled={loading} style={{ padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? t('auth.loading') : t('auth.login')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            <input placeholder={t('profile.first_name')} value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input placeholder={t('profile.last_name')} value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            
            <div style={{ position: 'relative' }}>
              <input
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validateEmail(email)}
                style={{ 
                  padding: '10px 36px 10px 10px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              {emailStatus === 'checking' && <span style={{ position: 'absolute', right: '10px', top: '12px' }}>🔍</span>}
              {emailStatus === 'valid' && <span style={{ position: 'absolute', right: '10px', top: '12px' }}>✅</span>}
              {emailStatus === 'invalid' && <span style={{ position: 'absolute', right: '10px', top: '12px' }}>❌</span>}
              {emailStatus === 'format' && <span style={{ position: 'absolute', right: '10px', top: '12px' }}>⚠️</span>}
              {emailMessage && (
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: '0.8rem', 
                  color: emailStatus === 'valid' ? '#10b981' : '#ef4444' 
                }}>
                  {emailMessage}
                </p>
              )}
            </div>

            <input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input placeholder={t('profile.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="">{t('profile.gender')}</option>
              <option value="masculino">{t('profile.male')}</option>
              <option value="femenino">{t('profile.female')}</option>
              <option value="otro">{t('profile.other')}</option>
            </select>

            <select value={preferredBible} onChange={(e) => setPreferredBible(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {bibleVersions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <option value="es">{t('profile.spanish')}</option>
              <option value="en">{t('profile.english')}</option>
              <option value="fr">{t('profile.french')}</option>
              <option value="pt">{t('profile.portuguese')}</option>
              <option value="it">{t('profile.italian')}</option>
            </select>

            <button 
              onClick={handleSignUp} 
              disabled={loading || !isFormValid()}
              style={{ 
                padding: '12px', 
                background: isFormValid() ? '#10b981' : '#94a3b8', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: isFormValid() ? 'pointer' : 'not-allowed',
                opacity: isFormValid() ? 1 : 0.6
              }}
            >
              {loading ? t('auth.registering') : t('auth.register')}
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {t('auth.close')}
        </button>

        {status && <p style={{ textAlign: 'center', marginTop: '10px', color: status.includes('Error') ? '#ef4444' : '#10b981' }}>{status}</p>}
      </div>
    </div>
  )
}