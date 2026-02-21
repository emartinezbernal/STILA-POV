import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Opcional: Identificador del sistema en consola al cargar
console.log("STILA PRO - Sistema Iniciado");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
