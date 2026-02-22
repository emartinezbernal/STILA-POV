import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- TEMA DARK MODE ---
const theme = {
  bg: '#020617',
  card: '#0f172a',
  border: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981',
  danger: '#ef4444',
  live: '#eab308',
  pdf: '#e11d48',
  excel: '#16a34a',
  apartado: '#8b5cf6',
  install: '#3b82f6' // Nuevo color para instalaciones
};

export default function App() {
  // --- CONTROL DE ACCESO (RBAC) ---
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const guardado = localStorage.getItem('userStilaPro');
    if (!guardado) return null;
    try {
      return JSON.parse(guardado);
    } catch (e) {
      return { nombre: guardado, rol: 'vendedor' };
    }
  });
  const [inputLogin, setInputLogin] = useState('');

  const [carrito, setCarrito] = useState([]);
  const [vista, setVista] = useState('catalogo'); 
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cortes, setCortes] = useState([]);
  
  // ESTADOS LIVE
  const [clienteLive, setClienteLive] = useState('');
  const [precioLiveManual, setPrecioLiveManual] = useState('');
  const [capturasLive, setCapturasLive] = useState([]);
  const inputClienteRef = useRef(null);

  // --- NUEVOS ESTADOS APARTADOS ---
  const [apartados, setApartados] = useState([]);
  const [nuevoApartado, setNuevoApartado] = useState({ cliente: '', producto: '', total: '', anticipo: '', telefono: '' });
  const TIEMPO_LIMITE_HS = 168; 

  // --- NUEVOS ESTADOS INSTALACIONES ---
  const [instalaciones, setInstalaciones] = useState([]);
  const [mostrarModalInstalacion, setMostrarModalInstalacion] = useState(false);
  const [nuevaInst, setNuevaInst] = useState({ 
    cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' 
  });
  
  const obtenerFechaLocal = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const hoyStr = useMemo(() => obtenerFechaLocal(), []);
  const [fechaConsulta, setFechaConsulta] = useState(hoyStr);
  
  const [infoPaca, setInfoPaca] = useState({ numero: '', proveedor: '' });
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', costo: '', cantidad: 1 });
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto: '' });
  const inputNombreRef = useRef(null);

  // --- VALIDACIÓN DE RUTAS Y ROLES ---
  useEffect(() => {
    if (usuarioActual) {
      if (usuarioActual.rol === 'instalador' && vista !== 'installations') setVista('installations');
      if (usuarioActual.rol === 'vendedor' && vista === 'admin') setVista('catalogo');
    }
  }, [vista, usuarioActual]);

  useEffect(() => { 
    if (usuarioActual) {
      obtenerTodo(); 
      const cortesGuardados = localStorage.getItem('cortesStilaPro');
      if (cortesGuardados) setCortes(JSON.parse(cortesGuardados));
      
      const apartadosGuardados = localStorage.getItem('apartadosStilaPro');
      if (apartadosGuardados) setApartados(JSON.parse(apartadosGuardados));

      const instGuardadas = localStorage.getItem('instStilaPro');
      if (instGuardadas) setInstalaciones(JSON.parse(instGuardadas));

      if (!window.XLSX) {
        const sExcel = document.createElement("script");
        sExcel.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
        document.head.appendChild(sExcel);
      }
      if (!window.jspdf) {
        const sPdf = document.createElement("script");
        sPdf.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        document.head.appendChild(sPdf);
        const sPdfTable = document.createElement("script");
        sPdfTable.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
        document.head.appendChild(sPdfTable);
      }
    }
  }, [usuarioActual]);

  async function obtenerTodo() {
    const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (p) setInventario(p);
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false });
    if (v) setHistorial(v);
    const { data: g } = await supabase.from('gastos').select('*').order('created_at', { ascending: false });
    if (g) setGastos(g);
  }

  // --- LÓGICA DE LOGIN ---
  const manejarLogin = (e) => {
    e.preventDefault();
    const input = inputLogin.trim();
    if (input) {
      let rol = 'vendedor';
      if (input.toUpperCase() === 'ADMIN123') rol = 'admin';
      else if (input.toUpperCase() === 'INSTALADOR01') rol = 'instalador';
      
      const userObj = { nombre: input, rol: rol };
      setUsuarioActual(userObj);
      localStorage.setItem('userStilaPro', JSON.stringify(userObj));
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('userStilaPro');
    setUsuarioActual(null);
  };

  // --- EXPORTACIÓN ---
  const exportarExcelGenerico = (datos, nombreArchivo) => {
    if (!window.XLSX) return alert("Cargando motor...");
    const ws = window.XLSX.utils.json_to_sheet(datos);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Datos");
    window.XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
  };

  const exportarPDFGenerico = (titulo, columnas, filas, nombreArchivo) => {
    if (!window.jspdf) return alert("Cargando motor...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(titulo, 14, 20);
    doc.autoTable({ startY: 25, head: [columnas], body: filas });
    doc.save(`${nombreArchivo}.pdf`);
  };

  // --- LÓGICA LIVE ---
  const registrarCapturaLive = async (precio) => {
    if (!clienteLive.trim() || precio <= 0) return;
    const folio = `L-${Math.floor(1000 + Math.random() * 9000)}`;
    const nuevaCaptura = {
      id: Date.now(),
      cliente: clienteLive.trim().toUpperCase(),
      precio: Number(precio),
      folio,
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setCapturasLive([nuevaCaptura, ...capturasLive]);
    try {
      await supabase.from('ventas').insert([{ 
        total: nuevaCaptura.precio, 
        costo_total: 0, 
        detalles: `🔴 LIVE [${folio}]: ${nuevaCaptura.cliente} - Precio: $${nuevaCaptura.precio}` 
      }]);
      obtenerTodo();
    } catch (e) { console.error(e); }
    setClienteLive('');
    setPrecioLiveManual('');
    setTimeout(() => inputClienteRef.current?.focus(), 50);
  };

  // --- LÓGICA APARTADOS ---
  const agregarApartado = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nuevo = { ...nuevoApartado, id, fecha: new Date().toISOString(), estado: 'Pendiente', restante: Number(nuevoApartado.total) - Number(nuevoApartado.anticipo) };
    const listaActualizada = [nuevo, ...apartados];
    setApartados(listaActualizada);
    localStorage.setItem('apartadosStilaPro', JSON.stringify(listaActualizada));
    setNuevoApartado({ cliente: '', producto: '', total: '', anticipo: '', telefono: '' });
  };

  const eliminarApartado = (id) => {
    if(!window.confirm("¿Eliminar este registro?")) return;
    const filtrados = apartados.filter(a => a.id !== id);
    setApartados(filtrados);
    localStorage.setItem('apartadosStilaPro', JSON.stringify(filtrados));
  };

  async function apartarDesdeCarrito() {
    if (carrito.length === 0) return;
    const cliente = window.prompt("Nombre del cliente para el apartado:");
    if (!cliente) return;
    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const productosTxt = carritoAgrupado.map(i => `${i.nombre} (x${i.cantCar})`).join(', ');
    try {
      for (const item of carritoAgrupado) {
        const pDB = inventario.find(p => p.id === item.id);
        if (pDB) await supabase.from('productos').update({ stock: pDB.stock - item.cantCar }).eq('id', item.id);
      }
      const id = Date.now();
      const nuevo = { id, cliente: cliente.toUpperCase(), producto: productosTxt, total: tv, anticipo: 0, telefono: '', fecha: new Date().toISOString(), estado: 'Pendiente', restante: tv };
      const listaActualizada = [nuevo, ...apartados];
      setApartados(listaActualizada);
      localStorage.setItem('apartadosStilaPro', JSON.stringify(listaActualizada));
      alert("Apartado registrado y stock descontado.");
      setCarrito([]);
      await obtenerTodo();
      setVista('apartados');
    } catch (e) { alert("Error al procesar el stock del apartado"); }
  }

  // --- LÓGICA INSTALACIONES ---
  const guardarInstalacion = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nueva = { ...nuevaInst, id, estado: 'En proceso', evidencia: null };
    const lista = [nueva, ...instalaciones];
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
    setMostrarModalInstalacion(false);
    setNuevaInst({ cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' });
    alert("Instalación programada correctamente.");
  };

  const manejarEvidencia = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const lista = instalaciones.map(inst => 
          inst.id === id ? { ...inst, evidencia: reader.result, estado: 'Realizada' } : inst
        );
        setInstalaciones(lista);
        localStorage.setItem('instStilaPro', JSON.stringify(lista));
      };
      reader.readAsDataURL(file);
    }
  };

  const eliminarInstalacion = (id) => {
    if(!window.confirm("¿Eliminar registro de instalación?")) return;
    const lista = instalaciones.filter(i => i.id !== id);
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
  };

  // --- LÓGICA DE NEGOCIO ---
  const carritoAgrupado = useMemo(() => {
    const grupos = {};
    carrito.forEach(item => {
      if (!grupos[item.id]) grupos[item.id] = { ...item, cantCar: 0, subtotal: 0 };
      grupos[item.id].cantCar += 1;
      grupos[item.id].subtotal += item.precio;
    });
    return Object.values(grupos);
  }, [carrito]);

  const inventarioReal = useMemo(() => {
    return inventario.map(p => {
      const enCar = carrito.filter(item => item.id === p.id).length;
      return { ...p, stockActual: p.stock - enCar };
    });
  }, [inventario, carrito]);

  const filtrados = useMemo(() => {
    const fFiltro = new Date(fechaConsulta + "T00:00:00").toLocaleDateString();
    const vnt = historial.filter(v => new Date(v.created_at).toLocaleDateString() === fFiltro);
    const gst = gastos.filter(g => new Date(g.created_at).toLocaleDateString() === fFiltro);
    const totalV = vnt.reduce((a, b) => a + (b.total || 0), 0);
    const totalC = vnt.reduce((a, b) => a + (b.costo_total || 0), 0);
    const totalG = gst.reduce((a, b) => a + Number(b.monto || 0), 0);
    return { vnt, gst, totalV, totalG, utilidad: totalV - totalC - totalG };
  }, [historial, gastos, fechaConsulta]);

  const realizarCorte = () => {
    const f = window.prompt(`¿Efectivo físico en caja?`);
    if (f === null) return;
    const fisico = Number(f);
    const esperado = filtrados.totalV - filtrados.totalG;
    const dif = fisico - esperado;
    const timestamp = new Date().toLocaleString();
    const nuevoCorte = { id: Date.now(), fechaFiltro: fechaConsulta, timestamp, reportado: fisico, diferencia: dif, responsable: usuarioActual.nombre };
    const nuevosCortes = [nuevoCorte, ...cortes];
    setCortes(nuevosCortes);
    localStorage.setItem('cortesStilaPro', JSON.stringify(nuevosCortes));
    alert("Corte realizado correctamente.");
  };

  async function finalizarVenta() {
    if (carrito.length === 0) return;
    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const cv = carrito.reduce((a, b) => a + (b.costo_unitario || 0), 0);
    try {
      await supabase.from('ventas').insert([{ 
        total: tv, 
        costo_total: cv, 
        detalles: `Responsable: ${usuarioActual.nombre} | Carrito: ` + carritoAgrupado.map(i => `${i.nombre} (x${i.cantCar})`).join(', ') 
      }]);
      for (const item of carritoAgrupado) {
        const pDB = inventario.find(p => p.id === item.id);
        if (pDB) await supabase.from('productos').update({ stock: pDB.stock - item.cantCar }).eq('id', item.id);
      }
      setCarrito([]); await obtenerTodo(); setVista('historial');
    } catch (e) { alert("Error al procesar la venta"); }
  }

  async function guardarTurbo(e) {
    e.preventDefault();
    await supabase.from('productos').insert([{ nombre: nuevoProd.nombre, precio: Number(nuevoProd.precio), costo_unitario: Number(nuevoProd.costo), stock: Number(nuevoProd.cantidad), paca: infoPaca.numero, proveedor: infoPaca.proveedor }]);
    setNuevoProd({ ...nuevoProd, nombre: '', cantidad: 1 });
    obtenerTodo();
    setTimeout(() => inputNombreRef.current?.focus(), 50);
  }

  // --- ESTILOS ---
  const cardStyle = { background: theme.card, borderRadius: '15px', padding: '15px', border: `1px solid ${theme.border}`, marginBottom: '12px', color: theme.text };
  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: theme.bg, color: theme.text, boxSizing: 'border-box' };
  const btnClass = "btn-interactivo";

  if (!usuarioActual) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h1 style={{ color: theme.accent, fontSize: '24px', marginBottom: '10px' }}>STILA-PRO ⚡</h1>
          <form onSubmit={manejarLogin}>
            <input autoFocus placeholder="Código o Nombre" value={inputLogin} onChange={e => setInputLogin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', marginBottom: '15px' }} />
            <button className={btnClass} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', paddingBottom: '100px' }}>
      <header style={{ background: theme.card, padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
        <h1 style={{margin:0, fontSize:'14px'}}>STILA-PRO <span style={{color: theme.accent}}>v15</span></h1>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <span style={{fontSize:'10px', color:theme.textMuted}}>👤 {usuarioActual.nombre} | {usuarioActual.rol.toUpperCase()}</span>
          <button onClick={cerrarSesion} style={{background:'none', border:'none', color:theme.danger, fontSize:'10px'}}>SALIR</button>
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
        
        {vista === 'live' && usuarioActual.rol !== 'instalador' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{...cardStyle, border: `1px solid ${theme.live}50`}}>
              <input ref={inputClienteRef} placeholder="👤 Cliente" value={clienteLive} onChange={e=>setClienteLive(e.target.value)} style={{...inputStyle, fontSize: '18px', marginBottom: '15px'}} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                {[50, 100, 150, 200, 250, 300].map(p => (
                  <button key={p} className={btnClass} onClick={() => registrarCapturaLive(p)} disabled={!clienteLive.trim()} style={{ padding: '15px', backgroundColor: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '10px', fontWeight: 'bold' }}>${p}</button>
                ))}
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <input type="number" placeholder="$ Manual" value={precioLiveManual} onChange={e=>setPrecioLiveManual(e.target.value)} style={inputStyle} />
                <button className={btnClass} onClick={() => registrarCapturaLive(precioLiveManual)} style={{background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', padding:'0 20px'}}>OK</button>
              </div>
            </div>
          </div>
        )}

        {vista === 'catalogo' && usuarioActual.rol !== 'instalador' && (
          <>
            <input placeholder="🔍 Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, marginBottom: '15px'}} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {inventarioReal.filter(p => p.stockActual > 0 && p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <div key={p.id} style={cardStyle}>
                  <p style={{fontSize:'10px', margin:0, color: theme.textMuted}}>{p.paca || 'S/N'} / {p.stockActual} pzs</p>
                  <h4 style={{margin:'5px 0', fontSize:'13px'}}>{p.nombre}</h4>
                  <p style={{fontSize:'18px', fontWeight:'bold', margin:0}}>${p.precio}</p>
                  <button className={btnClass} onClick={()=>setCarrito([...carrito, p])} style={{width:'100%', marginTop:'10px', padding:'8px', background:theme.bg, color:theme.accent, border:`1px solid ${theme.border}`, borderRadius:'8px'}}>AÑADIR</button>
                </div>
              ))}
            </div>
          </>
        )}

        {vista === 'apartados' && usuarioActual.rol !== 'instalador' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={cardStyle}>
              <h3 style={{marginTop:0, fontSize:'14px'}}>Nuevo Apartado</h3>
              <input placeholder="Cliente" value={nuevoApartado.cliente} onChange={e=>setNuevoApartado({...nuevoApartado, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
              <input placeholder="Producto" value={nuevoApartado.producto} onChange={e=>setNuevoApartado({...nuevoApartado, producto: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
              <div style={{display:'flex', gap:'10px'}}>
                <input type="number" placeholder="Total" value={nuevoApartado.total} onChange={e=>setNuevoApartado({...nuevoApartado, total: e.target.value})} style={inputStyle} />
                <input type="number" placeholder="Anticipo" value={nuevoApartado.anticipo} onChange={e=>setNuevoApartado({...nuevoApartado, anticipo: e.target.value})} style={inputStyle} />
              </div>
              <button className={btnClass} onClick={agregarApartado} style={{width:'100%', marginTop:'10px', padding:'12px', background:theme.apartado, color:'#fff', border:'none', borderRadius:'10px'}}>REGISTRAR APARTADO 🔖</button>
            </div>
            {apartados.map(a => (
              <div key={a.id} style={{...cardStyle, borderLeft:`5px solid ${theme.apartado}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <h4 style={{margin:0}}>{a.cliente}</h4>
                  <button onClick={()=>eliminarApartado(a.id)} style={{background:'none', border:'none', color:theme.danger}}>✕</button>
                </div>
                <p style={{fontSize:'12px', margin:'5px 0'}}>{a.producto}</p>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', fontWeight:'bold'}}>
                  <span>Total: ${a.total}</span>
                  <span style={{color:theme.accent}}>Resta: ${a.restante}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {vista === 'installations' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {usuarioActual.rol !== 'instalador' && (
              <button className={btnClass} onClick={() => setMostrarModalInstalacion(true)} style={{width:'100%', marginBottom:'15px', padding:'15px', background:theme.install, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>PROGRAMAR INSTALACIÓN 🛠️</button>
            )}
            {instalaciones.map(inst => (
              <div key={inst.id} style={{...cardStyle, borderLeft: `5px solid ${theme.install}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <h4 style={{margin:0}}>{inst.cliente}</h4>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', background: inst.estado === 'Realizada' ? theme.accent : theme.install, color: '#fff'}}>{inst.estado}</span>
                </div>
                <p style={{margin:'5px 0', fontSize:'12px'}}>📍 {inst.direccion}</p>
                <p style={{margin:0, fontSize:'11px', color:theme.textMuted}}>📅 {inst.fecha} | {inst.hora}</p>
                <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                   <label style={{background: theme.bg, border: `1px solid ${theme.border}`, padding: '8px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer', flex: 1, textAlign: 'center'}}>
                     📷 SUBIR EVIDENCIA
                     <input type="file" accept="image/*" onChange={(e) => manejarEvidencia(inst.id, e)} style={{display:'none'}} />
                   </label>
                   {usuarioActual.rol === 'admin' && (
                    <button onClick={() => eliminarInstalacion(inst.id)} style={{background:'none', border:'none', color:theme.danger}}>🗑️</button>
                   )}
                </div>
                {inst.evidencia && <img src={inst.evidencia} alt="Evidencia" style={{width:'100%', marginTop:'10px', borderRadius:'10px'}} />}
              </div>
            ))}
          </div>
        )}

        {vista === 'admin' && usuarioActual.rol === 'admin' && (
          <>
            <div style={cardStyle}>
              <form onSubmit={guardarTurbo}>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input placeholder="# Lote" value={infoPaca.numero} onChange={e=>setInfoPaca({...infoPaca, numero: e.target.value})} style={inputStyle}/>
                  <input placeholder="Prov." value={infoPaca.proveedor} onChange={e=>setInfoPaca({...infoPaca, proveedor: e.target.value})} style={inputStyle}/>
                </div>
                <input ref={inputNombreRef} placeholder="Nombre" value={nuevoProd.nombre} onChange={e=>setNuevoProd({...nuevoProd, nombre: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input type="number" placeholder="Costo" value={nuevoProd.costo} onChange={e=>setNuevoProd({...nuevoProd, costo: e.target.value})} style={inputStyle} required />
                  <input type="number" placeholder="Venta" value={nuevoProd.precio} onChange={e=>setNuevoProd({...nuevoProd, precio: e.target.value})} style={inputStyle} required />
                  <input type="number" placeholder="Cant." value={nuevoProd.cantidad} onChange={e=>setNuevoProd({...nuevoProd, cantidad: e.target.value})} style={inputStyle} required />
                </div>
                <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.accent, color:'#fff', borderRadius:'10px', border:'none'}}>GUARDAR ⚡</button>
              </form>
            </div>
            {/* Gastos, Reportes y demás lógica admin original se mantiene aquí */}
            <div style={cardStyle}>
               <h3 style={{marginTop:0}}>Exportación</h3>
               <button onClick={() => exportarExcelGenerico(inventario, 'Inventario')} style={{background:theme.excel, color:'#fff', padding:'10px', border:'none', borderRadius:'8px', marginRight:'10px'}}>Excel</button>
               <button onClick={() => exportarPDFGenerico('Inventario', ['Nombre', 'Stock'], inventario.map(p => [p.nombre, p.stock]), 'Inventario')} style={{background:theme.pdf, color:'#fff', padding:'10px', border:'none', borderRadius:'8px'}}>PDF</button>
            </div>
          </>
        )}

        {vista === 'pos' && usuarioActual.rol !== 'instalador' && (
          <>
            <div style={{...cardStyle, textAlign:'center', border: `2px solid ${theme.accent}`}}>
              <h2 style={{fontSize:'40px', margin:0}}>${carrito.reduce((a,b)=>a+b.precio, 0).toFixed(2)}</h2>
            </div>
            {carritoAgrupado.map((item) => (
              <div key={item.id} style={{...cardStyle, display:'flex', justifyContent:'space-between'}}>
                <div>{item.nombre} x{item.cantCar}</div>
                <button className={btnClass} onClick={() => setCarrito(carrito.filter(p => p.id !== item.id))} style={{color:theme.danger, background:'none', border:'none'}}>Quitar</button>
              </div>
            ))}
            {carrito.length > 0 && (
              <div style={{display:'flex', gap:'10px'}}>
                <button className={btnClass} onClick={finalizarVenta} style={{flex: 1, padding:'15px', background:theme.accent, color:'#fff', borderRadius:'10px', fontWeight:'bold', border:'none'}}>COBRAR ✅</button>
                <button className={btnClass} onClick={apartarDesdeCarrito} style={{flex: 1, padding:'15px', background:theme.apartado, color:'#fff', borderRadius:'10px', fontWeight:'bold', border:'none'}}>APARTAR 🔖</button>
              </div>
            )}
          </>
        )}

        {vista === 'historial' && usuarioActual.rol !== 'instalador' && (
          <>
            <div style={cardStyle}>
              <input type="date" value={fechaConsulta} onChange={e=>setFechaConsulta(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
              <div style={{display:'flex', justifyContent:'space-around'}}>
                <div><p style={{margin:0, fontSize:'10px'}}>VENTAS</p><h3>${filtrados.totalV}</h3></div>
                {usuarioActual.rol === 'admin' && (
                  <div><p style={{margin:0, fontSize:'10px'}}>UTILIDAD</p><h3 style={{color:theme.accent}}>${filtrados.utilidad}</h3></div>
                )}
              </div>
              <button className={btnClass} onClick={realizarCorte} style={{width:'100%', marginTop:'15px', padding:'10px', background:theme.accent, borderRadius:'8px', color:'#fff', border:'none'}}>CORTE DE CAJA 🏁</button>
            </div>
            <div style={cardStyle}>
              <h3 style={{fontSize:'12px', margin:'0 0 10px 0', color:theme.textMuted}}>🧾 REGISTRO DE VENTAS</h3>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', fontSize:'10px', borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${theme.border}`, color:theme.textMuted}}>
                      <th style={{textAlign:'left', padding:'5px'}}>Hora</th>
                      <th style={{textAlign:'left', padding:'5px'}}>Detalles</th>
                      <th style={{textAlign:'right', padding:'5px'}}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.vnt.map((v) => (
                      <tr key={v.id} style={{borderBottom:`1px solid ${theme.border}`}}>
                        <td style={{padding:'5px'}}>{new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td style={{padding:'5px', fontSize:'9px'}}>{v.detalles}</td>
                        <td style={{textAlign:'right', padding:'5px', fontWeight:'bold'}}>${v.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* --- NAVEGACIÓN BASADA EN ROLES --- */}
      <nav style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: theme.card, border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-around', padding: '12px', borderRadius: '20px', zIndex: 100 }}>
        {usuarioActual.rol !== 'instalador' && (
          <>
            <button className={btnClass} onClick={()=>setVista('catalogo')} style={{background: vista==='catalogo'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
              <span style={{fontSize:'22px'}}>📦</span>
              <span style={{fontSize:'9px', color: theme.textMuted}}>Stock</span>
            </button>
            <button className={btnClass} onClick={()=>setVista('pos')} style={{background: vista==='pos'?theme.bg:'none', border:'none', position: 'relative', flexDirection: 'column', gap: '4px'}}>
              <span style={{fontSize:'22px'}}>🛒</span>
              <span style={{fontSize:'9px', color: theme.textMuted}}>Venta</span>
              {carrito.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '5px', background: theme.danger, color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', border: `2px solid ${theme.card}` }}>{carrito.length}</span>}
            </button>
            <button className={btnClass} onClick={()=>setVista('apartados')} style={{background: vista==='apartados'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
              <span style={{fontSize:'22px'}}>🔖</span>
              <span style={{fontSize:'9px', color: theme.textMuted}}>Apartar</span>
            </button>
          </>
        )}
        
        <button className={btnClass} onClick={()=>setVista('installations')} style={{background: vista==='installations'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'22px'}}>🛠️</span>
          <span style={{fontSize:'9px', color: theme.textMuted}}>Instal.</span>
        </button>

        {usuarioActual.rol === 'admin' && (
          <button className={btnClass} onClick={()=>setVista('admin')} style={{background: vista==='admin'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
            <span style={{fontSize:'22px'}}>⚡</span>
            <span style={{fontSize:'9px', color: theme.textMuted}}>Admin</span>
          </button>
        )}
        
        {usuarioActual.rol !== 'instalador' && (
          <button className={btnClass} onClick={()=>setVista('historial')} style={{background: vista==='historial'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
            <span style={{fontSize:'22px'}}>📈</span>
            <span style={{fontSize:'9px', color: theme.textMuted}}>Corte</span>
          </button>
        )}
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-interactivo:active { transform: scale(0.95); }
      `}</style>

      {/* MODAL INSTALACIÓN */}
      {mostrarModalInstalacion && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{...cardStyle, width:'100%', maxWidth:'400px'}}>
            <h3 style={{marginTop:0}}>Programar Instalación</h3>
            <form onSubmit={guardarInstalacion}>
              <input placeholder="Cliente" value={nuevaInst.cliente} onChange={e=>setNuevaInst({...nuevaInst, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <input placeholder="Dirección" value={nuevaInst.direccion} onChange={e=>setNuevaInst({...nuevaInst, direccion: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                <input type="date" value={nuevaInst.fecha} onChange={e=>setNuevaInst({...nuevaInst, fecha: e.target.value})} style={inputStyle} required />
                <input type="time" value={nuevaInst.hora} onChange={e=>setNuevaInst({...nuevaInst, hora: e.target.value})} style={inputStyle} required />
              </div>
              <input placeholder="Instalador" value={nuevaInst.instalador} onChange={e=>setNuevaInst({...nuevaInst, instalador: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.install, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold'}}>GUARDAR 🛠️</button>
              <button type="button" onClick={()=>setMostrarModalInstalacion(false)} style={{width:'100%', marginTop:'10px', background:'none', color:theme.textMuted, border:'none'}}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
