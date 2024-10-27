import { createRoot } from 'react-dom/client'

const App = () => {
  return <div style={{ display: 'flex', gap: '16px' }}>
    <span>TODO</span>
  </div>
}

const container = document.body.appendChild(document.createElement('div'))
createRoot(container).render(<App />)
