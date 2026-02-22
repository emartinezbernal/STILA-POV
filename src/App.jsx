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
  // NUEVO ESTADO PARA LOGIN
  const [usuarioActual, setUsuarioActual] = useState(localStorage.getItem('userStilaPro') || '');
  const [inputLogin, setInputLogin] = useState('');

  const [carrito, setCarrito] = useState([]);
  const [vista, setVista] = useState('catalogo'); // CAMBIADO DE 'live' A 'catalogo' POR ESTAR OCULTO
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
  const TIEMPO_LIMITE_HS = 168; // 7 días * 24 horas

  // --- NUEVOS ESTADOS INSTALACIONES ---
  const [instalaciones, setInstalaciones] = useState([]);
  const [mostrarModalInstalacion, setMostrarModalInstalacion] = useState(false);
  const [nuevaInst, setNuevaInst] = useState({ 
    cliente: '', direccion: '', fecha: '', hora: '', instalador: '', telefono: '', notas: '' 
  });
  
  // --- NUEVOS ESTADOS ADMIN (INSTALADORES) ---
  const [instaladores, setInstaladores] = useState(JSON.parse(localStorage.getItem('adminInstaladoresStila')) || []);
  const [nuevoInstaladorAdmin, setNuevoInstaladorAdmin] = useState('');

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

  useEffect(() => { 
    if (usuarioActual) {
      obtenerTodo(); 
      const cortesGuardados = localStorage.getItem('cortesStilaPro');
      if (cortesGuardados) setCortes(JSON.parse(cortesGuardados));
      
      const apartadosGuardados = localStorage.getItem('apartadosStilaPro');
      if (apartadosGuardados) setApartados(JSON.parse(apartadosGuardados));

      // Cargar instalaciones
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

  // --- LÓGICA ADMIN INSTALADORES ---
  const agregarInstaladorAdmin = (e) => {
    e.preventDefault();
    if (!nuevoInstaladorAdmin.trim()) return;
    const lista = [...instaladores, nuevoInstaladorAdmin.trim().toUpperCase()];
    setInstaladores(lista);
    localStorage.setItem('adminInstaladoresStila', JSON.stringify(lista));
    setNuevoInstaladorAdmin('');
  };

  const eliminarInstaladorAdmin = (nombre) => {
    if (!window.confirm(`¿Eliminar a ${nombre} de la lista de instaladores?`)) return;
    const lista = instaladores.filter(i => i !== nombre);
    setInstaladores(lista);
    localStorage.setItem('adminInstaladoresStila', JSON.stringify(lista));
  };

  // --- LÓGICA INSTALACIONES ---
  const guardarInstalacion = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nueva = { 
      ...nuevaInst, 
      id, 
      estado: 'En proceso', 
      evidencia: null,
      creadoPor: usuarioActual 
    };
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

  const cambiarEstadoInst = (id, nuevoEstado) => {
    const lista = instalaciones.map(inst => 
      inst.id === id ? { ...inst, estado: nuevoEstado } : inst
    );
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
  };

  const eliminarInstalacion = (id) => {
    if(!window.confirm("¿Eliminar registro de instalación?")) return;
    const lista = instalaciones.filter(i => i.id !== id);
    setInstalaciones(lista);
    localStorage.setItem('instStilaPro', JSON.stringify(lista));
  };

  // --- FUNCIONES DE EXPORTACIÓN ---
  const exportarExcelGenerico = (datos, nombreArchivo) => {
    if (!window.XLSX) return alert("Cargando motor de Excel...");
    const ws = window.XLSX.utils.json_to_sheet(datos);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Datos");
    window.XLSX.writeFile(wb, `${nombreArchivo}_${hoyStr}.xlsx`);
  };

  const exportarPDFGenerico = (titulo, columnas, filas, nombreArchivo) => {
    if (!window.jspdf) return alert("Cargando motor de PDF...");
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(18);
    doc.text(titulo, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado por: ${usuarioActual} - ${new Date().toLocaleString()}`, 14, 30);
    doc.autoTable({
      startY: 35,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });
    doc.save(`${nombreArchivo}_${hoyStr}.pdf`);
  };

  // --- LÓGICA DE LOGIN ---
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

  // --- LÓGICA LIVE ---
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
      await supabase.from('ventas').insert([{ 
        total: nuevaCaptura.total, 
        costo_total: 0, 
        detalles: `🔴 LIVE [${folio}]: ${nuevaCaptura.cliente} - Prenda: $${nuevaCaptura.precioPrenda} + Envío: $${nuevaCaptura.envio} (${metodoTxt})` 
      }]);
      obtenerTodo();
    } catch (e) { console.error(e); }

    setClienteLive('');
    setPrecioLiveManual('');
    setTimeout(() => inputClienteRef.current?.focus(), 50);
  };

  const generarWhatsAppLive = (cap) => {
    let msg = `¡Hola *${cap.cliente}*! 👋 Gracias por tu compra.\n\n`;
    msg += `✅ *Detalle:*\n• Folio: *${cap.folio}*\n• Prenda: *$${cap.precioPrenda}*\n`;
    if (cap.envio > 0) msg += `• Envío: *$${cap.envio}*\n`;
    msg += `• Entrega: *${cap.metodo}*\n\n`;
    msg += `*TOTAL A PAGAR: $${cap.total}*\n\n`;
    msg += `Envíanos tu comprobante. ¡Tienes 24 hrs! ⏳👗`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // --- LÓGICA DE APARTADOS ---
  const agregarApartado = (e) => {
    e.preventDefault();
    const id = Date.now();
    const nuevo = { 
      ...nuevoApartado, 
      id, 
      fecha: new Date().toISOString(),
      estado: 'Pendiente',
      restante: Number(nuevoApartado.total) - Number(nuevoApartado.anticipo)
    };
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
    msg += `--------------------------\n`;
    msg += `⏳ Tiempo límite: 7 días para liquidar.\n`;
    msg += `¡Gracias por apartar! ✨`;
    window.open(`https://wa.me/${ap.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
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
    const tel = window.prompt("Número de WhatsApp (ej. 521...):");
    const anticipo = window.prompt("Monto del anticipo recibido:", "0");
    if (anticipo === null) return;
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
      alert("Apartado registrado y stock descontado.");
      setCarrito([]);
      await obtenerTodo();
      setVista('apartados');
      generarWhatsAppApartado(nuevo);
    } catch (e) { alert("Error al procesar el stock del apartado"); console.error(e); }
  }

  // --- LÓGICA DE NEGOCIO ---
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
    alert("Corte realizado y reporte enviado.");
  };

  async function finalizarVenta() {
    if (carrito.length === 0) return;
    
    // 1. Método de pago
    const m = window.prompt("1. Efec | 2. Trans | 3. Tarj", "1");
    if (!m) return;
    let mTxt = m === "1" ? "Efectivo" : m === "2" ? "Transferencia" : "Tarjeta";
    
    // 2. Método de envío de ticket (Cuestionario)
    const envioTicket = window.prompt("Enviar ticket: 1. WhatsApp | 2. Email | 3. No enviar", "3");
    let contactoDestino = "";
    if (envioTicket === "1") {
      contactoDestino = window.prompt("Número de WhatsApp (ej. 521...):") || "";
    } else if (envioTicket === "2") {
      contactoDestino = window.prompt("Correo electrónico del cliente:") || "";
    }

    const tv = carrito.reduce((a, b) => a + b.precio, 0);
    const cv = carrito.reduce((a, b) => a + (b.costo_unitario || 0), 0);
    const folioVenta = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    
    try {
      // 3. Registro en Base de Datos (No se interfiere si se envían mensajes)
      await supabase.from('ventas').insert([{ 
        total: tv, 
        costo_total: cv, 
        detalles: `🛒 [${folioVenta}] Vendedor: ${usuarioActual} | Pago: ${mTxt} | Hora: ${hora} | Productos: ` + carritoAgrupado.map(i => `${i.nombre} (x${i.cantCar})`).join(', ') 
      }]);
      
      for (const item of carritoAgrupado) {
        const pDB = inventario.find(p => p.id === item.id);
        if (pDB) await supabase.from('productos').update({ stock: pDB.stock - item.cantCar }).eq('id', item.id);
      }
      
      // 4. Formatear el Ticket
      let ticketMsg = `*🛍️ TICKET DE COMPRA - STILA-PRO*\n--------------------------\n🆔 Folio: *${folioVenta}*\n👤 Vendedor: *${usuarioActual}*\n📅 Fecha: ${new Date().toLocaleDateString()} | ${hora}\n💳 Pago: *${mTxt}*\n--------------------------\n`;
      carritoAgrupado.forEach(item => { ticketMsg += `• ${item.nombre} (x${item.cantCar}) - $${item.subtotal}\n`; });
      ticketMsg += `--------------------------\n*TOTAL: $${tv}*\n\n¡Gracias por tu preferencia! ✨`;
      
      // 5. Envío automático según selección
      if (envioTicket === "1") {
        window.open(`https://wa.me/${contactoDestino}?text=${encodeURIComponent(ticketMsg)}`, '_blank');
      } else if (envioTicket === "2" && contactoDestino) {
        const emailBody = ticketMsg.replace(/\*/g, ''); // Quitamos asteriscos para que el email se vea limpio
        window.open(`mailto:${contactoDestino}?subject=Ticket de Compra - STILA-PRO&body=${encodeURIComponent(emailBody)}`, '_blank');
      }

      setCarrito([]); 
      await obtenerTodo(); 
      setVista('historial');
    } catch (e) { 
      alert("Error al procesar la venta"); 
    }
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
  const btnExportStyle = { padding: '8px 12px', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' };

  if (!usuarioActual) {
    return (
      <div style={{ backgroundColor: theme.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ ...cardStyle, width: '100%', maxWidth: '350px', textAlign: 'center' }}>
          <h1 style={{ color: theme.accent, fontSize: '24px', marginBottom: '10px' }}>STILA-PRO ⚡</h1>
          <p style={{ color: theme.textMuted, fontSize: '14px', marginBottom: '20px' }}>Ingresa tu nombre para comenzar</p>
          <form onSubmit={manejarLogin}>
            <input autoFocus placeholder="Nombre de Usuario" value={inputLogin} onChange={e => setInputLogin(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', marginBottom: '15px' }} />
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
        <div style={{ display:'flex', alignItems:'center', gap: '10px'}}>
           <button onClick={() => setVista('admin_instaladores')} style={{ background: 'none', border: 'none', color: theme.text, fontSize: '10px', textDecoration: 'underline' }}>⚙️ ADMIN</button>
           <span style={{ fontSize: '10px', color: theme.textMuted }}>👤 {usuarioActual}</span>
           <button onClick={cerrarSesion} style={{ background: 'none', border: 'none', color: theme.danger, fontSize: '10px' }}>SALIR</button>
        </div>
      </header>

      <main style={{ padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
        
        {/* --- NUEVA VISTA: ADMIN INSTALADORES --- */}
        {vista === 'admin_instaladores' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{fontSize:'14px', margin:'0 0 15px 0', color: theme.accent}}>⚙️ ADMINISTRACIÓN DE INSTALADORES</h3>
            <div style={cardStyle}>
              <form onSubmit={agregarInstaladorAdmin} style={{display:'flex', gap:'10px'}}>
                <input 
                  placeholder="Nombre del instalador" 
                  value={nuevoInstaladorAdmin} 
                  onChange={e => setNuevoInstaladorAdmin(e.target.value)} 
                  style={inputStyle} 
                />
                <button className={btnClass} style={{background:theme.accent, color:'#fff', border:'none', borderRadius:'10px', padding:'0 20px', fontWeight:'bold'}}>AÑADIR</button>
              </form>
            </div>
            <div style={cardStyle}>
              <h4 style={{fontSize:'12px', color:theme.textMuted, marginTop:0}}>LISTADO ACTUAL</h4>
              {instaladores.length === 0 && <p style={{fontSize:'12px', textAlign:'center'}}>No hay instaladores registrados.</p>}
              {instaladores.map((inst, idx) => (
                <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${theme.border}`}}>
                  <span style={{fontSize:'13px', fontWeight:'bold'}}>{inst}</span>
                  <button onClick={() => eliminarInstaladorAdmin(inst)} style={{background:'none', border:'none', color:theme.danger, fontSize:'14px'}}>🗑️</button>
                </div>
              ))}
            </div>
            <button onClick={() => setVista('installations')} style={{width:'100%', background:theme.bg, border:`1px solid ${theme.border}`, color:theme.text, padding:'10px', borderRadius:'10px'}}>VOLVER A INSTALACIONES</button>
          </div>
        )}

        {vista === 'live' && (
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
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <h3 style={{fontSize:'12px', color:theme.textMuted, margin:0}}>ÚLTIMAS ASIGNACIONES</h3>
              <div style={{display:'flex', gap:'5px'}}>
                <button onClick={() => exportarExcelGenerico(capturasLive, 'Live_Capturas')} style={{...btnExportStyle, background: theme.excel}}>XLS</button>
                <button onClick={() => exportarPDFGenerico('ASIGNACIONES LIVE', ['Cliente', 'Folio', 'Metodo', 'Total'], capturasLive.map(c => [c.cliente, c.folio, c.metodo, `$${c.total}`]), 'Live_Capturas')} style={{...btnExportStyle, background: theme.pdf}}>PDF</button>
              </div>
            </div>
            {capturasLive.map((cap) => (
              <div key={cap.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <p style={{margin:0, fontWeight:'bold'}}>{cap.cliente}</p>
                    <div style={{display:'flex', gap:'8px', marginTop:'4px'}}>
                      <span style={{fontSize:'10px', color:theme.textMuted}}>Folio: {cap.folio}</span>
                      <span style={{fontSize:'10px', color:theme.live}}>🚚 {cap.metodo} {cap.envio > 0 && `(+$${cap.envio})`}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{margin:0, color:theme.accent, fontWeight:'bold', fontSize:'18px'}}>${cap.total}</p>
                    <button className={btnClass} onClick={() => generarWhatsAppLive(cap)} style={{background:'none', border:`1px solid ${theme.accent}`, color:theme.accent, fontSize:'10px', borderRadius:'5px', padding:'2px 5px'}}>WA 📱</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {vista === 'catalogo' && (
          <>
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <input placeholder="🔍 Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} style={{...inputStyle, flex: 1}} />
              <button onClick={() => exportarExcelGenerico(inventarioReal.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())), 'Catalogo_Actual')} style={{...btnExportStyle, background: theme.excel, padding: '0 15px'}}>EXCEL</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {inventarioReal.filter(p => p.stockActual > 0 && p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <div key={p.id} style={cardStyle}>
                  <p style={{fontSize:'10px', margin:0, color: theme.textMuted}}>{p.paca || 'S/N'} / {p.proveedor || 'Sin Prov.'} / {p.stockActual} pzs</p>
                  <h4 style={{margin:'5px 0', fontSize:'13px'}}>{p.nombre}</h4>
                  <p style={{fontSize:'18px', fontWeight:'bold', margin:0}}>${p.precio}</p>
                  <button className={btnClass} onClick={()=>setCarrito([...carrito, p])} style={{width:'100%', marginTop:'10px', padding:'8px', background:theme.bg, color:theme.accent, border:`1px solid ${theme.border}`, borderRadius:'8px'}}>AÑADIR</button>
                </div>
              ))}
            </div>
          </>
        )}

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
                <input placeholder="WhatsApp (Ej: 521...)" value={nuevoApartado.telefono} onChange={e=>setNuevoApartado({...nuevoApartado, telefono: e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
                <button className={btnClass} style={{width:'100%', padding:'12px', background:theme.apartado, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold'}}>CREAR APARTADO</button>
              </form>
            </div>
            <h3 style={{fontSize:'12px', color:theme.textMuted, marginBottom:'10px'}}>CONTROL DE APARTADOS</h3>
            {apartados.map(ap => {
              const horasTranscurridas = (Date.now() - ap.id) / (1000 * 60 * 60);
              const esVencido = horasTranscurridas > TIEMPO_LIMITE_HS;
              return (
                <div key={ap.id} style={{...cardStyle, border: esVencido ? `1px solid ${theme.danger}` : `1px solid ${theme.border}`}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <p style={{margin:0, fontWeight:'bold', color: esVencido ? theme.danger : theme.text}}>{ap.cliente} {esVencido && '⚠️ VENCIDO'}</p>
                      <p style={{margin:'4px 0', fontSize:'12px'}}>{ap.producto}</p>
                      <p style={{margin:0, fontSize:'10px', color: theme.textMuted}}>Restante: <b style={{color:theme.accent}}>${ap.restante}</b></p>
                    </div>
                    <div style={{textAlign:'right', display:'flex', flexDirection:'column', gap:'5px'}}>
                      <button onClick={() => generarWhatsAppApartado(ap)} style={{...btnExportStyle, background: '#25D366'}}>WA 📱</button>
                      <button onClick={() => eliminarApartado(ap.id)} style={{...btnExportStyle, background: theme.danger}}>Borrar</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {vista === 'installations' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
              <h2 style={{color: theme.install, fontSize: '18px', margin: 0}}>🛠️ GESTIÓN DE INSTALACIONES</h2>
              <button className={btnClass} onClick={() => setMostrarModalInstalacion(true)} style={{padding:'8px 15px', background:theme.install, color:'#fff', borderRadius:'10px', border:'none', fontWeight:'bold', fontSize:'11px'}}>NUEVA INSTALACIÓN 🛠️</button>
            </div>
            
            {instalaciones.length === 0 && <p style={{color: theme.textMuted, textAlign:'center'}}>No hay instalaciones programadas.</p>}
            {instalaciones.map(inst => (
              <div key={inst.id} style={{...cardStyle, borderLeft: `5px solid ${inst.estado === 'Realizada' ? theme.accent : theme.install}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <h4 style={{margin:0}}>{inst.cliente}</h4>
                    <p style={{margin:'5px 0', fontSize:'11px', color: theme.textMuted}}>📍 {inst.direccion}</p>
                    <p style={{margin:0, fontSize:'11px'}}>📅 {inst.fecha} | ⏰ {inst.hora}</p>
                    <p style={{margin:'5px 0', fontSize:'11px', fontWeight:'bold'}}>👷 Instalador: {inst.instalador}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', background: inst.estado === 'Realizada' ? theme.accent : theme.install, color: '#fff'}}>
                      {inst.estado}
                    </span>
                  </div>
                </div>

                <div style={{marginTop:'15px', display:'flex', gap:'10px', alignItems:'center'}}>
                   {inst.estado !== 'Realizada' && (
                     <>
                      <label style={{background: theme.bg, border: `1px solid ${theme.border}`, padding: '8px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer', flex: 1, textAlign: 'center'}}>
                        📷 SUBIR EVIDENCIA
                        <input type="file" accept="image/*" onChange={(e) => manejarEvidencia(inst.id, e)} style={{display:'none'}} />
                      </label>
                      <button onClick={() => cambiarEstadoInst(inst.id, 'Cancelada')} style={{...btnExportStyle, background: theme.danger}}>Anular</button>
                     </>
                   )}
                   {inst.evidencia && (
                     <img src={inst.evidencia} alt="Evidencia" style={{width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover'}} />
                   )}
                   <button onClick={() => window.open(`https://wa.me/${inst.telefono}?text=Hola ${inst.cliente}, su instalación está ${inst.estado}.`)} style={{...btnExportStyle, background: '#25D366'}}>WA</button>
                   <button onClick={() => eliminarInstalacion(inst.id)} style={{...btnExportStyle, background: theme.card, border:`1px solid ${theme.danger}`, color:theme.danger}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {vista === 'historial' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{display: 'flex', gap:'10px', marginBottom: '15px'}}>
               <input type="date" value={fechaConsulta} onChange={e=>setFechaConsulta(e.target.value)} style={{...inputStyle, flex: 1}} />
               <button onClick={realizarCorte} style={{background: theme.live, border: 'none', padding: '0 15px', borderRadius: '10px', color: '#000', fontWeight: 'bold'}}>CORTE</button>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px'}}>
               <div style={{...cardStyle, marginBottom: 0, textAlign: 'center'}}>
                  <p style={{fontSize: '10px', margin: 0, color: theme.textMuted}}>VENTAS</p>
                  <h3 style={{margin: 0, color: theme.accent}}>${filtrados.totalV}</h3>
               </div>
               <div style={{...cardStyle, marginBottom: 0, textAlign: 'center'}}>
                  <p style={{fontSize: '10px', margin: 0, color: theme.textMuted}}>GASTOS</p>
                  <h3 style={{margin: 0, color: theme.danger}}>${filtrados.totalG}</h3>
               </div>
            </div>

            {filtrados.vnt.map(v => (
              <div key={v.id} style={cardStyle}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                  <span style={{color: theme.textMuted}}>{new Date(v.created_at).toLocaleTimeString()}</span>
                  <b style={{color: theme.accent}}>${v.total}</b>
                </div>
                <p style={{fontSize: '10px', margin: '5px 0 0 0', color: theme.textMuted}}>{v.detalles}</p>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* --- MODAL NUEVA INSTALACIÓN --- */}
      {mostrarModalInstalacion && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{...cardStyle, width:'100%', maxWidth:'400px', maxHeight:'90vh', overflowY:'auto'}}>
            <h3 style={{marginTop:0, color: theme.install}}>PROGRAMAR INSTALACIÓN</h3>
            <form onSubmit={guardarInstalacion}>
              <input placeholder="Cliente" onChange={e=>setNuevaInst({...nuevaInst, cliente:e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <input placeholder="Dirección Exacta" onChange={e=>setNuevaInst({...nuevaInst, direccion:e.target.value})} style={{...inputStyle, marginBottom:'10px'}} required />
              <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                <input type="date" onChange={e=>setNuevaInst({...nuevaInst, fecha:e.target.value})} style={inputStyle} required />
                <input type="time" onChange={e=>setNuevaInst({...nuevaInst, hora:e.target.value})} style={inputStyle} required />
              </div>

              {/* SELECT PERSONALIZADO DE INSTALADORES */}
              <select 
                value={nuevaInst.instalador} 
                onChange={e=>setNuevaInst({...nuevaInst, instalador:e.target.value})} 
                style={{...inputStyle, marginBottom:'10px'}} 
                required
              >
                <option value="">-- Selecciona Instalador --</option>
                {instaladores.map((inst, idx) => (
                  <option key={idx} value={inst}>{inst}</option>
                ))}
              </select>

              <input placeholder="WhatsApp Cliente" onChange={e=>setNuevaInst({...nuevaInst, telefono:e.target.value})} style={{...inputStyle, marginBottom:'10px'}} />
              <textarea placeholder="Notas adicionales..." onChange={e=>setNuevaInst({...nuevaInst, notas:e.target.value})} style={{...inputStyle, height:'60px', marginBottom:'15px'}} />
              
              <button type="submit" style={{width:'100%', padding:'15px', background:theme.install, color:'#fff', border:'none', borderRadius:'10px', fontWeight:'bold', marginBottom:'10px'}}>GUARDAR INSTALACIÓN</button>
              <button type="button" onClick={()=>setMostrarModalInstalacion(false)} style={{width:'100%', padding:'10px', background:'none', color:theme.textMuted, border:'none'}}>CANCELAR</button>
            </form>
          </div>
        </div>
      )}

      {/* CARRITO FLOTANTE */}
      {carrito.length > 0 && vista === 'catalogo' && (
        <div style={{ position: 'fixed', bottom: '85px', left: '15px', right: '15px', background: theme.accent, borderRadius: '15px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 90 }}>
          <div>
            <b style={{ color: '#fff' }}>{carrito.length} Items</b>
            <p style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>Total: ${carrito.reduce((a, b) => a + b.precio, 0)}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={apartarDesdeCarrito} style={{ background: theme.apartado, color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px' }}>APARTAR</button>
            <button onClick={finalizarVenta} style={{ background: '#fff', color: theme.accent, border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}>PAGAR</button>
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.card, display: 'flex', justifyContent: 'space-around', padding: '15px', borderTop: `1px solid ${theme.border}`, zIndex: 100 }}>
        <button onClick={() => setVista('catalogo')} style={{ background: 'none', border: 'none', color: vista === 'catalogo' ? theme.accent : theme.textMuted, fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '20px' }}>🖼️</span> Tienda
        </button>
        <button onClick={() => setVista('historial')} style={{ background: 'none', border: 'none', color: vista === 'historial' ? theme.accent : theme.textMuted, fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '20px' }}>📈</span> Corte
        </button>
        <button onClick={() => setVista('apartados')} style={{ background: 'none', border: 'none', color: vista === 'apartados' ? theme.accent : theme.textMuted, fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '20px' }}>🔖</span> Apartados
        </button>
        <button onClick={() => setVista('installations')} style={{ background: 'none', border: 'none', color: vista === 'installations' ? theme.accent : theme.textMuted, fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '20px' }}>🛠️</span> Instala
        </button>
      </nav>
    </div>
  );
}
