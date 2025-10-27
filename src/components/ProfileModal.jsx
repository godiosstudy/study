// src/components/ProfileModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTranslation } from 'react-i18next'

export default function ProfileModal({ isOpen, onClose, profile, setProfile, currentBible, setCurrentBible, theme, setTheme }) {
  const { t, i18n } = useTranslation()  // ← USA t() PARA TRADUCIR
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const bibleVersions = [
    'Reina Valera 1960',
    'Nueva Versión Internacional',
    'King James Version',
    'Biblia de Jerusalén',
    'Nueva Traducción Viviente'
  ]

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || '',
        theme: profile.theme || 'Claro',
        preferred_bible: profile.preferred_bible || currentBible,
        preferred_language: profile.preferred_language || i18n.language
      })
    }
  }, [profile, currentBible, i18n])

  const validateEmail = async (email) => {
    if (!email || email === profile?.email) {
      setEmailError('')
      return true
    }
    const { data } = await supabase.from('profiles').select('id').eq('email', email).single()
    if (data) {
      setEmailError(t('profile.email_exists'))  // ← TRADUCIDO
      return false
    }
    setEmailError('')
    return true
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveStatus('')

    const isValid = await validateEmail(form.email)
    if (!isValid) {
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update(form)
      .eq('id', profile.id)

    if (error) {
      setSaveStatus(t('profile.save_error'))
    } else {
      setProfile({ ...profile, ...form })
      setCurrentBible(form.preferred_bible)
      i18n.changeLanguage(form.preferred_language)
      setTheme(form.theme)
      setSaveStatus(t('profile.saved'))
      setTimeout(() => onClose(), 800)
    }
    setLoading(false)
  }

  const changePassword = async () => {
    if (newPassword.length < 6) {
      setSaveStatus(t('profile.password_short'))
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setSaveStatus(t('profile.password_error'))
    } else {
      setSaveStatus(t('profile.password_changed'))
      setNewPassword('')
      setShowPassword(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: theme === 'Oscuro' ? '#94a3b8' : '#1e293b' }}>{t('profile.title')}</h2>

        <div style={{ display: 'grid', gap: '12px' }}>
          <input placeholder={t('profile.first_name')} value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <input placeholder={t('profile.last_name')} value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          
          <div>
            <input
              placeholder={t('profile.email')}
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={(e) => validateEmail(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${emailError ? '#ef4444' : '#cbd5e1'}`, width: '100%' }}
            />
            {emailError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '4px 0 0 0' }}>{emailError}</p>}
          </div>

          <input placeholder={t('profile.phone')} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <input type="date" value={form.birth_date || ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          
          <select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="">{t('profile.gender')}</option>
            <option value="masculino">{t('profile.male')}</option>
            <option value="femenino">{t('profile.female')}</option>
            <option value="otro">{t('profile.other')}</option>
          </select>

          <select value={form.theme || 'Claro'} onChange={(e) => setForm({ ...form, theme: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="Claro">{t('profile.light')}</option>
            <option value="Oscuro">{t('profile.dark')}</option>
          </select>

          <select value={form.preferred_bible || 'Reina Valera 1960'} onChange={(e) => {
            setForm({ ...form, preferred_bible: e.target.value })
            setCurrentBible(e.target.value)
          }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            {bibleVersions.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select value={form.preferred_language || 'es'} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="es">{t('profile.spanish')}</option>
            <option value="en">{t('profile.english')}</option>
            <option value="fr">{t('profile.french')}</option>
            <option value="pt">{t('profile.portuguese')}</option>
            <option value="it">{t('profile.italian')}</option>
          </select>

          <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: theme === 'Oscuro' ? '#94a3b8' : '#1e293b' }}>{t('profile.change_password')}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('profile.new_password')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{ padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px' }}>
                {showPassword ? t('profile.hide') : t('profile.show')}
              </button>
            </div>
            <button onClick={changePassword} style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px' }}>
              {t('profile.update')}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleSave} disabled={loading || emailError} style={{ flex: 1, padding: '10px', background: loading ? '#94a3b8' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? t('profile.saving') : t('profile.save')}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>{t('profile.cancel')}</button>
        </div>

        {saveStatus && <p style={{ textAlign: 'center', marginTop: '10px', color: saveStatus.includes('Error') ? '#ef4444' : '#10b981' }}>{saveStatus}</p>}
      </div>
    </div>
  )
}