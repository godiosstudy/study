import { supabase } from './services/supabase'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Study</h1>
      <p>Conexión a Supabase: <span id="status">Verificando...</span></p>
    </div>
  )
}

// Prueba de conexión
supabase
  .from('verses')
  .select('*', { count: 'exact', head: true })
  .then(({ error }) => {
    const status = document.getElementById('status')
    if (status) {
      status.textContent = error ? 'Error' : 'Conectado!'
      status.style.color = error ? 'red' : 'green'
    }
  })

export default App