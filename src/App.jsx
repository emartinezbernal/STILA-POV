import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN SUPABASE ---
const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- TEMA VISUAL V16.2 ---
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
  const [busqueda, setBusqueda] = useState('');

  // --- PERSISTENCIA LOCAL (EQUIPO, INSTALACIONES, CONFIG) ---
  const [equipo, setEquipo] = useState(JSON.parse(localStorage.getItem('equipoStila')) || []);
  const [instalaciones, setInstalaciones] = useState(JSON.parse(localStorage.getItem('instStilaPro')) || []);
  const [configComisiones, setConfigComisiones] = useState(JSON.parse(localStorage.getItem('configComStila')) || { activa: true, porcentaje: 5 });
  const [politicasTicket, setPoliticasTicket] = useState(localStorage.getItem('politicasStila') || "• Sin cambios en liquidación.\n• Apartados: 7 días.\n• Garantía: 48 hrs.");

  // --- ESTADOS FORMULARIOS ---
  const [nuevoMiembro, setNuevoMiembro] = useState({ nombre: '', rol: 'Vendedor', whatsapp: '' });
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', costo: '', cantidad: 1, paca: '', proveedor: '' });
  const [mostrarModalInstalacion, setMostrarModalInstalacion] = useState(false);
  const [nuevaInst, setNuevaInst] = useState({ cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' });
  
  const audioAlerta = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

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
      if (p.some(item => item.stock <= 3)) audioAlerta.current.play().catch(() => {});
    }
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
    if (v) setHistorial(v);
  }

  const cargarScriptsExternos = () => {
    if (!window.jspdf) {
      const s1 = document.createElement("script");
      s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(s1);
    }
  };

  // --- LÓGICA DE NEGOCIO Y ANALÍTICA ---
  const statsGlobales = useMemo(() => {
    const totalVentas = historial.reduce((a, b) => a + (b.total || 0), 0);
    const totalCostos = historial.reduce((a, b) => a + (b.costo_total || 0), 0);
    
    // Comisiones por vendedor
    const comisionesPorVendedor = {};
    historial.forEach(v => {
      const vendMatch = v.detalles?.match(/Vendedor: (.*?) \|/);
      const nombreVend = vendMatch ? vendMatch[1] : 'Admin';
      const montoComision = configComisiones.activa ? (v.total * (configComisiones.porcentaje / 100)) : 0;
      comisionesPorVendedor[nombreVend] = (comisionesPorVendedor[nombreVend] || 0) + montoComision;
    });

    // Ranking de productos
    const conteoProd = {};
    historial.forEach(v => {
        const matches = v.detalles?.match(/([a-zA-Z0-9\s]+)\s\(x(\d+)\)/g);
        if (matches) matches.forEach(m => {
            const name = m.split(' (x')[0];
            const qty = parseInt(m.match(/\(x(\d+)\)/)[1]);
            conteoProd[name] = (conteoProd[name] || 0) + qty;
        });
    });
    const ranking = Object.entries(conteoProd).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return { totalVentas, totalCostos, utilidad: totalVentas - totalCostos, comisionesPorVendedor, ranking };
  }, [historial, configComisiones]);

  // --- TICKETING ---
  const imprimirTicket = (venta) => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: [80, 160] });
    doc.setFontSize(10);
    doc.text("STILA-PRO V16.2", 40, 10, { align: 'center' });
    doc.setFontSize(7);
    const folio = venta.detalles?.match(/\[(.*?)\]/)?.[1] || 'TKT-GEN';
    doc.text(`Folio: ${folio}`, 10, 18);
    doc.text(`Atendió: ${venta.detalles?.match(/Vendedor: (.*?) \|/)?.[1] || 'Admin'}`, 10, 22);
    doc.line(5, 25, 75, 25);
    
    doc.text("PRODUCTOS", 10, 30);
    const productos = venta.detalles?.split('Productos: ')[1] || "";
    doc.setFontSize(6);
    doc.text(doc.splitTextToSize(productos, 65), 10, 35);
    
    doc.setFontSize(9);
    doc.text(`TOTAL: $${venta.total}`, 70, 70, { align: 'right' });
    
    doc.line(5, 75, 75, 75);
    doc.setFontSize(7);
    doc.text("POLÍTICAS", 40, 80, { align: 'center' });
    doc.setFontSize(6);
    doc.text(doc.splitTextToSize(politicasTicket, 65), 10, 85);
    
    doc.save(`Ticket_${folio}.pdf`);
  };

  async function finalizarVenta() {
    if (carrito.length === 0) return;
    const metodo = window.prompt("1. Efectivo | 2. Transferencia | 3. Tarjeta", "1");
    if (!metodo) return;
    const mTxt = metodo === "1" ? "Efectivo" : metodo === "2" ? "Transferencia" : "Tarjeta";
    const total = carrito.reduce((a, b) => a + b.precio, 0);
    const costo = carrito.reduce((a, b) => a + (b.costo_unitario || 0), 0);
    const folio = `TKT-${Math.floor(1000 + Math.random() * 8999)}`;

    const { data, error } = await supabase.from('ventas').insert([{ 
      total, costo_total: costo, 
      detalles: `🛒 [${folio}] Vendedor: ${usuarioActual} | Pago: ${mTxt} | Productos: ` + carrito.map(i => `${i.nombre} (x1)`).join(', ') 
    }]).select();

    for (const item of carrito) {
      await supabase.from('productos').update({ stock: item.stock - 1 }).eq('id', item.id);
    }
    
    if(data) imprimirTicket(data[0]);
    setCarrito([]); 
    obtenerTodo();
  }

  // --- ESTILOS ---
  const cardStyle = { background: theme.card, borderRadius: '15px', padding: '15px', border: `1px solid ${theme.border}`, marginBottom: '12px' };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' };

  if (!usuarioActual) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h1 style={{ color: theme.accent, fontSize: '28px' }}>STILA-PRO ⚡</h1>
          <input placeholder="USUARIO" value={inputLogin} onChange={e => setInputLogin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', marginBottom: '15px' }} />
          <button onClick={() => { setUsuarioActual(inputLogin.toUpperCase()); localStorage.setItem('userStilaPro', inputLogin.toUpperCase()); }} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>ENTRAR</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      <header style={{ background: theme.card, padding: '15px', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${theme.border}`, position:'sticky', top:0, zIndex:10 }}>
        <h2 style={{margin:0, fontSize:'16px'}}>STILA <span style={{color: theme.accent}}>PRO V16.2</span></h2>
        <button onClick={() => { localStorage.removeItem('userStilaPro'); window.location.reload(); }} style={{ color: theme.danger, background:'none', border:'none', fontSize:'11px'}}>SALIR ( {usuarioActual} )</button>
      </header>

      <main style={{ padding: '15px', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* VISTA CATÁLOGO */}
        {vista === 'catalogo' && (
          <>
            <input placeholder="🔍 Buscar producto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {inventario.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <div key={p.id} style={{...cardStyle, border: p.stock <= 3 ? `1px solid ${theme.danger}` : `1px solid ${theme.border}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'9px'}}>
                    <span style={{color:theme.textMuted}}>{p.paca}</span>
                    <span style={{color: p.stock <= 3 ? theme.danger : theme.accent}}>STOCK: {p.stock}</span>
                  </div>
                  <h4 style={{margin:'8px 0'}}>{p.nombre}</h4>
                  <p style={{fontSize:'18px', fontWeight:'bold', margin:0}}>${p.precio}</p>
                  <button onClick={()=>setCarrito([...carrito, p])} style={{width:'100%', marginTop:'10px', padding:'8px', background:theme.accent, color:'#fff', border:'none', borderRadius:'8px'}}>+ AGREGAR</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VISTA POS */}
        {vista === 'pos' && (
          <>
            <div style={{...cardStyle, textAlign:'center', border: `2px solid ${theme.accent}`}}>
              <p style={{margin:0, color:theme.accent, fontSize:'12px'}}>TOTAL A COBRAR</p>
              <h2 style={{fontSize:'40px', margin:0}}>${carrito.reduce((a,b)=>a+b.precio, 0)}</h2>
            </div>
            {carrito.map((item, idx) => (
              <div key={idx} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <span>{item.nombre}</span>
                <span style={{color:theme.accent}}>${item.precio}</span>
              </div>
            ))}
            {carrito.length > 0 && <button onClick={finalizarVenta} style={{width:'100%', padding:'20px', background:theme.accent, color:'#fff', borderRadius:'15px', border:'none', fontSize:'18px', fontWeight:'bold'}}>FINALIZAR VENTA</button>}
          </>
        )}

        {/* VISTA ADMIN (CONSOLIDADA V16.2) */}
        {vista === 'admin' && (
          <div>
            {/* ANALÍTICA */}
            <div style={{...cardStyle, background: 'linear-gradient(to bottom right, #0f172a, #1e293b)'}}>
                <h3 style={{fontSize:'12px', color:theme.accent, marginTop:0}}>DASHBOARD DE RENDIMIENTO</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <div><p style={{fontSize:'10px', color:theme.textMuted, margin:0}}>Ventas</p><b>${statsGlobales.totalVentas}</b></div>
                    <div><p style={{fontSize:'10px', color:theme.textMuted, margin:0}}>Utilidad</p><b style={{color:theme.accent}}>${statsGlobales.utilidad}</b></div>
                </div>
                <div style={{marginTop:'15px', borderTop:`1px solid ${theme.border}`, paddingTop:'10px'}}>
                    <p style={{fontSize:'10px', fontWeight:'bold'}}>RANKING VENTAS (COMISIONES)</p>
                    {Object.entries(statsGlobales.comisionesPorVendedor).map(([nom, monto]) => (
                        <div key={nom} style={{display:'flex', justifyContent:'space-between', fontSize:'12px', margin:'5px 0'}}>
                            <span>{nom}</span>
                            <span style={{color:theme.warning}}>${monto.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CONFIGURACIÓN DE COMISIONES Y POLÍTICAS */}
            <div style={cardStyle}>
                <h3 style={{fontSize:'14px'}}>⚙️ CONFIGURACIÓN DE TIENDA</h3>
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px'}}>
                    <label style={{fontSize:'12px'}}>Comisiones:</label>
                    <input type="checkbox" checked={configComisiones.activa} onChange={e => {
                        const nc = {...configComisiones, activa: e.target.checked};
                        setConfigComisiones(nc);
                        localStorage.setItem('configComStila', JSON.stringify(nc));
                    }} />
                    <input type="number" value={configComisiones.porcentaje} onChange={e => {
                        const nc = {...configComisiones, porcentaje: Number(e.target.value)};
                        setConfigComisiones(nc);
                        localStorage.setItem('configComStila', JSON.stringify(nc));
                    }} style={{...inputStyle, width:'60px', padding:'5px'}} /> <span style={{fontSize:'12px'}}>%</span>
                </div>
                <label style={{fontSize:'12px'}}>Políticas del Ticket:</label>
                <textarea value={politicasTicket} onChange={e => {
                    setPoliticasTicket(e.target.value);
                    localStorage.setItem('politicasStila', e.target.value);
                }} style={{...inputStyle, height:'80px', marginTop:'5px', fontSize:'11px'}} />
            </div>

            {/* GESTIÓN DE EQUIPO */}
            <div style={cardStyle}>
                <h3 style={{fontSize:'14px'}}>👥 EQUIPO</h3>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input placeholder="Nombre" value={nuevoMiembro.nombre} onChange={e=>setNuevoMiembro({...nuevoMiembro, nombre:e.target.value})} style={inputStyle} />
                    <select value={nuevoMiembro.rol} onChange={e=>setNuevoMiembro({...nuevoMiembro, rol:e.target.value})} style={inputStyle}>
                        <option>Vendedor</option>
                        <option>Instalador</option>
                        <option>Admin</option>
                    </select>
                </div>
                <input placeholder="WhatsApp (521...)" value={nuevoMiembro.whatsapp} onChange={e=>setNuevoMiembro({...nuevoMiembro, whatsapp:e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <button onClick={() => {
                    const l = [...equipo, {...nuevoMiembro, id: Date.now()}];
                    setEquipo(l);
                    localStorage.setItem('equipoStila', JSON.stringify(l));
                    setNuevoMiembro({nombre:'', rol:'Vendedor', whatsapp:''});
                }} style={{width:'100%', padding:'10px', background:theme.install, color:'#fff', border:'none', borderRadius:'10px'}}>REGISTRAR</button>
            </div>

            {/* REGISTRO DE PRODUCTOS / LOTES */}
            <div style={cardStyle}>
                <h3 style={{fontSize:'14px'}}>📦 REGISTRO DE LOTES</h3>
                <input placeholder="Nombre del Producto" value={nuevoProd.nombre} onChange={e=>setNuevoProd({...nuevoProd, nombre:e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input type="number" placeholder="Costo" value={nuevoProd.costo} onChange={e=>setNuevoProd({...nuevoProd, costo:e.target.value})} style={inputStyle} />
                    <input type="number" placeholder="Venta" value={nuevoProd.precio} onChange={e=>setNuevoProd({...nuevoProd, precio:e.target.value})} style={inputStyle} />
                    <input type="number" placeholder="Cant." value={nuevoProd.cantidad} onChange={e=>setNuevoProd({...nuevoProd, cantidad:e.target.value})} style={inputStyle} />
                </div>
                <button onClick={async () => {
                    await supabase.from('productos').insert([{ 
                        nombre: nuevoProd.nombre, precio: Number(nuevoProd.precio), 
                        costo_unitario: Number(nuevoProd.costo), stock: Number(nuevoProd.cantidad), 
                        paca: `LOTE-${new Date().getDate()}${new Date().getMonth()+1}` 
                    }]);
                    setNuevoProd({nombre:'', precio:'', costo:'', cantidad: 1});
                    obtenerTodo();
                    alert("Lote ingresado");
                }} style={{width:'100%', padding:'12px', background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold'}}>SUBIR A NUBE ☁️</button>
            </div>
          </div>
        )}

        {/* VISTA INSTALACIONES */}
        {vista === 'installations' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                <h3 style={{margin:0}}>🛠️ INSTALACIONES</h3>
                <button onClick={()=>setMostrarModalInstalacion(true)} style={{background:theme.install, color:'#fff', border:'none', padding:'8px 15px', borderRadius:'10px'}}>+ NUEVA</button>
            </div>
            {instalaciones.map(inst => (
                <div key={inst.id} style={{...cardStyle, borderLeft:`5px solid ${theme.install}`}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <div>
                            <h4 style={{margin:0}}>{inst.cliente}</h4>
                            <p style={{fontSize:'11px', margin:'5px 0', color:theme.textMuted}}>{inst.direccion}</p>
                            <span style={{fontSize:'10px', background:theme.bg, padding:'2px 8px', borderRadius:'5px'}}>👷 {inst.instalador}</span>
                        </div>
                        <button onClick={() => {
                            const msg = `*STILA-PRO ALERTA*\nInstalación: ${inst.cliente}\nDir: ${inst.direccion}\nHora: ${inst.hora}`;
                            window.open(`https://wa.me/${inst.telefono}?text=${encodeURIComponent(msg)}`);
                        }} style={{background:theme.accent, border:'none', borderRadius:'50%', width:'40px', height:'40px'}}>🔔</button>
                    </div>
                </div>
            ))}
          </div>
        )}

      </main>

      {/* NAVEGACIÓN */}
      <nav style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter:'blur(10px)', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-around', padding: '12px', borderRadius: '25px' }}>
        <button onClick={()=>setVista('catalogo')} style={{background: vista==='catalogo'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>📦</button>
        <button onClick={()=>setVista('pos')} style={{background: vista==='pos'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px', position:'relative'}}>
            🛒 {carrito.length > 0 && <span style={{position:'absolute', top:0, right:0, background:theme.danger, fontSize:'10px', padding:'2px 5px', borderRadius:'50%'}}>{carrito.length}</span>}
        </button>
        <button onClick={()=>setVista('installations')} style={{background: vista==='installations'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>🛠️</button>
        <button onClick={()=>setVista('admin')} style={{background: vista==='admin'?theme.accent:'none', border:'none', borderRadius:'15px', padding:'10px'}}>⚙️</button>
      </nav>

      {/* MODAL INSTALACIÓN */}
      {mostrarModalInstalacion && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
            <div style={{...cardStyle, width:'100%', maxWidth:'400px'}}>
                <h3>AGENDAR SERVICIO</h3>
                <input placeholder="Cliente" onChange={e=>setNuevaInst({...nuevaInst, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <input placeholder="Dirección" onChange={e=>setNuevaInst({...nuevaInst, direccion: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <input type="time" onChange={e=>setNuevaInst({...nuevaInst, hora: e.target.value})} style={inputStyle} />
                    <select onChange={e=>setNuevaInst({...nuevaInst, instalador: e.target.value})} style={inputStyle}>
                        <option>Seleccionar...</option>
                        {equipo.filter(e=>e.rol==='Instalador').map(e=><option key={e.id}>{e.nombre}</option>)}
                    </select>
                </div>
                <input placeholder="WhatsApp Cliente" onChange={e=>setNuevaInst({...nuevaInst, telefono: e.target.value})} style={{...inputStyle, marginBottom:'15px'}} />
                <button onClick={()=>{
                    const l = [{...nuevaInst, id: Date.now()}, ...instalaciones];
                    setInstalaciones(l);
                    localStorage.setItem('instStilaPro', JSON.stringify(l));
                    setMostrarModalInstalacion(false);
                }} style={{width:'100%', padding:'12px', background:theme.install, color:'#fff', border:'none', borderRadius:'10px'}}>CONFIRMAR</button>
                <button onClick={()=>setMostrarModalInstalacion(false)} style={{width:'100%', marginTop:'10px', background:'none', color:theme.textMuted, border:'none'}}>Cancelar</button>
            </div>
        </div>
      )}
    </div>
  );
}
