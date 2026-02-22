import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- PASO 5: ESTÉTICA DARK MODE V25 ---
const theme = {
  bg: '#020617',
  card: '#0f172a',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981', // Esmeralda Stila
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
  const [busqueda, setBusqueda] = useState('');
  
  // --- FORMULARIOS ---
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  // PASO 2: CREDENCIALES MAESTRAS (ACCESO RAÍZ)
  const MASTER_USER = "ADMIN_STILA";
  const MASTER_PASS = "STILA_MASTER";

  // --- EFECTOS E INTELIGENCIA ---
  useEffect(() => {
    if (session) {
      setVista('catalogo');
      fetchData();
      inicializarRealtime();
    }
  }, [session]);

  const fetchData = async () => {
    const { data: prod } = await supabase.from('productos').select('*');
    if (prod) setInventario(prod);
    const { data: users } = await supabase.from('perfiles_usuario').select('*');
    if (users) setUsuarios(users);
  };

  const inicializarRealtime = () => {
    const channel = supabase.channel('realtime-stila')
      .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // --- PASO 2: LOGIN Y SEGURIDAD DINÁMICA ---
  const manejarLogin = async (e) => {
    e.preventDefault();
    const { user, pass } = loginForm;

    // 1. Acceso Raíz Absoluto
    if (user === MASTER_USER && pass === MASTER_PASS) {
      finalizarLogin({ id: 'root', nombre: 'Root Admin', rol: 'Admin' });
      return;
    }

    // 2. Validación en BD
    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('usuario_login', user)
      .eq('clave_acceso', pass)
      .single();

    if (perfil) {
      // VALIDACIÓN DE EXPIRACIÓN (90 DÍAS)
      const fechaCreacion = new Date(perfil.fecha_creacion_clave);
      const hoy = new Date();
      const diffDias = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));

      if (diffDias > 90) {
        alert("🚨 CLAVE EXPIRADA (90 días). Acceso bloqueado. Contacte al Administrador.");
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

  // --- PASO 3: INTELIGENCIA DE CATÁLOGO ---
  const stockEnCarrito = (id) => carrito.filter(i => i.id === id).length;

  const catalogoFiltrado = useMemo(() => {
    return inventario.filter(p => {
      const stockDisponible = p.stock - stockEnCarrito(p.id);
      // REQUISITO: No mostrar productos con stock == 0
      return stockDisponible > 0 && p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    });
  }, [inventario, carrito, busqueda]);

  // ALERTAS PROACTIVAS
  const verificarAlertaStock = (p) => {
    const actual = p.stock - stockEnCarrito(p.id);
    if (actual >= 1 && actual <= 3) {
      // Alerta Sonora (Beep)
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(() => {});
      return true;
    }
    return false;
  };

  const enviarWhatsAppStock = (p) => {
    const msg = `📦 *REPORTE DE RESURTIDO STILA*\nProducto: ${p.nombre}\nLote: ${p.lote}\nStock Actual: ${p.stock} pzas.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- PASO 4: GENERACIÓN TICKET PDF 80mm (SOLUCIÓN BUILD ERROR) ---
  const generarTicket80mm = (ventaData) => {
    const jsPDFLib = window.jspdf?.jsPDF;
    if (!jsPDFLib) {
      alert("Error: Librería PDF no cargada. Agregue el script de jspdf en index.html");
      return;
    }

    const doc = new jsPDFLib({ unit: 'mm', format: [80, 150] });
    doc.setFontSize(14);
    doc.text("STILA-PRO V25.17", 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Folio: ${ventaData.folio}`, 5, 20);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 5, 24);
    doc.text(`Vendedor: ${session.nombre}`, 5, 28);
    doc.line(5, 30, 75, 30);
    
    let y = 35;
    carrito.forEach(item => {
      doc.text(`1x ${item.nombre.substring(0, 15)}`, 5, y);
      doc.text(`$${item.precio}`, 75, y, { align: 'right' });
      y += 5;
    });

    doc.line(5, y, 75, y);
    doc.setFontSize(10);
    doc.text(`TOTAL: $${ventaData.total}`, 75, y + 8, { align: 'right' });
    doc.save(`Ticket_${ventaData.folio}.pdf`);
  };

  // --- RENDERIZADO ---
  if (!session) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.loginCard}>
          <h2 style={{ color: theme.accent, textAlign: 'center', marginBottom: '5px' }}>STILA-PRO</h2>
          <p style={{ color: theme.textMuted, fontSize: '10px', textAlign: 'center', marginBottom: '25px' }}>ARQUITECTURA EMPRESARIAL V25.17</p>
          <form onSubmit={manejarLogin}>
            <input placeholder="Usuario" style={styles.input} onChange={e => setLoginForm({...loginForm, user: e.target.value})} />
            <input type="password" placeholder="Contraseña" style={styles.input} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
            <button style={{ ...styles.btn, background: theme.accent }}>ACCEDER AL SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, paddingBottom: '90px' }}>
      <header style={styles.header}>
        <span style={{ fontWeight: 'bold' }}>⚡ STILA-PRO</span>
        <button onClick={cerrarSesion} style={{ color: theme.danger, background: 'none', border: 'none', cursor: 'pointer' }}>Salir</button>
      </header>

      <main style={{ padding: '15px' }}>
        {vista === 'catalogo' && (
          <div>
            <input 
              placeholder="🔍 Buscar por nombre o lote..." 
              style={styles.input} 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <div style={styles.grid}>
              {catalogoFiltrado.map(p => {
                const esCritico = verificarAlertaStock(p);
                return (
                  <div key={p.id} style={{ ...styles.card, borderColor: esCritico ? theme.warning : theme.border }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: theme.textMuted }}>
                      <span>LOTE: {p.lote}</span>
                      <span>{p.proveedor}</span>
                    </div>
                    <h4 style={{ margin: '10px 0' }}>{p.nombre}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ color: theme.accent, fontSize: '18px' }}>${p.precio}</b>
                      <span style={{ fontSize: '12px' }}>Stock: {p.stock - stockEnCarrito(p.id)}</span>
                    </div>
                    {esCritico && (
                      <button onClick={() => enviarWhatsAppStock(p)} style={styles.btnWa}>Alertar Admin 📱</button>
                    )}
                    <button 
                      onClick={() => setCarrito([...carrito, p])}
                      style={{ ...styles.btn, marginTop: '10px', fontSize: '11px', background: 'none', border: `1px solid ${theme.accent}` }}
                    >
                      Añadir al Carrito
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {vista === 'pos' && (
          <div style={styles.card}>
            <h3>🛒 Carrito ({carrito.length})</h3>
            {carrito.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '5px' }}>
                <span>{item.nombre}</span>
                <b>${item.precio}</b>
              </div>
            ))}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <h2 style={{ color: theme.accent }}>Total: ${carrito.reduce((a, b) => a + b.precio, 0)}</h2>
              <button 
                onClick={() => {
                  const total = carrito.reduce((a, b) => a + b.precio, 0);
                  generarTicket80mm({ folio: `ST-${Date.now().toString().slice(-4)}`, total });
                  setCarrito([]);
                  alert("Venta procesada con éxito.");
                }}
                style={{ ...styles.btn, background: theme.accent, marginTop: '10px' }}
              >
                PAGAR Y GENERAR TICKET
              </button>
            </div>
          </div>
        )}

        {vista === 'admin' && (
          <div>
            <h3>⚙️ Admin Center</h3>
            <div style={styles.card}>
              <p>Gestión de Usuarios y Claves Expiradas</p>
              {usuarios.map(u => (
                <div key={u.id} style={{ padding: '10px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{u.nombre} ({u.rol})</span>
                  <span style={{ color: theme.textMuted, fontSize: '10px' }}>Clave: {new Date(u.fecha_creacion_clave).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav style={styles.nav}>
        <button onClick={() => setVista('catalogo')} style={{ ...styles.navBtn, color: vista === 'catalogo' ? theme.accent : theme.textMuted }}>📦<br/>Catálogo</button>
        <button onClick={() => setVista('pos')} style={{ ...styles.navBtn, color: vista === 'pos' ? theme.accent : theme.textMuted }}>
          🛒<br/>POS {carrito.length > 0 && <span style={styles.badge}>{carrito.length}</span>}
        </button>
        <button onClick={() => setVista('apartados')} style={styles.navBtn}>🔖<br/>Apartados</button>
        <button onClick={() => setVista('logistica')} style={styles.navBtn}>🚚<br/>Logística</button>
        <button onClick={() => setVista('admin')} style={{ ...styles.navBtn, color: vista === 'admin' ? theme.accent : theme.textMuted }}>⚙️<br/>Admin</button>
      </nav>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  fullCenter: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: theme.bg },
  loginCard: { background: theme.card, padding: '40px', borderRadius: '20px', width: '340px', border: `1px solid ${theme.border}` },
  header: { padding: '15px 20px', background: theme.card, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: theme.bg, color: '#fff', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '14px', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  card: { background: theme.card, padding: '15px', borderRadius: '15px', border: `1px solid ${theme.border}`, position: 'relative' },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.card, display: 'flex', justifyContent: 'space-around', padding: '12px', borderTop: `1px solid ${theme.border}` },
  navBtn: { background: 'none', border: 'none', textAlign: 'center', fontSize: '10px', cursor: 'pointer' },
  badge: { background: theme.danger, color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '9px', marginLeft: '5px' },
  btnWa: { background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '10px', padding: '8px', width: '100%', marginTop: '8px', fontWeight: 'bold' }
};
