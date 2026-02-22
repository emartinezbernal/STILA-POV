import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dtrimzswyuwunywokekh.supabase.co', 
  'sb_publishable__gX8fP0sXBZhIFgCAM90UA_QQg03P79'
);

// --- TEMA DARK MODE v15 ---
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
  install: '#3b82f6'
};

export default function App() {
  // --- ESTADOS NATIVOS ---
  const [usuarioActual, setUsuarioActual] = useState(localStorage.getItem('userStilaPro') || '');
  const [inputLogin, setInputLogin] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [vista, setVista] = useState('catalogo');
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cortes, setCortes] = useState([]);
  
  // --- ESTADOS LIVE ---
  const [clienteLive, setClienteLive] = useState('');
  const [precioLiveManual, setPrecioLiveManual] = useState('');
  const [capturasLive, setCapturasLive] = useState([]);
  const inputClienteRef = useRef(null);

  // --- ESTADOS APARTADOS ---
  const [apartados, setApartados] = useState([]);
  const [nuevoApartado, setNuevoApartado] = useState({ cliente: '', producto: '', total: '', anticipo: '', telefono: '' });
  const TIEMPO_LIMITE_HS = 168;

  // --- NUEVOS ESTADOS: ADMIN & INSTALADORES ---
  const [instaladores, setInstaladores] = useState(JSON.parse(localStorage.getItem('staffStilaPro')) || []);
  const [nuevoStaff, setNuevoStaff] = useState('');
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
  const inputNombreRef = useRef(null);

  useEffect(() => { 
    if (usuarioActual) {
      obtenerTodo(); 
      setCortes(JSON.parse(localStorage.getItem('cortesStilaPro')) || []);
      setApartados(JSON.parse(localStorage.getItem('apartadosStilaPro')) || []);
      setInstalaciones(JSON.parse(localStorage.getItem('instStilaPro')) || []);
      
      if (!window.XLSX) {
        const sExcel = document.createElement("script");
        sExcel.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
        document.head.appendChild(sExcel);
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

  // --- REPORTE DE UTILIDAD / RENDIMIENTO INSTALADORES ---
  const statsInstaladores = useMemo(() => {
    const stats = {};
    instaladores.forEach(nom => stats[nom] = { completados: 0, totalMonto: 0 });
    instalaciones.forEach(inst => {
      if (inst.estado === 'Realizada' && stats[inst.instalador]) {
        stats[inst.instalador].completados += 1;
        // Asumiendo que se puede añadir un costo de servicio en el futuro, por ahora contamos servicios
      }
    });
    return Object.entries(stats);
  }, [instalaciones, instaladores]);

  // --- LÓGICA STAFF ---
  const agregarStaff = () => {
    if(!nuevoStaff.trim()) return;
    const lista = [...instaladores, nuevoStaff.trim().toUpperCase()];
    setInstaladores(lista);
    localStorage.setItem('staffStilaPro', JSON.stringify(lista));
    setNuevoStaff('');
  };

  const eliminarStaff = (nom) => {
    const lista = instaladores.filter(i => i !== nom);
    setInstaladores(lista);
    localStorage.setItem('staffStilaPro', JSON.stringify(lista));
  };

  // --- LÓGICA INSTALACIONES ---
  const guardarInstalacion = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nueva = { ...nuevaInst, id, estado: 'En proceso', evidencia: null, creadoPor: usuarioActual };
    const lista = [nueva, ...instalaciones];
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
    setMostrarModalInstalacion(false);
    setNuevaInst({ cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' });
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

  const cambiarEstadoInst = (id, nuevoEstado) => {
    const lista = instalaciones.map(inst => inst.id === id ? { ...inst, estado: nuevoEstado } : inst);
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
  };

  // --- POLÍTICAS DE VENTA ---
  const BLOQUE_POLITICAS = `
--------------------------
📜 *POLÍTICAS DE STILA-PRO:*
1. *Garantía:* Solo por defecto de fábrica al momento de la entrega.
2. *Cambios:* No se aceptan cambios ni devoluciones en prendas de liquidación o usadas.
3. *Manipulación:* No nos hacemos responsables por daños tras el lavado.
4. *Apartados:* Plazo máximo 7 días. Si no se liquida, el anticipo NO es reembolsable.
--------------------------`;

  const finalizarVenta = async () => {
    if (carrito.length === 0) return;
    const m = window.prompt("1. Efec | 2. Trans | 3. Tarj", "1");
    if (!m) return;
    let mTxt = m === "1" ? "Efectivo" : m === "2" ? "Transferencia" : "Tarjeta";
    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const cv = carrito.reduce((a, b) => a + (b.costo_unitario || 0), 0);
    const folioVenta = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    try {
      await supabase.from('ventas').insert([{ 
        total: tv, 
        costo_total: cv, 
        detalles: `🛒 [${folioVenta}] Vendedor: ${usuarioActual} | Pago: ${mTxt} | Hora: ${hora} | Productos: ` + carritoAgrupado.map(i => `${i.nombre} (x${i.cantCar})`).join(', ') 
      }]);

      for (const item of carritoAgrupado) {
        const pDB = inventario.find(p => p.id === item.id);
        if (pDB) await supabase.from('productos').update({ stock: pDB.stock - item.cantCar }).eq('id', item.id);
      }

      let ticketMsg = `*🛍️ TICKET DE COMPRA - STILA-PRO*\n`;
      ticketMsg += `--------------------------\n`;
      ticketMsg += `🆔 Folio: *${folioVenta}*\n`;
      ticketMsg += `👤 Vendedor: *${usuarioActual}*\n`;
      ticketMsg += `📅 Fecha: ${new Date().toLocaleDateString()} | ${hora}\n`;
      ticketMsg += `💳 Método: *${mTxt}*\n`;
      ticketMsg += `--------------------------\n`;
      carritoAgrupado.forEach(item => { ticketMsg += `• ${item.nombre} (x${item.cantCar}) - $${item.subtotal}\n`; });
      ticketMsg += `--------------------------\n`;
      ticketMsg += `*TOTAL PAGADO: $${tv}*\n`;
      ticketMsg += BLOQUE_POLITICAS;
      ticketMsg += `\n¡Gracias por tu preferencia! ✨`;

      window.open(`https://wa.me/?text=${encodeURIComponent(ticketMsg)}`, '_blank');
      setCarrito([]); await obtenerTodo(); setVista('historial');
    } catch (e) { alert("Error al procesar la venta"); }
  };

  // --- LOGICA DE LOGIN ---
  const manejarLogin = (e) => {
    e.preventDefault();
    if (inputLogin.trim()) {
      const user = inputLogin.trim().toUpperCase();
      setUsuarioActual(user);
      localStorage.setItem('userStilaPro', user);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('userStilaPro');
    setUsuarioActual('');
  };

  // --- LOGICA LIVE ---
  const registrarCapturaLive = async (precio) => {
    if (!clienteLive.trim() || precio <= 0) return;
    const metodo = window.prompt("Entrega: 1. Envío | 2. Local | 3. Punto Medio", "1");
    const metodoTxt = metodo === "1" ? "Envío a domicilio" : metodo === "2" ? "Recoge en local" : "Punto medio";
    let costoEnvio = 0;
    if (metodo === "1" || metodo === "3") {
      const cE = window.prompt("Costo de envío / entrega:", "0");
      costoEnvio = Number(cE) || 0;
    }
    const folio = `L-${Math.floor(1000 + Math.random() * 9000)}`;
    const nuevaCaptura = {
      id: Date.now(),
      cliente: clienteLive.trim().toUpperCase(),
      precioPrenda: Number(precio),
      envio: costoEnvio,
      total: Number(precio) + costoEnvio,
      folio,
      metodo: metodoTxt,
      hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };
    setCapturasLive([nuevaCaptura, ...capturasLive]);
    try {
      await supabase.from('ventas').insert([{ total: nuevaCaptura.total, costo_total: 0, detalles: `🔴 LIVE [${folio}]: ${nuevaCaptura.cliente} - Prenda: $${nuevaCaptura.precioPrenda} + Envío: $${nuevaCaptura.envio} (${metodoTxt})` }]);
      obtenerTodo();
    } catch (e) { console.error(e); }
    setClienteLive('');
    setPrecioLiveManual('');
  };

  const generarWhatsAppLive = (cap) => {
    let msg = `¡Hola *${cap.cliente}*! 👋 Gracias por tu compra.\n\n`;
    msg += `✅ *Detalle:*\n• Folio: *${cap.folio}*\n• Prenda: *$${cap.precioPrenda}*\n`;
    if (cap.envio > 0) msg += `• Envío: *$${cap.envio}*\n`;
    msg += `• Entrega: *${cap.metodo}*\n\n`;
    msg += `*TOTAL A PAGAR: $${cap.total}*\n\n`;
    msg += BLOQUE_POLITICAS;
    msg += `\nEnvíanos tu comprobante. ¡Tienes 24 hrs! ⏳👗`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- LÓGICA DE APARTADOS ---
  const agregarApartado = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nuevo = { ...nuevoApartado, id, fecha: new Date().toISOString(), estado: 'Pendiente', restante: Number(nuevoApartado.total) - Number(nuevoApartado.anticipo) };
    const listaActualizada = [nuevo, ...apartados];
    setApartados(listaActualizada);
    localStorage.setItem('apartadosStilaPro', JSON.stringify(listaActualizada));
    setNuevoApartado({ cliente: '', producto: '', total: '', anticipo: '', telefono: '' });
  };

  const generarWhatsAppApartado = (ap) => {
    let msg = `*🔖 COMPROBANTE DE APARTADO - STILA-PRO*\n`;
    msg += `--------------------------\n`;
    msg += `👤 Cliente: *${ap.cliente}*\n`;
    msg += `📦 Producto: *${ap.producto}*\n`;
    msg += `💰 Total: *$${ap.total}*\n`;
    msg += `💵 Anticipo: *$${ap.anticipo}*\n`;
    msg += `📉 Restante: *${ap.restante}*\n`;
    msg += BLOQUE_POLITICAS;
    msg += `\n¡Gracias por apartar! ✨`;
    window.open(`https://wa.me/${ap.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  async function apartarDesdeCarrito() {
    if (carrito.length === 0) return;
    const cliente = window.prompt("Nombre del cliente para el apartado:");
    if (!cliente) return;
    const tel = window.prompt("Número de WhatsApp (ej. 521...):");
    const anticipo = window.prompt("Monto del anticipo recibido:", "0");
    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const productosTxt = carritoAgrupado.map(i => `${i.nombre} (x${i.cantCar})`).join(', ');
    try {
      for (const item of carritoAgrupado) {
        const pDB = inventario.find(p => p.id === item.id);
        if (pDB) await supabase.from('productos').update({ stock: pDB.stock - item.cantCar }).eq('id', item.id);
      }
      const id = Date.now();
      const nuevo = { id, cliente: cliente.toUpperCase(), producto: productosTxt, total: tv, anticipo: Number(anticipo), telefono: tel || '', fecha: new Date().toISOString(), estado: 'Pendiente', restante: tv - Number(anticipo) };
      const listaActualizada = [nuevo, ...apartados];
      setApartados(listaActualizada);
      localStorage.setItem('apartadosStilaPro', JSON.stringify(listaActualizada));
      setCarrito([]); await obtenerTodo(); setVista('apartados');
      generarWhatsAppApartado(nuevo);
    } catch (e) { alert("Error al procesar el stock"); }
  }

  // --- MEMOS ---
  const statsProveedores = useMemo(() => {
    const stats = {};
    inventario.forEach(p => {
      const prov = p.proveedor || 'Sin Nombre';
      if (!stats[prov]) stats[prov] = { stock: 0, inversion: 0, ventaEsperada: 0 };
      stats[prov].stock += p.stock;
      stats[prov].inversion += (p.stock * (p.costo_unitario || 0));
      stats[prov].ventaEsperada += (p.stock * (p.precio || 0));
    });
    return Object.entries(stats);
  }, [inventario]);

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
    const nuevoCorte = { id: Date.now(), fechaFiltro: fechaConsulta, timestamp, reportado: fisico, diferencia: dif, responsable: usuarioActual };
    const nuevosCortes = [nuevoCorte, ...cortes];
    setCortes(nuevosCortes);
    localStorage.setItem('cortesStilaPro', JSON.stringify(nuevosCortes));
    let msg = `*🏁 REPORTE CIERRE - STILA-PRO*\n📅 Fecha: ${fechaConsulta}\n👤 Responsable: *${usuarioActual}*\n--------------------------\n💰 Ventas Totales: *$${filtrados.totalV}*\n📉 Gastos Totales: *$${filtrados.totalG}*\n💵 Esperado en Caja: *$${esperado}*\n--------------------------\n✅ Efectivo Físico: *$${fisico}*\n⚖️ Diferencia: *${dif >= 0 ? '+' : ''}$${dif}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

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
  const btnExportStyle = { padding: '8px 12px', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };

  if (!usuarioActual) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h1 style={{ color: theme.accent, fontSize: '24px', marginBottom: '10px' }}>STILA-PRO ⚡</h1>
          <form onSubmit={manejarLogin}>
            <input autoFocus placeholder="Nombre de Usuario" value={inputLogin} onChange={e => setInputLogin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', marginBottom: '15px' }} />
            <button className={btnClass} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', paddingBottom: '110px' }}>
      <header style={{ background: theme.card, padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
        <h1 style={{margin:0, fontSize:'14px'}}>STILA-PRO <span style={{color: theme.accent}}>v15.2</span></h1>
        <div style={{ display:'flex', alignItems:'center', gap: '10px'}}>
           <span style={{ fontSize: '10px', color: theme.textMuted }}>👤 {usuarioActual}</span>
           <button onClick={cerrarSesion} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: '10px' }}>SALIR</button>
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
        
        {/* VISTA CATÁLOGO */}
        {vista === 'catalogo' && (
          <>
            <input placeholder="🔍 Buscar producto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, marginBottom: '15px'}} />
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

        {/* VISTA INSTALACIONES & RENDIMIENTO */}
        {vista === 'installations' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
              <h2 style={{color: theme.install, fontSize: '18px', margin: 0}}>🛠️ INSTALACIONES</h2>
              <button className={btnClass} onClick={() => setMostrarModalInstalacion(true)} style={{padding:'8px 15px', background:theme.install, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold', fontSize:'11px'}}>NUEVA 🛠️</button>
            </div>

            {/* TABLA DE RENDIMIENTO */}
            <div style={{...cardStyle, border: `1px solid ${theme.install}40`}}>
              <h3 style={{fontSize:'12px', marginTop:0, color: theme.install}}>📈 RENDIMIENTO DEL STAFF</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                {statsInstaladores.map(([nom, s]) => (
                  <div key={nom} style={{background:theme.bg, padding:'10px', borderRadius:'10px', textAlign:'center'}}>
                    <p style={{margin:0, fontSize:'10px', color:theme.textMuted}}>{nom}</p>
                    <p style={{margin:0, fontWeight:'bold', fontSize:'14px'}}>{s.completados} <span style={{fontSize:'10px'}}>Hechos</span></p>
                  </div>
                ))}
              </div>
            </div>
            
            {instalaciones.map(inst => (
              <div key={inst.id} style={{...cardStyle, borderLeft: `5px solid ${inst.estado === 'Realizada' ? theme.accent : theme.install}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <h4 style={{margin:0}}>{inst.cliente}</h4>
                    <p style={{margin:'5px 0', fontSize:'11px', color: theme.textMuted}}>📍 {inst.direccion}</p>
                    <p style={{margin:0, fontSize:'11px'}}>👷 {inst.instalador} | 📅 {inst.fecha}</p>
                  </div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', background: inst.estado === 'Realizada' ? theme.accent : theme.install, color: '#fff', height:'fit-content'}}>
                    {inst.estado}
                  </span>
                </div>
                {inst.estado !== 'Realizada' && (
                  <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                    <label style={{background: theme.bg, border: `1px solid ${theme.border}`, padding: '8px', borderRadius: '8px', fontSize: '10px', flex: 1, textAlign: 'center'}}>
                      📷 EVIDENCIA
                      <input type="file" accept="image/*" onChange={(e) => manejarEvidencia(inst.id, e)} style={{display:'none'}} />
                    </label>
                    <button onClick={() => cambiarEstadoInst(inst.id, 'Cancelada')} style={{...btnExportStyle, background: theme.danger}}>Anular</button>
                  </div>
                )}
                {inst.evidencia && <img src={inst.evidencia} alt="Ev" style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'10px', marginTop:'10px'}} />}
              </div>
            ))}
          </div>
        )}

        {/* VISTA ADMIN & STAFF */}
        {vista === 'admin' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* GESTIÓN DE STAFF */}
            <div style={{...cardStyle, border: `1px solid ${theme.install}50`}}>
              <h3 style={{fontSize:'14px', marginTop:0, color: theme.install}}>👥 GESTIÓN DE INSTALADORES</h3>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <input placeholder="Nombre del trabajador" value={nuevoStaff} onChange={e=>setNuevoStaff(e.target.value)} style={inputStyle} />
                <button onClick={agregarStaff} style={{background:theme.install, border:'none', borderRadius:'10px', padding:'0 15px', color:'#fff'}}>+</button>
              </div>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                {instaladores.map(nom => (
                  <span key={nom} style={{background:theme.bg, padding:'5px 10px', borderRadius:'15px', fontSize:'11px', border:`1px solid ${theme.border}`, display:'flex', alignItems:'center', gap:'8px'}}>
                    {nom} <button onClick={()=>eliminarStaff(nom)} style={{background:'none', border:'none', color:theme.danger, cursor:'pointer'}}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* INGRESO DE PRODUCTOS */}
            <div style={cardStyle}>
              <h3 style={{fontSize:'14px', marginTop:0}}>⚡ REGISTRO RÁPIDO DE STOCK</h3>
              <form onSubmit={guardarTurbo}>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input placeholder="# Lote" value={infoPaca.numero} onChange={e=>setInfoPaca({...infoPaca, numero: e.target.value})} style={inputStyle}/>
                  <input placeholder="Prov." value={infoPaca.proveedor} onChange={e=>setInfoPaca({...infoPaca, proveedor: e.target.value})} style={inputStyle}/>
                </div>
                <input ref={inputNombreRef} placeholder="Nombre del Producto" value={nuevoProd.nombre} onChange={e=>setNuevoProd({...nuevoProd, nombre: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input type="number" placeholder="Costo" value={nuevoProd.costo} onChange={e=>setNuevoProd({...nuevoProd, costo: e.target.value})} style={inputStyle} required />
                  <input type="number" placeholder="Venta" value={nuevoProd.precio} onChange={e=>setNuevoProd({...nuevoProd, precio: e.target.value})} style={inputStyle} required />
                  <input type="number" placeholder="Cant." value={nuevoProd.cantidad} onChange={e=>setNuevoProd({...nuevoProd, cantidad: e.target.value})} style={inputStyle} required />
                </div>
                <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.accent, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>GUARDAR EN NUBE ☁️</button>
              </form>
            </div>
          </div>
        )}

        {/* VISTA POS (VENTA) */}
        {vista === 'pos' && (
          <>
            <div style={{...cardStyle, textAlign:'center', border: `2px solid ${theme.accent}`}}>
              <h2 style={{fontSize:'40px', margin:0}}>${carrito.reduce((a,b)=>a+b.precio, 0).toFixed(2)}</h2>
            </div>
            {carritoAgrupado.map((item) => (
              <div key={item.id} style={{...cardStyle, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:'bold'}}>{item.nombre}</span>
                  <br/><span style={{fontSize:'11px', color:theme.textMuted}}>Cantidad: {item.cantCar}</span>
                </div>
                <button className={btnClass} onClick={() => setCarrito(carrito.filter(p => p.id !== item.id))} style={{color:theme.danger, background:'none', border:'none'}}>Quitar</button>
              </div>
            ))}
            {carrito.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <div style={{display:'flex', gap:'10px'}}>
                  <button className={btnClass} onClick={finalizarVenta} style={{flex: 2, padding:'15px', background:theme.accent, color:'#fff', borderRadius:'10px', fontWeight:'bold', border:'none'}}>COBRAR TICKET ✅</button>
                  <button className={btnClass} onClick={apartarDesdeCarrito} style={{flex: 1, padding:'15px', background:theme.apartado, color:'#fff', borderRadius:'10px', fontWeight:'bold', border:'none'}}>APARTAR 🔖</button>
                </div>
                <button className={btnClass} onClick={() => setMostrarModalInstalacion(true)} style={{width:'100%', padding:'12px', background:theme.install, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>PROGRAMAR INSTALACIÓN 🛠️</button>
              </div>
            )}
          </>
        )}

        {/* VISTA APARTADOS */}
        {vista === 'apartados' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{...cardStyle, border: `1px solid ${theme.apartado}50`}}>
              <h3 style={{fontSize:'14px', margin:'0 0 15px 0', color: theme.apartado}}>🔖 NUEVO APARTADO</h3>
              <form onSubmit={agregarApartado}>
                <input placeholder="Nombre del Cliente" value={nuevoApartado.cliente} onChange={e=>setNuevoApartado({...nuevoApartado, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <input placeholder="Producto(s)" value={nuevoApartado.producto} onChange={e=>setNuevoApartado({...nuevoApartado, producto: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                  <input type="number" placeholder="Total" value={nuevoApartado.total} onChange={e=>setNuevoApartado({...nuevoApartado, total: e.target.value})} style={inputStyle} required />
                  <input type="number" placeholder="Anticipo" value={nuevoApartado.anticipo} onChange={e=>setNuevoApartado({...nuevoApartado, anticipo: e.target.value})} style={inputStyle} required />
                </div>
                <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.apartado, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>CREAR REGISTRO</button>
              </form>
            </div>
            {apartados.map(ap => (
              <div key={ap.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <p style={{margin:0, fontWeight:'bold'}}>{ap.cliente}</p>
                    <p style={{margin:0, fontSize:'10px', color: theme.textMuted}}>Pendiente: <b style={{color:theme.accent}}>${ap.restante}</b></p>
                  </div>
                  <button onClick={() => generarWhatsAppApartado(ap)} style={{...btnExportStyle, background: '#25D366'}}>WA 📱</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA HISTORIAL & CORTE */}
        {vista === 'historial' && (
          <>
            <div style={cardStyle}>
              <input type="date" value={fechaConsulta} onChange={e=>setFechaConsulta(e.target.value)} style={{...inputStyle, marginBottom:'15px'}} />
              <div style={{display:'flex', justifyContent:'space-around', textAlign:'center'}}>
                <div><p style={{margin:0, fontSize:'10px'}}>VENTAS</p><h3>${filtrados.totalV}</h3></div>
                <div><p style={{margin:0, fontSize:'10px'}}>UTILIDAD</p><h3 style={{color:theme.accent}}>${filtrados.utilidad}</h3></div>
              </div>
              <button className={btnClass} onClick={realizarCorte} style={{width:'100%', marginTop:'15px', padding:'10px', background:theme.accent, borderRadius:'8px', color:'#fff', border:'none', fontWeight:'bold'}}>REALIZAR CORTE DE CAJA 🏁</button>
            </div>
          </>
        )}

      </main>

      {/* MODAL DE INSTALACIÓN CON SELECT DINÁMICO */}
      {mostrarModalInstalacion && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{...cardStyle, maxWidth:'400px', width:'100%'}}>
            <h3 style={{marginTop:0, color: theme.install}}>ORDEN DE INSTALACIÓN</h3>
            <form onSubmit={guardarInstalacion}>
              <input placeholder="Cliente" value={nuevaInst.cliente} onChange={e=>setNuevaInst({...nuevaInst, cliente: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <input placeholder="Dirección" value={nuevaInst.direccion} onChange={e=>setNuevaInst({...nuevaInst, direccion: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                <input type="date" value={nuevaInst.fecha} onChange={e=>setNuevaInst({...nuevaInst, fecha: e.target.value})} style={inputStyle} required />
                <input type="time" value={nuevaInst.hora} onChange={e=>setNuevaInst({...nuevaInst, hora: e.target.value})} style={inputStyle} required />
              </div>
              
              {/* SELECT DINÁMICO DE INSTALADORES */}
              <select 
                value={nuevaInst.instalador} 
                onChange={e=>setNuevaInst({...nuevaInst, instalador: e.target.value})} 
                style={{...inputStyle, marginBottom:'10px'}} 
                required
              >
                <option value="">Seleccionar Instalador...</option>
                {instaladores.map(nom => <option key={nom} value={nom}>{nom}</option>)}
              </select>

              <div style={{display:'flex', gap:'10px'}}>
                <button type="button" onClick={()=>setMostrarModalInstalacion(false)} style={{...inputStyle, background: theme.bg, flex:1}}>Cerrar</button>
                <button type="submit" style={{...inputStyle, background: theme.install, color:'#fff', border:'none', flex:1, fontWeight:'bold'}}>AGENDAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR */}
      <nav style={{ position: 'fixed', bottom: '15px', left: '10px', right: '10px', background: theme.card, border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-around', padding: '10px', borderRadius: '20px', zIndex: 100 }}>
        <button className={btnClass} onClick={()=>setVista('catalogo')} style={{background: vista==='catalogo'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>📦</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Stock</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('pos')} style={{background: vista==='pos'?theme.bg:'none', border:'none', position: 'relative', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>🛒</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Venta</span>
          {carrito.length > 0 && <span style={{ position: 'absolute', top: '-5px', right: '0', background: theme.danger, color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', border: `2px solid ${theme.card}` }}>{carrito.length}</span>}
        </button>
        <button className={btnClass} onClick={()=>setVista('apartados')} style={{background: vista==='apartados'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>🔖</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Apartar</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('installations')} style={{background: vista==='installations'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>🛠️</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Instal.</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('admin')} style={{background: vista==='admin'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>⚡</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Staff</span>
        </button>
        <button className={btnClass} onClick={()=>setVista('historial')} style={{background: vista==='historial'?theme.bg:'none', border:'none', flexDirection: 'column', gap: '4px'}}>
          <span style={{fontSize:'20px'}}>📈</span>
          <span style={{fontSize:'8px', color: theme.textMuted}}>Corte</span>
        </button>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-interactivo { transition: transform 0.1s active; cursor: pointer; display: flex; align-items: center; justify-content: center; background: none; border: none; color: inherit; }
        .btn-interactivo:active { transform: scale(0.95); }
        select option { background: ${theme.card}; color: ${theme.text}; }
      `}</style>
    </div>
  );
}
