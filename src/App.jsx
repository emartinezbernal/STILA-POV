import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- TEMA DARK MODE V16 ---
const theme = {
  bg: '#020617',
  card: '#0f172a',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  live: '#eab308',
  pdf: '#e11d48',
  excel: '#16a34a',
  apartado: '#8b5cf6',
  install: '#3b82f6'
};

export default function App() {
  // --- ESTADOS NUCLEARES ---
  const [usuarioActual, setUsuarioActual] = useState(localStorage.getItem('userStilaPro') || '');
  const [inputLogin, setInputLogin] = useState('');
  const [vista, setVista] = useState('catalogo');
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // --- NUEVOS ESTADOS V16 (EQUIPO Y LOTES) ---
  const [equipo, setEquipo] = useState(JSON.parse(localStorage.getItem('equipoStila')) || []);
  const [lotes, setLotes] = useState(JSON.parse(localStorage.getItem('lotesStila')) || []);
  const [nuevoMiembro, setNuevoMiembro] = useState({ nombre: '', rol: 'Vendedor', whatsapp: '' });
  
  // --- ESTADOS EXISTENTES ---
  const [apartados, setApartados] = useState(JSON.parse(localStorage.getItem('apartadosStilaPro')) || []);
  const [instalaciones, setInstalaciones] = useState(JSON.parse(localStorage.getItem('instStilaPro')) || []);
  const [capturasLive, setCapturasLive] = useState([]);
  const [cortes, setCortes] = useState(JSON.parse(localStorage.getItem('cortesStilaPro')) || []);
  
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', costo: '', cantidad: 1, paca: '', proveedor: '' });
  const [mostrarModalInstalacion, setMostrarModalInstalacion] = useState(false);
  const [nuevaInst, setNuevaInst] = useState({ cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' });
  
  const audioAlerta = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
  const inputNombreRef = useRef(null);

  const obtenerFechaLocal = () => new Date().toISOString().split('T')[0];
  const hoyStr = useMemo(() => obtenerFechaLocal(), []);
  const [fechaConsulta, setFechaConsulta] = useState(hoyStr);

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    if (usuarioActual) {
      obtenerTodo();
      cargarScriptsExternos();
    }
  }, [usuarioActual]);

  async function obtenerTodo() {
    const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (p) {
      setInventario(p);
      // Alerta sonora si hay stock crítico
      if (p.some(item => item.stock <= 3)) audioAlerta.current.play().catch(() => {});
    }
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
    if (v) setHistorial(v);
    const { data: g } = await supabase.from('gastos').select('*').order('created_at', { ascending: false });
    if (g) setGastos(g);
  }

  const cargarScriptsExternos = () => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
      document.head.appendChild(s);
    }
    if (!window.jspdf) {
      const s1 = document.createElement("script");
      s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
      document.head.appendChild(s2);
    }
  };

  // --- LÓGICA DE EQUIPO ---
  const agregarMiembroEquipo = (e) => {
    e.preventDefault();
    const nuevaLista = [...equipo, { ...nuevoMiembro, id: Date.now() }];
    setEquipo(nuevaLista);
    localStorage.setItem('equipoStila', JSON.stringify(nuevaLista));
    setNuevoMiembro({ nombre: '', rol: 'Vendedor', whatsapp: '' });
  };

  // --- ALARMAS WHATSAPP INSTALACIÓN ---
  const notificarEquipoInstalacion = (inst) => {
    const instaladorData = equipo.find(e => e.nombre === inst.instalador);
    const adminData = equipo.find(e => e.rol === 'Administrador');
    
    let msg = `*🔔 ALARMA DE INSTALACIÓN - STILA-PRO*\n`;
    msg += `--------------------------\n`;
    msg += `👤 Cliente: ${inst.cliente}\n`;
    msg += `📍 Dirección: ${inst.direccion}\n`;
    msg += `📅 Fecha: ${inst.fecha} | ⏰ Hora: ${inst.hora}\n`;
    msg += `👷 Responsable: ${inst.instalador}\n`;
    msg += `--------------------------\n`;
    msg += `Favor de confirmar recepción de orden.`;

    const telDestino = instaladorData?.whatsapp || inst.telefono;
    window.open(`https://wa.me/${telDestino}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- DASHBOARD ANALÍTICA ---
  const statsGlobales = useMemo(() => {
    const totalVentas = historial.reduce((a, b) => a + (b.total || 0), 0);
    const totalCostos = historial.reduce((a, b) => a + (b.costo_total || 0), 0);
    const valorInventario = inventario.reduce((a, b) => a + (b.stock * (b.costo_unitario || 0)), 0);
    
    // Ranking de productos
    const conteoProd = {};
    historial.forEach(v => {
        const matches = v.detalles?.match(/([a-zA-Z0-9\s]+)\s\(x(\d+)\)/g);
        if (matches) {
            matches.forEach(m => {
                const name = m.split(' (x')[0];
                const qty = parseInt(m.match(/\(x(\d+)\)/)[1]);
                conteoProd[name] = (conteoProd[name] || 0) + qty;
            });
        }
    });
    const ranking = Object.entries(conteoProd).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return { totalVentas, totalCostos, utilidad: totalVentas - totalCostos, valorInventario, ranking };
  }, [historial, inventario]);

  // --- LÓGICA DE VENTA & TICKET ---
  const imprimirTicket = (venta) => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [80, 150] });
    doc.setFontSize(10);
    doc.text("STILA-PRO V16", 40, 10, { align: 'center' });
    doc.setFontSize(7);
    doc.text(`Folio: ${venta.detalles?.match(/\[(.*?)\]/)?.[1] || 'TKT-GEN'}`, 10, 18);
    doc.text(`Fecha: ${new Date(venta.created_at).toLocaleString()}`, 10, 22);
    doc.text(`Atendió: ${venta.detalles?.match(/Vendedor: (.*?) \|/)?.[1] || 'Admin'}`, 10, 26);
    doc.line(5, 28, 75, 28);
    
    doc.text("DETALLE DE COMPRA", 40, 32, { align: 'center' });
    const productos = venta.detalles?.split('Productos: ')[1] || "Sin detalle";
    doc.setFontSize(6);
    const splitProd = doc.splitTextToSize(productos, 65);
    doc.text(splitProd, 10, 38);
    
    doc.setFontSize(9);
    doc.text(`TOTAL: $${venta.total}`, 70, 70, { align: 'right' });
    
    doc.setFontSize(6);
    doc.line(5, 75, 75, 75);
    doc.text("POLÍTICAS DE COMPRA", 40, 80, { align: 'center' });
    doc.text("• Sin cambios ni devoluciones en liquidación.", 10, 84);
    doc.text("• Apartados válidos por 7 días naturales.", 10, 87);
    doc.text("• Garantía de instalación: 48 hrs después del servicio.", 10, 90);
    
    doc.save(`Ticket_${venta.id}.pdf`);
  };

  async function finalizarVenta() {
    if (carrito.length === 0) return;
    const m = window.prompt("1. Efectivo | 2. Transferencia | 3. Tarjeta", "1");
    if (!m) return;
    let mTxt = m === "1" ? "Efectivo" : m === "2" ? "Transferencia" : "Tarjeta";
    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const cv = carrito.reduce((a, b) => a + (b.costo_unitario || 0), 0);
    const folioVenta = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const hora = new Date().toLocaleTimeString();

    try {
      const { data, error } = await supabase.from('ventas').insert([{ 
        total: tv, 
        costo_total: cv, 
        detalles: `🛒 [${folioVenta}] Vendedor: ${usuarioActual} | Pago: ${mTxt} | Hora: ${hora} | Productos: ` + 
        carrito.map(i => `${i.nombre} (x1)`).join(', ') 
      }]).select();

      for (const item of carrito) {
        await supabase.from('productos').update({ stock: item.stock - 1 }).eq('id', item.id);
      }

      alert("Venta procesada con éxito.");
      if(data) imprimirTicket(data[0]);
      setCarrito([]); 
      obtenerTodo();
    } catch (e) { console.error(e); }
  }

  // --- ESTILOS COMPARTIDOS ---
  const cardStyle = { background: theme.card, borderRadius: '15px', padding: '15px', border: `1px solid ${theme.border}`, marginBottom: '12px', color: theme.text };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' };
  const btnClass = "btn-interactivo";

  if (!usuarioActual) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h1 style={{ color: theme.accent, fontSize: '28px', marginBottom: '10px' }}>STILA-PRO ⚡</h1>
          <form onSubmit={(e) => { e.preventDefault(); if(inputLogin) { setUsuarioActual(inputLogin.toUpperCase()); localStorage.setItem('userStilaPro', inputLogin.toUpperCase()); }}}>
            <input autoFocus placeholder="ID DE USUARIO" value={inputLogin} onChange={e => setInputLogin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', marginBottom: '15px' }} />
            <button className={btnClass} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>INICIAR SESIÓN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', paddingBottom: '100px' }}>
      <header style={{ background: theme.card, padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, position: 'sticky', top:0, zIndex:50 }}>
        <h1 style={{margin:0, fontSize:'16px'}}>STILA <span style={{color: theme.accent}}>PRO V16</span></h1>
        <div style={{ display:'flex', alignItems:'center', gap: '10px'}}>
           <span style={{ fontSize: '11px', color: theme.textMuted }}>👤 {usuarioActual}</span>
           <button onClick={() => { localStorage.removeItem('userStilaPro'); setUsuarioActual(''); }} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: '11px' }}>SALIR</button>
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* --- VISTA CATÁLOGO CON ALERTAS --- */}
        {vista === 'catalogo' && (
          <>
            <input placeholder="🔍 Buscar producto o paca..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {inventario.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <div key={p.id} style={{...cardStyle, border: p.stock <= 3 ? `1px solid ${theme.danger}` : `1px solid ${theme.border}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px', color:theme.textMuted}}>
                    <span>LOTE: {p.paca || 'N/A'}</span>
                    <span style={{color: p.stock <= 3 ? theme.danger : theme.accent, fontWeight:'bold'}}>STOCK: {p.stock}</span>
                  </div>
                  <h4 style={{margin:'8px 0', fontSize:'14px'}}>{p.nombre}</h4>
                  <p style={{fontSize:'20px', fontWeight:'bold', margin:0}}>${p.precio}</p>
                  <button className={btnClass} onClick={()=>setCarrito([...carrito, p])} style={{width:'100%', marginTop:'10px', padding:'10px', background:theme.bg, color:theme.accent, border:`1px solid ${theme.border}`, borderRadius:'8px', fontWeight:'bold'}}>+ CARRITO</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- VISTA ADMIN V16 (DASHBOARD & EQUIPO) --- */}
        {vista === 'admin' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* ANALÍTICA */}
            <div style={{...cardStyle, background: `linear-gradient(135deg, ${theme.card}, #1e293b)`}}>
                <h3 style={{fontSize:'12px', color:theme.accent, margin:0}}>RESUMEN DE NEGOCIO</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'15px'}}>
                    <div><p style={{margin:0, fontSize:'10px', color:theme.textMuted}}>Ventas Totales</p><h2 style={{margin:0}}>${statsGlobales.totalVentas}</h2></div>
                    <div><p style={{margin:0, fontSize:'10px', color:theme.textMuted}}>Utilidad Neta</p><h2 style={{margin:0, color:theme.accent}}>${statsGlobales.utilidad}</h2></div>
                    <div><p style={{margin:0, fontSize:'10px', color:theme.textMuted}}>Valor Inventario</p><h2 style={{margin:0, color:theme.install}}>${statsGlobales.valorInventario}</h2></div>
                    <div><p style={{margin:0, fontSize:'10px', color:theme.textMuted}}>Costo Mercancía</p><h2 style={{margin:0, color:theme.danger}}>${statsGlobales.totalCostos}</h2></div>
                </div>
            </div>

            {/* GESTIÓN DE EQUIPO */}
            <div style={cardStyle}>
                <h3 style={{fontSize:'14px', marginBottom:'15px', display:'flex', alignItems:'center', gap:'10px'}}>👥 DIRECTORIO DE EQUIPO</h3>
                <form onSubmit={agregarMiembroEquipo} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <input placeholder="Nombre Completo" value={nuevoMiembro.nombre} onChange={e=>setNuevoMiembro({...nuevoMiembro, nombre: e.target.value})} style={inputStyle} required />
                    <div style={{display:'flex', gap:'10px'}}>
                        <select value={nuevoMiembro.rol} onChange={e=>setNuevoMiembro({...nuevoMiembro, rol: e.target.value})} style={{...inputStyle, flex:1}}>
                            <option>Administrador</option>
                            <option>Vendedor</option>
                            <option>Instalador</option>
                        </select>
                        <input placeholder="WhatsApp (521...)" value={nuevoMiembro.whatsapp} onChange={e=>setNuevoMiembro({...nuevoMiembro, whatsapp: e.target.value})} style={{...inputStyle, flex:1}} required />
                    </div>
                    <button className={btnClass} style={{background:theme.accent, color:'#fff', border:'none', padding:'12px', borderRadius:'10px', fontWeight:'bold'}}>REGISTRAR MIEMBRO</button>
                </form>
                <div style={{marginTop:'20px'}}>
                    {equipo.map(m => (
                        <div key={m.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${theme.border}`}}>
                            <div>
                                <p style={{margin:0, fontWeight:'bold'}}>{m.nombre}</p>
                                <span style={{fontSize:'10px', color:theme.textMuted}}>{m.rol}</span>
                            </div>
                            <button onClick={() => window.open(`https://wa.me/${m.whatsapp}`)} style={{background:'none', border:`1px solid ${theme.accent}`, color:theme.accent, borderRadius:'5px', padding:'2px 10px', fontSize:'10px'}}>Chat</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ALTA DE PRODUCTOS */}
            <div style={cardStyle}>
                <h3 style={{fontSize:'14px', marginBottom:'15px'}}>⚡ REGISTRO RÁPIDO DE INVENTARIO</h3>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    await supabase.from('productos').insert([{ 
                        nombre: nuevoProd.nombre, 
                        precio: Number(nuevoProd.precio), 
                        costo_unitario: Number(nuevoProd.costo), 
                        stock: Number(nuevoProd.cantidad), 
                        paca: nuevoProd.paca, 
                        proveedor: nuevoProd.proveedor 
                    }]);
                    setNuevoProd({ nombre: '', precio: '', costo: '', cantidad: 1, paca: '', proveedor: '' });
                    obtenerTodo();
                }}>
                    <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                        <input placeholder="Lote/Paca" value={nuevoProd.paca} onChange={e=>setNuevoProd({...nuevoProd, paca: e.target.value})} style={inputStyle} />
                        <input placeholder="Proveedor" value={nuevoProd.proveedor} onChange={e=>setNuevoProd({...nuevoProd, proveedor: e.target.value})} style={inputStyle} />
                    </div>
                    <input placeholder="Nombre del Producto" value={nuevoProd.nombre} onChange={e=>setNuevoProd({...nuevoProd, nombre: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                    <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                        <input type="number" placeholder="Costo U." value={nuevoProd.costo} onChange={e=>setNuevoProd({...nuevoProd, costo: e.target.value})} style={inputStyle} required />
                        <input type="number" placeholder="P. Venta" value={nuevoProd.precio} onChange={e=>setNuevoProd({...nuevoProd, precio: e.target.value})} style={inputStyle} required />
                        <input type="number" placeholder="Cant." value={nuevoProd.cantidad} onChange={e=>setNuevoProd({...nuevoProd, cantidad: e.target.value})} style={inputStyle} required />
                    </div>
                    <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.accent, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>GUARDAR EN NUBE ☁️</button>
                </form>
            </div>
          </div>
        )}

        {/* --- VISTA POS --- */}
        {vista === 'pos' && (
          <>
            <div style={{...cardStyle, textAlign:'center', border: `2px solid ${theme.accent}`, background: theme.bg}}>
              <p style={{margin:0, fontSize:'10px', color:theme.accent}}>TOTAL A COBRAR</p>
              <h2 style={{fontSize:'48px', margin:0}}>${carrito.reduce((a,b)=>a+b.precio, 0)}</h2>
            </div>
            {carrito.map((item, idx) => (
              <div key={idx} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <p style={{margin:0, fontWeight:'bold'}}>{item.nombre}</p>
                  <p style={{margin:0, fontSize:'12px', color:theme.accent}}>${item.precio}</p>
                </div>
                <button onClick={() => {
                  const newCar = [...carrito];
                  newCar.splice(idx, 1);
                  setCarrito(newCar);
                }} style={{color:theme.danger, background:'none', border:'none'}}>Eliminar</button>
              </div>
            ))}
            {carrito.length > 0 && (
                <div style={{display:'flex', gap:'10px'}}>
                    <button className={btnClass} onClick={finalizarVenta} style={{flex: 2, padding:'20px', background:theme.accent, color:'#fff', borderRadius:'15px', fontWeight:'bold', border:'none', fontSize:'18px'}}>COBRAR ✅</button>
                    <button className={btnClass} onClick={() => setVista('apartados')} style={{flex: 1, background:theme.apartado, color:'#fff', borderRadius:'15px', border:'none'}}>🔖</button>
                </div>
            )}
          </>
        )}

        {/* --- VISTA INSTALACIONES V16 --- */}
        {vista === 'installations' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
              <h2 style={{color: theme.install, fontSize: '18px', margin: 0}}>🛠️ ORDENES DE SERVICIO</h2>
              <button className={btnClass} onClick={() => setMostrarModalInstalacion(true)} style={{padding:'10px 15px', background:theme.install, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>NUEVA</button>
            </div>
            {instalaciones.map(inst => (
              <div key={inst.id} style={{...cardStyle, borderLeft: `5px solid ${inst.estado === 'Realizada' ? theme.accent : theme.warning}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <h4 style={{margin:0}}>{inst.cliente}</h4>
                    <p style={{margin:'4px 0', fontSize:'11px', color: theme.textMuted}}>📍 {inst.direccion}</p>
                    <p style={{margin:0, fontSize:'11px'}}>👷 <b>{inst.instalador}</b> | ⏰ {inst.hora}</p>
                  </div>
                  <button onClick={() => notificarEquipoInstalacion(inst)} style={{background:theme.warning, border:'none', borderRadius:'50%', width:'40px', height:'40px', fontSize:'18px'}}>🔔</button>
                </div>
                <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                   <button onClick={() => {
                       const list = instalaciones.map(i => i.id === inst.id ? {...i, estado:'Realizada'} : i);
                       setInstalaciones(list);
                       localStorage.setItem('instStilaPro', JSON.stringify(list));
                   }} style={{flex:1, background:theme.accent, border:'none', color:'#fff', padding:'8px', borderRadius:'8px', fontSize:'10px', fontWeight:'bold'}}>MARCAR REALIZADA</button>
                   <button onClick={() => window.open(`https://wa.me/${inst.telefono}`)} style={{background:'#25D366', border:'none', padding:'8px 15px', borderRadius:'8px'}}>📱</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- MODAL INSTALACIÓN --- */}
        {mostrarModalInstalacion && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
            <div style={{...cardStyle, maxWidth:'450px', width:'100%'}}>
              <h3 style={{marginTop:0, color: theme.install}}>PROGRAMAR INSTALACIÓN</h3>
              <form onSubmit={(e) => {
                  e.preventDefault();
                  const n = {...nuevaInst, id: Date.now(), estado: 'Pendiente'};
                  const l = [n, ...instalaciones];
                  setInstalaciones(l);
                  localStorage.setItem('instStilaPro', JSON.stringify(l));
                  setMostrarModalInstalacion(false);
                  alert("Instalación agendada. No olvide notificar al equipo.");
              }}>
                <input placeholder="Nombre Cliente" onChange={e=>setNuevaInst({...nuevaInst, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <input placeholder="Dirección Completa" onChange={e=>setNuevaInst({...nuevaInst, direccion: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input type="date" onChange={e=>setNuevaInst({...nuevaInst, fecha: e.target.value})} style={inputStyle} required />
                  <input type="time" onChange={e=>setNuevaInst({...nuevaInst, hora: e.target.value})} style={inputStyle} required />
                </div>
                <select onChange={e=>setNuevaInst({...nuevaInst, instalador: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required>
                    <option value="">Seleccionar Instalador...</option>
                    {equipo.filter(e => e.rol === 'Instalador').map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                </select>
                <input placeholder="WhatsApp Cliente" onChange={e=>setNuevaInst({...nuevaInst, telefono: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <div style={{display:'flex', gap:'10px'}}>
                  <button type="button" onClick={()=>setMostrarModalInstalacion(false)} style={{...inputStyle, background: theme.bg, flex:1}}>Cerrar</button>
                  <button type="submit" style={{...inputStyle, background: theme.install, color:'#fff', border:'none', flex:1, fontWeight:'bold'}}>CONFIRMAR</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* --- NAVEGACIÓN INFERIOR V16 --- */}
      <nav style={{ position: 'fixed', bottom: '15px', left: '15px', right: '15px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter:'blur(10px)', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-around', padding: '12px', borderRadius: '25px', zIndex: 100 }}>
        <button className={btnClass} onClick={()=>setVista('catalogo')} style={{background: vista==='catalogo'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>
          <span style={{fontSize:'24px'}}>📦</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('pos')} style={{background: vista==='pos'?theme.accent:'none', border:'none', position: 'relative', borderRadius:'15px', padding:'10px'}}>
          <span style={{fontSize:'24px'}}>🛒</span>
          {carrito.length > 0 && <span style={{ position: 'absolute', top: '0', right: '0', background: theme.danger, color: 'white', borderRadius: '50%', padding: '2px 7px', fontSize: '10px', fontWeight: 'bold' }}>{carrito.length}</span>}
        </button>
        <button className={btnClass} onClick={()=>setVista('installations')} style={{background: vista==='installations'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>
          <span style={{fontSize:'24px'}}>🛠️</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('admin')} style={{background: vista==='admin'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>
          <span style={{fontSize:'24px'}}>⚙️</span>
        </button>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-interactivo { transition: all 0.2s ease; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-interactivo:active { transform: scale(0.92); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; borderRadius: 10px; }
      `}</style>
    </div>
  );
}
