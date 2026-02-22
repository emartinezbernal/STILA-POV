import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// CONFIGURACIÓN SUPABASE
const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// PASO 5: ESTÉTICA DARK MODE V25
const theme = {
  bg: '#020617',
  card: '#0f172a',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981', // Emerald
  danger: '#ef4444',
  warning: '#f59e0b',
  install: '#3b82f6'
};

export default function StilaProV25() {
  // --- ESTADOS DE NÚCLEO ---
  const [session, setSession] = useState(JSON.parse(localStorage.getItem('stila_session')) || null);
  const [vista, setVista] = useState('login');
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // --- FORMULARIOS ---
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [busqueda, setBusqueda] = useState('');

  // PASO 2: SEGURIDAD DINÁMICA (Credenciales Maestras)
  const MASTER_USER = "ADMIN_STILA";
  const MASTER_PASS = "STILA_MASTER";

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    if (session) {
      setVista('catalogo');
      inicializarRealtime();
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    const { data: prod } = await supabase.from('productos').select('*');
    if (prod) setInventario(prod);
    const { data: userList } = await supabase.from('perfiles_usuario').select('*');
    if (userList) setUsuarios(userList);
  };

  // PASO 5: SINCRONIZACIÓN REALTIME
  const inicializarRealtime = () => {
    const channel = supabase
      .channel('cambios-stila')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (payload) => {
        fetchData();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // --- LÓGICA DE ACCESO (PASO 2) ---
  const manejarLogin = async (e) => {
    e.preventDefault();
    const { user, pass } = loginForm;

    // 1. Verificar Acceso Raíz
    if (user === MASTER_USER && pass === MASTER_PASS) {
      const sesionMaestra = { nombre: 'Root Admin', rol: 'Admin', id: 'root' };
      finalizarLogin(sesionMaestra);
      return;
    }

    // 2. Verificar en Base de Datos
    const { data: perfil, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('usuario_login', user)
      .eq('clave_acceso', pass)
      .single();

    if (perfil) {
      // Validar Expiración (90 días)
      const fechaCreacion = new Date(perfil.fecha_creacion_clave);
      const diasTranscurridos = (new Date() - fechaCreacion) / (1000 * 60 * 60 * 24);

      if (diasTranscurridos > 90) {
        alert("⚠️ CLAVE EXPIRADA. Contacte al Administrador para renovación.");
        return;
      }
      finalizarLogin(perfil);
    } else {
      alert("Credenciales incorrectas.");
    }
  };

  const finalizarLogin = (userData) => {
    setSession(userData);
    localStorage.setItem('stila_session', JSON.stringify(userData));
  };

  const cerrarSesion = () => {
    localStorage.removeItem('stila_session');
    setSession(null);
    setVista('login');
  };

  // --- INTELIGENCIA DE CATÁLOGO (PASO 3) ---
  const stockEnCarrito = (id) => carrito.filter(item => item.id === id).length;

  const catalogoFiltrado = useMemo(() => {
    return inventario.filter(p => {
      const stockDisponible = p.stock - stockEnCarrito(p.id);
      return stockDisponible > 0 && p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [inventario, carrito, busqueda]);

  // ALERTAS PROACTIVAS
  const verificarAlertaStock = (producto) => {
    if (producto.stock >= 1 && producto.stock <= 3) {
      // Alerta Sonora
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play();
      return true;
    }
    return false;
  };

  const enviarWhatsAppStock = (p) => {
    const msg = `⚠️ *ALERTA DE RESURTIDO*\nProducto: ${p.nombre}\nLote: ${p.lote}\nStock Actual: ${p.stock} unidades.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- GENERACIÓN DE TICKET 80mm (MÓDULO SOLICITADO) ---
  const generarTicketPDF = (ventaData) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    doc.setFontSize(12);
    doc.text("STILA-PRO V25.17", 40, 10, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Folio: ${ventaData.folio}`, 40, 15, { align: "center" });
    doc.text(`Vendedor: ${session.nombre}`, 5, 22);
    doc.line(5, 25, 75, 25);
    
    let y = 30;
    carrito.forEach(item => {
      doc.text(`${item.nombre.substring(0,15)}`, 5, y);
      doc.text(`$${item.precio}`, 75, y, { align: "right" });
      y += 5;
    });

    doc.line(5, y, 75, y);
    doc.setFontSize(10);
    doc.text(`TOTAL: $${ventaData.total}`, 75, y + 7, { align: "right" });
    doc.save(`Ticket_${ventaData.folio}.pdf`);
  };

  // --- RENDERIZADO DE VISTAS ---
  if (!session) {
    return (
      <div style={{ backgroundColor: theme.bg, height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: theme.card, padding: '30px', borderRadius: '15px', width: '300px', border: `1px solid ${theme.border}` }}>
          <h2 style={{ color: theme.accent, textAlign: 'center', marginBottom: '20px' }}>STILA-PRO</h2>
          <form onSubmit={manejarLogin}>
            <input 
              placeholder="Usuario" 
              style={styles.input} 
              onChange={e => setLoginForm({...loginForm, user: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              style={styles.input} 
              onChange={e => setLoginForm({...loginForm, pass: e.target.value})} 
            />
            <button style={{ ...styles.btn, background: theme.accent }}>INGRESAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.bg, minHeight: '100vh', color: theme.text, paddingBottom: '80px' }}>
      {/* HEADER */}
      <header style={{ padding: '15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <span>⚡ <b>STILA-PRO V25</b></span>
        <button onClick={cerrarSesion} style={{ color: theme.danger, background: 'none', border: 'none' }}>Cerrar</button>
      </header>

      <main style={{ padding: '20px' }}>
        {vista === 'catalogo' && (
          <div>
            <input 
              placeholder="🔍 Buscar producto..." 
              style={styles.input} 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {catalogoFiltrado.map(p => (
                <div key={p.id} style={{ ...styles.card, borderColor: p.stock <= 3 ? theme.warning : theme.border }}>
                  <p style={{ fontSize: '10px', color: theme.textMuted }}>LOTE: {p.lote}</p>
                  <h4 style={{ margin: '5px 0' }}>{p.nombre}</h4>
                  <p style={{ color: theme.accent, fontWeight: 'bold' }}>${p.precio}</p>
                  
                  {p.stock <= 3 && (
                    <button onClick={() => enviarWhatsAppStock(p)} style={styles.btnWa}>WA Alerta 📱</button>
                  )}
                  
                  <button 
                    onClick={() => setCarrito([...carrito, p])}
                    style={{ ...styles.btn, marginTop: '10px', fontSize: '11px' }}
                  >
                    Añadir al Carrito
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'pos' && (
          <div style={styles.card}>
            <h3>Carrito ({carrito.length})</h3>
            {carrito.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>{item.nombre}</span>
                <span>${item.precio}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '10px', marginTop: '10px' }}>
              <h4>Total: ${carrito.reduce((a, b) => a + b.precio, 0)}</h4>
              <button 
                onClick={() => {
                  generarTicketPDF({ folio: 'V-1001', total: carrito.reduce((a, b) => a + b.precio, 0) });
                  alert("Venta Procesada");
                  setCarrito([]);
                }}
                style={{ ...styles.btn, background: theme.accent }}
              >
                FINALIZAR Y TICKET
              </button>
            </div>
          </div>
        )}
      </main>

      {/* NAV INFERIOR (LAS 7 VENTANAS) */}
      <nav style={styles.nav}>
        <button onClick={() => setVista('catalogo')} style={styles.navBtn}>📦<br/>Catálogo</button>
        <button onClick={() => setVista('pos')} style={styles.navBtn}>
          🛒<br/>POS {carrito.length > 0 && <span style={styles.badge}>{carrito.length}</span>}
        </button>
        <button onClick={() => setVista('apartados')} style={styles.navBtn}>🔖<br/>Apartados</button>
        <button onClick={() => setVista('logistica')} style={styles.navBtn}>🚚<br/>Logística</button>
        <button onClick={() => setVista('dashboard')} style={styles.navBtn}>📊<br/>BI</button>
        <button onClick={() => setVista('admin')} style={styles.navBtn}>⚙️<br/>Admin</button>
      </nav>
    </div>
  );
}

const styles = {
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.bg, color: '#fff', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', background: theme.card },
  card: { background: theme.card, padding: '15px', borderRadius: '12px', border: `1px solid ${theme.border}`, position: 'relative' },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.card, display: 'flex', justifyContent: 'space-around', padding: '10px', borderTop: `1px solid ${theme.border}` },
  navBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '10px', textAlign: 'center' },
  badge: { background: theme.danger, color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '9px', position: 'absolute' },
  btnWa: { background: '#25D366', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '10px', padding: '5px', width: '100%', marginTop: '5px' }
};
