;(function(){
  const bus = window;
  const LS_KEY = 'auth.user';

  function getUser(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }
  function setUser(u){
    if (u) localStorage.setItem(LS_KEY, JSON.stringify(u));
    else localStorage.removeItem(LS_KEY);
    bus.dispatchEvent(new CustomEvent('auth:changed', { detail: u }));
  }

    // i18n via global I18n
  function t(key){ return (window.I18n && window.I18n.t) ? window.I18n.t(key) : key; }

  function el(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.forEach(c => node.appendChild(c));
    return node;
  }

  function chip({id, icon, label, aria, onClick}){
    const btn = el('button', { class: 'chip icon-only', id, 'aria-label': label, title: label });
    const i = el('i', { 'data-lucide': icon });
    const sr = el('span', { class: 'sr-only', text: aria || label });
    btn.appendChild(i);
    btn.appendChild(sr);
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function render(){
    const hdrRight = document.querySelector('.hdr-right');
    if (!hdrRight) return;
    // Remove any old dynamic group
    let group = hdrRight.querySelector('.hdr-actions');
    if (group) group.remove();
    group = el('div', { class: 'hdr-actions' });

    const user = getUser();

    if (user){
      group.appendChild(chip({
        id: 'hdr-account',
        icon: 'user',
        label: t('buttons.myAccount'),
        onClick: ()=> window.UsersAccount?.open?.(user)
      }));
      group.appendChild(chip({
        id: 'hdr-logout',
        icon: 'user',
        label: t('buttons.logout'),
        onClick: ()=> window.UsersSignOut?.run?.(setUser)
      }));
    } else {
      group.appendChild(chip({
        id: 'hdr-signin',
        icon: 'person-standing',
        label: t('buttons.signIn'),
        onClick: ()=> window.UsersLogin?.open?.(setUser)
      }));
      group.appendChild(chip({
        id: 'hdr-register',
        icon: 'user-plus',
        label: t('buttons.register'),
        onClick: ()=> window.UsersRegister?.open?.(setUser)
      }));
    }

    // Keep existing preferences button if there, else add one
    let prefsBtn = hdrRight.querySelector('#hdr-preferences');
if (!prefsBtn){
  prefsBtn = chip({ id: 'hdr-preferences', icon: 'settings', label: t('buttons.preferences') });
} else {
  // Localize existing preferences button tooltip + a11y label
  const prefLabel = t('buttons.preferences');
  prefsBtn.setAttribute('title', prefLabel);
  prefsBtn.setAttribute('aria-label', prefLabel);
  const sr = prefsBtn.querySelector('.sr-only');
  if (sr) sr.textContent = prefLabel;
}
// Move preferences into the group as the last button (no clone)
group.appendChild(prefsBtn);
    // Remove old users button if present
    const oldUsers = hdrRight.querySelector('#hdr-users');
    if (oldUsers) oldUsers.remove();

    hdrRight.appendChild(group);

    // Cleanup: if another #hdr-preferences exists outside the group, remove it
    hdrRight.querySelectorAll('#hdr-preferences').forEach((btn)=>{
      if (btn.parentElement !== group) btn.remove();
    });
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function init(){
    render();
    window.addEventListener('prefs:applied', render);
    window.addEventListener('auth:changed', render);
    window.addEventListener('i18n:changed', render);
  }

  // Public API (simple)
  window.App = window.App || {};
  window.App.Users = { init, getUser, setUser };

  // Autoinit
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();