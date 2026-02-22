import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- TEMA DARK MODE V25 ---
const theme = {
  bg: '#020617',
  card: '#0f172a',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  install: '#3b82f6',
  master: '#8b5cf6'
};

export default function App() {
  // --- 1. SEGURIDAD Y MULTIUSUARIO ---
  const [auth, setAuth] = useState(JSON.parse(localStorage.getItem('authStilaV25')) || { user: '', role: '', pass: '' });
  const [inputLogin, setInputLogin] = useState({ user: '', pass: '' });
  
  // --- ESTADOS NUCLEARES ---
  const [vista, setVista] = useState('catalogo');
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [anuncio, setAnuncio] = useState('Bienvenido a STILA-PRO V25. Sistema Sincronizado.');

  // --- INTELIGENCIA FINANCIERA Y LOTES ---
  const [lotes, setLotes] = useState(JSON.parse(localStorage.getItem('lotesStila')) || []);
  const [gastosExtra, setGastosExtra] = useState({ envio: 0, instalacion: 0 });
  const [politicasTicket, setPoliticasTicket] = useState(localStorage.getItem('politicasStila') || "• Sin cambios en liquidación.\n• Garantía: 48 hrs.");
  const [equipo, setEquipo] = useState(JSON.parse(localStorage.getItem('equipoStila')) || []);
  const [instalaciones, setInstalaciones] = useState(JSON.parse(localStorage.getItem('instStilaPro')) || []);

  // --- EFECTOS: REALTIME (Punto 1.2) ---
  useEffect(() => {
    if (auth.user) {
      obtenerTodo();
      cargarScripts();

      // Suscripción en Tiempo Real
      const channel = supabase
        .channel('stila-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => obtenerTodo())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => obtenerTodo())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [auth]);

  async function obtenerTodo() {
    const { data: p } = await supabase.from('productos').select('*').order('nombre');
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
    if (p) setInventario(p);
    if (v) setHistorial(v);
  }

  const cargarScripts = () => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
      document.head.appendChild(s);
    }
    if (!window.jspdf) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(s);
    }
  };

  // --- LÓGICA DE ACCESO (Punto 1.1) ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (inputLogin.pass === 'STILA_MASTER') {
      const userData = { 
        user: inputLogin.user.toUpperCase(), 
        role: inputLogin.user.includes('ADMIN') ? 'Administrador' : 'Vendedor' 
      };
      setAuth(userData);
      localStorage.setItem('authStilaV25', JSON.stringify(userData));
    } else {
      alert("CLAVE MAESTRA INCORRECTA");
    }
  };

  // --- EXPORTACIÓN EXCEL (Punto 2.3) ---
  const exportarExcel = () => {
    const dataExport = historial.map(v => ({
        Folio: v.folio_ticket,
        Fecha: new Date(v.created_at).toLocaleDateString(),
        Vendedor: v.vendedor_nombre,
        Total: v.total,
        Utilidad: v.utilidad_neta,
        Detalles: v.detalles
    }));
    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte_Global");
    XLSX.writeFile(wb, `STILA_V25_REPORTE.xlsx`);
  };

  // --- ALERTAS WHATSAPP (Punto 3.2) ---
  const alertaStockBajo = (prod) => {
    const msg = `⚠️ *RESURTIDO URGENTE*\nProducto: ${prod.nombre}\nStock Actual: ${prod.stock}\nCosto Último Lote: $${prod.costo_unitario}`;
    window.open(`https://wa.me/521XXXXXXXXXX?text=${encodeURIComponent(msg)}`); 
  };

  // --- TICKET DINÁMICO (Punto 4) ---
  const imprimirTicketV25 = (venta, folio) => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [80, 160] });
    doc.setFontSize(12); doc.text("STILA-PRO V25", 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Folio: ${folio}`, 10, 20);
    doc.text(`Vendedor: ${auth.user}`, 10, 25);
    doc.line(5, 28, 75, 28);
    
    // Desglose de costos adicionales (Punto 2.2)
    doc.text(`ENVÍO: $${gastosExtra.envio}`, 10, 35);
    doc.text(`INSTALACIÓN: $${gastosExtra.instalacion}`, 10, 40);
    doc.setFontSize(10);
    doc.text(`TOTAL: $${venta.total}`, 70, 50, { align: 'right' });
    
    doc.line(5, 55, 75, 55);
    doc.setFontSize(7);
    const pols = doc.splitTextToSize(politicasTicket, 65);
    doc.text(pols, 10, 60);
    doc.save(`Ticket_${folio}.pdf`);
  };

  async function finalizarVenta() {
    const subtotal = carrito.reduce((a, b) => a + Number(b.precio), 0);
    const totalFinal = subtotal + Number(gastosExtra.envio) + Number(gastosExtra.instalacion);
    const costoTotal = carrito.reduce((a, b) => a + Number(b.costo_unitario || 0), 0);
    const folio = `TKT-${Math.floor(1000 + Math.random() * 8999)}`;

    const { data, error } = await supabase.from('ventas').insert([{
      total: totalFinal,
      costo_total: costoTotal,
      utilidad_neta: totalFinal - costoTotal,
      folio_ticket: folio,
      vendedor_nombre: auth.user,
      detalles: `Envío: $${gastosExtra.envio} | Inst: $${gastosExtra.instalacion} | Productos: ` + carrito.map(i => i.nombre).join(', ')
    }]).select();

    if (!error) {
      imprimirTicketV25(data[0], folio);
      setCarrito([]);
      setGastosExtra({ envio: 0, instalacion: 0 });
      obtenerTodo();
    }
  }

  // --- ESTILOS ---
  const cardStyle = { background: theme.card, borderRadius: '15px', padding: '15px', border: `1px solid ${theme.border}`, marginBottom: '12px' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' };

  if (!auth.user) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px' }}>
          <h1 style={{ color: theme.accent, textAlign: 'center', margin: '0 0 20px 0' }}>STILA-PRO V25</h1>
          <form onSubmit={handleLogin}>
            <input placeholder="NOMBRE EN DIRECTORIO" onChange={e => setInputLogin({...inputLogin, user: e.target.value})} style={{ ...inputStyle, marginBottom: '10px' }} required />
            <input type="password" placeholder="CLAVE MAESTRA" onChange={e => setInputLogin({...inputLogin, pass: e.target.value})} style={{ ...inputStyle, marginBottom: '20px' }} required />
            <button style={{ width: '100%', padding: '15px', background: theme.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor:'pointer' }}>ENTRAR AL SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 3.1 ANUNCIOS ADMIN */}
      <div style={{ background: theme.master, color: '#fff', padding: '8px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
        <marquee>📢 {anuncio} | Vendedor: {auth.user} | [SINCRONIZADO REALTIME]</marquee>
      </div>

      <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        
        {vista === 'catalogo' && (
          <>
            <input placeholder="🔍 Buscar en inventario..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {inventario.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <div key={p.id} style={{...cardStyle, border: p.stock <= 3 ? `1px solid ${theme.danger}` : `1px solid ${theme.border}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px'}}>
                    <span style={{color: p.stock <= 3 ? theme.danger : theme.accent}}>STOCK: {p.stock}</span>
                    {p.stock <= 3 && <button onClick={() => alertaStockBajo(p)} style={{background:'none', border:'none'}}>🔔</button>}
                  </div>
                  <h4 style={{margin:'10px 0'}}>{p.nombre}</h4>
                  <p style={{fontSize:'20px', fontWeight:'bold', margin:0}}>${p.precio}</p>
                  <button onClick={()=>setCarrito([...carrito, p])} style={{width:'100%', marginTop:'10px', padding:'10px', background:theme.accent, color:'#fff', border:'none', borderRadius:'10px'}}>AGREGAR</button>
                </div>
              ))}
            </div>
          </>
        )}

        {vista === 'pos' && (
          <>
            <div style={{...cardStyle, border: `2px solid ${theme.accent}`, textAlign:'center'}}>
              <p style={{margin:0, color:theme.accent, fontSize:'12px'}}>TOTAL A PAGAR</p>
              <h2 style={{fontSize:'45px', margin:0}}>${carrito.reduce((a,b)=>a+Number(b.precio), 0) + Number(gastosExtra.envio) + Number(gastosExtra.instalacion)}</h2>
            </div>
            
            {/* 2.2 COSTOS ADICIONALES */}
            <div style={{...cardStyle, display:'flex', gap:'10px'}}>
              <div style={{flex:1}}>
                <label style={{fontSize:'10px', color:theme.textMuted}}>COSTO ENVÍO</label>
                <input type="number" value={gastosExtra.envio} onChange={e=>setGastosExtra({...gastosExtra, envio: e.target.value})} style={inputStyle} />
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:'10px', color:theme.textMuted}}>COSTO INSTALACIÓN</label>
                <input type="number" value={gastosExtra.instalacion} onChange={e=>setGastosExtra({...gastosExtra, instalacion: e.target.value})} style={inputStyle} />
              </div>
            </div>

            {carrito.map((item, idx) => (
              <div key={idx} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <span>{item.nombre}</span>
                <span style={{color:theme.accent}}>${item.precio}</span>
              </div>
            ))}
            {carrito.length > 0 && <button onClick={finalizarVenta} style={{width:'100%', padding:'20px', background:theme.accent, color:'#fff', borderRadius:'15px', border:'none', fontWeight:'bold', fontSize:'18px'}}>FINALIZAR COBRO</button>}
          </>
        )}

        {vista === 'admin' && (
          <div>
            {/* 2.3 REPORTE GLOBAL */}
            <button onClick={exportarExcel} style={{...cardStyle, width:'100%', background:theme.install, color:'#fff', fontWeight:'bold', border:'none', cursor:'pointer'}}>📊 EXPORTAR REPORTE GLOBAL (XLSX)</button>
            
            <div style={cardStyle}>
              <h3 style={{fontSize:'14px', color:theme.accent}}>⚙️ EDITOR DE POLÍTICAS</h3>
              <textarea 
                value={politicasTicket} 
                onChange={e => {setPoliticasTicket(e.target.value); localStorage.setItem('politicasStila', e.target.value);}} 
                style={{...inputStyle, height:'100px', fontSize:'12px'}}
              />
            </div>

            <div style={cardStyle}>
              <h3 style={{fontSize:'14px', color:theme.master}}>📢 CAMBIAR ANUNCIO</h3>
              <input placeholder="Escribe el mensaje para el equipo..." onChange={e => setAnuncio(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}
      </main>

      {/* NAVEGACIÓN */}
      <nav style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-around', padding: '15px', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
        <button onClick={()=>setVista('catalogo')} style={{background: vista==='catalogo'?theme.accent:'none', border:'none', color:'#fff', fontSize:'20px', borderRadius:'10px', padding:'5px 15px'}}>📦</button>
        <button onClick={()=>setVista('pos')} style={{background: vista==='pos'?theme.accent:'none', border:'none', color:'#fff', fontSize:'20px', borderRadius:'10px', padding:'5px 15px'}}>🛒</button>
        {auth.role === 'Administrador' && (
          <button onClick={()=>setVista('admin')} style={{background: vista==='admin'?theme.accent:'none', border:'none', color:'#fff', fontSize:'20px', borderRadius:'10px', padding:'5px 15px'}}>⚙️</button>
        )}
      </nav>
    </div>
  );
}
