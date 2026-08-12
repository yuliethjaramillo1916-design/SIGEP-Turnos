import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Building2, Plus, Search, Filter, AlertTriangle, CheckCircle2,
  Lock, User, Mail, Phone, MapPin, Calendar, Clock, Eye,
  Edit2, ShieldAlert, Archive, Play, RefreshCw, X, Sparkles, Key
} from 'lucide-react';

export default function SuperAdminEntidades() {
  const [entidades, setEntidades] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [modalExitoCredenciales, setModalExitoCredenciales] = useState(null);

  // Formulario Creación
  const [formCrear, setFormCrear] = useState({
    nombre: '',
    NIT: '',
    direccion: '',
    telefono: '',
    correo: '',
    prefijoCodigo: 'T',
    horarioAtencion: '08:00 - 17:00',
    limiteTurnosDia: 200,
    planId: '',
    mesesVigencia: 12,
    adminNombre: '',
    adminApellido: '',
    adminEmail: '',
    adminPassword: ''
  });

  // Formulario Edición
  const [formEditar, setFormEditar] = useState({});

  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const fetchEntidades = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroEstado !== 'todas') params.estado = filtroEstado;
      if (busqueda.trim()) params.buscar = busqueda.trim();

      const [resEntidades, resPlanes] = await Promise.all([
        api.get('/super-admin/entidades', { params }),
        api.get('/super-admin/planes')
      ]);

      setEntidades(resEntidades.data || []);
      setPlanes(resPlanes.data || []);
      if (!formCrear.planId && resPlanes.data?.length > 0) {
        setFormCrear(prev => ({ ...prev, planId: resPlanes.data[0]._id }));
      }
    } catch (err) {
      console.error('Error al cargar entidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntidades();
  }, [filtroEstado]);

  const handleBuscar = (e) => {
    e.preventDefault();
    fetchEntidades();
  };

  // ── Crear Entidad ──
  const handleCrearEntidad = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal(null);
    try {
      const res = await api.post('/super-admin/entidades', formCrear);
      setModalCrear(false);
      setModalExitoCredenciales({
        entidad: res.data.entidad,
        admin: res.data.admin,
        passwordTemporal: formCrear.adminPassword
      });
      // Limpiar form
      setFormCrear({
        nombre: '',
        NIT: '',
        direccion: '',
        telefono: '',
        correo: '',
        prefijoCodigo: 'T',
        horarioAtencion: '08:00 - 17:00',
        limiteTurnosDia: 200,
        planId: planes[0]?._id || '',
        mesesVigencia: 12,
        adminNombre: '',
        adminApellido: '',
        adminEmail: '',
        adminPassword: ''
      });
      fetchEntidades();
    } catch (err) {
      setErrorModal(err.response?.data?.message || 'Error al crear la entidad');
    } finally {
      setProcesando(false);
    }
  };

  // ── Abrir modal edición ──
  const abrirModalEditar = (ent) => {
    setModalEditar(ent);
    setFormEditar({
      nombre: ent.nombre || '',
      NIT: ent.NIT || '',
      direccion: ent.direccion || '',
      telefono: ent.telefono || '',
      correo: ent.correo || '',
      prefijoCodigo: ent.prefijoCodigo || 'T',
      horarioAtencion: ent.horarioAtencion || '08:00 - 17:00',
      limiteTurnosDia: ent.limiteTurnosDia || 200,
      planId: ent.planId?._id || ent.planId || '',
      cantidadMaximaUsuarios: ent.cantidadMaximaUsuarios || 10,
      cantidadMaximaVentanillas: ent.cantidadMaximaVentanillas || 5,
      cantidadMaximaTramites: ent.cantidadMaximaTramites || 15
    });
    setErrorModal(null);
  };

  // ── Guardar edición ──
  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal(null);
    try {
      await api.put(`/super-admin/entidades/${modalEditar._id}`, formEditar);
      setModalEditar(null);
      fetchEntidades();
    } catch (err) {
      setErrorModal(err.response?.data?.message || 'Error al actualizar entidad');
    } finally {
      setProcesando(false);
    }
  };

  // ── Cambiar Estado (Suspender, Reactivar, Archivar) ──
  const ejecutarCambioEstado = async (entidadId, nuevoEstado, motivo = '') => {
    setProcesando(true);
    try {
      await api.patch(`/super-admin/entidades/${entidadId}/estado`, {
        estado: nuevoEstado,
        motivo
      });
      setModalConfirmacion(null);
      fetchEntidades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado de la entidad');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Gestión de Entidades Clientes
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Alta de instituciones, control de cuotas, planes y aprovisionamiento automático de administradores.
          </p>
        </div>

        <button
          onClick={() => { setModalCrear(true); setErrorModal(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.4rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none',
            boxShadow: '0 6px 20px rgba(236,72,153,0.35)', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={18} /> Nueva Entidad + Administrador
        </button>
      </div>

      {/* ── Barra de Filtros y Búsqueda ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        background: 'rgba(255,255,255,0.03)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)'
      }}>
        {/* Filtros por estado */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'todas', label: 'Todas las Entidades' },
            { id: 'activa', label: 'Activas' },
            { id: 'suspendida', label: 'Suspendidas' },
            { id: 'archivada', label: 'Archivadas' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              style={{
                padding: '0.45rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                background: filtroEstado === tab.id ? 'rgba(236,72,153,0.2)' : 'transparent',
                border: `1px solid ${filtroEstado === tab.id ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: filtroEstado === tab.id ? '#f472b6' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar por Nombre, NIT o Correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%', height: '40px', paddingLeft: '2.5rem', paddingRight: '1rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <button type="submit" style={{
            padding: '0 1rem', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer'
          }}>
            Buscar
          </button>
        </form>
      </div>

      {/* ── Tabla de Entidades ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
          Cargando entidades...
        </div>
      ) : entidades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <Building2 size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No se encontraron entidades</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
            {busqueda ? 'No hay resultados para el término buscado.' : 'Aún no has registrado entidades en la plataforma.'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>Entidad Institucional</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Plan / Licencia</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Usuarios</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Ventanillas</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Trámites</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Turnos Totales</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entidades.map((ent) => {
                const metricas = ent.metricas || {};
                const pctUsers = Math.round((metricas.usuarios || 0) / (metricas.maxUsuarios || 1) * 100);

                return (
                  <tr key={ent._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Info Entidad */}
                    <td style={{ padding: '1.1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f472b6', fontWeight: 800, overflow: 'hidden', flexShrink: 0
                        }}>
                          {ent.logo ? (
                            <img src={ent.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Building2 size={20} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'white', fontSize: '0.92rem' }}>{ent.nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                            NIT: {ent.NIT} • Prefijo: <strong style={{ color: '#a78bfa' }}>{ent.prefijoCodigo}</strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#c084fc' }}>{ent.planId?.nombre || 'Básico'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        Vence: {ent.fechaVencimiento ? new Date(ent.fechaVencimiento).toLocaleDateString() : 'Indefinido'}
                      </div>
                    </td>

                    {/* Usuarios */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'white' }}>
                        {metricas.usuarios || 0} / <span style={{ color: 'rgba(255,255,255,0.4)' }}>{metricas.maxUsuarios || 10}</span>
                      </div>
                      <div style={{ width: '70px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, pctUsers)}%`, height: '100%', background: pctUsers > 90 ? '#ef4444' : '#8b5cf6' }} />
                      </div>
                    </td>

                    {/* Ventanillas */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'white' }}>{metricas.ventanillas || 0}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}> / {metricas.maxVentanillas || 5}</span>
                    </td>

                    {/* Trámites */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'white' }}>{metricas.tramites || 0}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}> / {metricas.maxTramites || 15}</span>
                    </td>

                    {/* Turnos */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 800, color: '#60a5fa' }}>{metricas.turnosEmitidos || 0}</span>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '20px',
                        background: ent.estado === 'activa' ? 'rgba(34,197,94,0.15)' :
                                    ent.estado === 'suspendida' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                        color: ent.estado === 'activa' ? '#4ade80' :
                               ent.estado === 'suspendida' ? '#facc15' : '#f87171',
                        textTransform: 'capitalize'
                      }}>
                        {ent.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => abrirModalEditar(ent)}
                          title="Editar entidad y límites"
                          style={{
                            padding: '0.45rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        {ent.estado === 'activa' && (
                          <button
                            onClick={() => setModalConfirmacion({
                              tipo: 'suspender',
                              entidad: ent,
                              titulo: `¿Suspender temporalmente "${ent.nombre}"?`,
                              mensaje: 'Sus usuarios no podrán iniciar sesión hasta que sea reactivada.',
                              accion: () => ejecutarCambioEstado(ent._id, 'suspendida')
                            })}
                            title="Suspender acceso"
                            style={{
                              padding: '0.45rem', borderRadius: '8px', background: 'rgba(234,179,8,0.12)',
                              border: '1px solid rgba(234,179,8,0.25)', color: '#facc15', cursor: 'pointer'
                            }}
                          >
                            <AlertTriangle size={14} />
                          </button>
                        )}

                        {ent.estado === 'suspendida' && (
                          <button
                            onClick={() => setModalConfirmacion({
                              tipo: 'reactivar',
                              entidad: ent,
                              titulo: `¿Reactivar "${ent.nombre}"?`,
                              mensaje: 'La entidad volverá a estar completamente operacional.',
                              accion: () => ejecutarCambioEstado(ent._id, 'activa')
                            })}
                            title="Reactivar entidad"
                            style={{
                              padding: '0.45rem', borderRadius: '8px', background: 'rgba(34,197,94,0.15)',
                              border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', cursor: 'pointer'
                            }}
                          >
                            <Play size={14} />
                          </button>
                        )}

                        {ent.estado !== 'archivada' && (
                          <button
                            onClick={() => setModalConfirmacion({
                              tipo: 'archivar',
                              entidad: ent,
                              titulo: `¿Archivar lógicamente "${ent.nombre}"?`,
                              mensaje: 'La entidad quedará inhabilitada de forma permanente pero sus datos y turnos se conservarán intactos en la base de datos (sin borrado físico).',
                              accion: () => ejecutarCambioEstado(ent._id, 'archivada')
                            })}
                            title="Archivar entidad (Lógico)"
                            style={{
                              padding: '0.45rem', borderRadius: '8px', background: 'rgba(239,68,68,0.12)',
                              border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer'
                            }}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ MODAL CREAR ENTIDAD + ADMIN ══════════════ */}
      {modalCrear && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={(e) => { if (e.target === e.currentTarget) setModalCrear(false); }}>
          
          <div style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto',
            background: '#121022', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', padding: '2rem'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={22} color="#ec4899" /> Alta de Nueva Entidad Cliente
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0 0 0' }}>
                  Aprovisionamiento automático de la entidad y su Administrador institucional.
                </p>
              </div>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {errorModal && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '0.8rem', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <AlertTriangle size={16} /> {errorModal}
              </div>
            )}

            <form onSubmit={handleCrearEntidad} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Sección 1: Datos Institucionales */}
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
                  1. Información Institucional
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      NOMBRE DE LA ENTIDAD *
                    </label>
                    <input
                      type="text" placeholder="Ej. Alcaldía de Neiva" required
                      value={formCrear.nombre} onChange={e => setFormCrear({ ...formCrear, nombre: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      NIT / IDENTIFICACIÓN TRIBUTARIA *
                    </label>
                    <input
                      type="text" placeholder="Ej. 891180009-1" required
                      value={formCrear.NIT} onChange={e => setFormCrear({ ...formCrear, NIT: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      CORREO INSTITUCIONAL *
                    </label>
                    <input
                      type="email" placeholder="contacto@alcaldianeiva.gov.co" required
                      value={formCrear.correo} onChange={e => setFormCrear({ ...formCrear, correo: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      TELÉFONO DE CONTACTO *
                    </label>
                    <input
                      type="text" placeholder="+57 8 8710000" required
                      value={formCrear.telefono} onChange={e => setFormCrear({ ...formCrear, telefono: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      DIRECCIÓN PRINCIPAL *
                    </label>
                    <input
                      type="text" placeholder="Carrera 5 # 9-74, Neiva, Huila" required
                      value={formCrear.direccion} onChange={e => setFormCrear({ ...formCrear, direccion: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      PREFIJO DE TURNOS (Máx. 4 letras)
                    </label>
                    <input
                      type="text" placeholder="Ej. ALC" maxLength={4}
                      value={formCrear.prefijoCodigo} onChange={e => setFormCrear({ ...formCrear, prefijoCodigo: e.target.value.toUpperCase() })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      PLAN SAAS INICIAL
                    </label>
                    <select
                      value={formCrear.planId} onChange={e => setFormCrear({ ...formCrear, planId: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: '#1a1830',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    >
                      {planes.map(p => (
                        <option key={p._id} value={p._id}>{p.nombre} (${p.precio}/mes - {p.cantidadMaximaUsuarios} users, {p.cantidadMaximaVentanillas} vents)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Administrador Inicial */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>
                  2. Administrador Inicial de la Entidad
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      NOMBRE *
                    </label>
                    <input
                      type="text" placeholder="Ej. Carlos" required
                      value={formCrear.adminNombre} onChange={e => setFormCrear({ ...formCrear, adminNombre: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      APELLIDO *
                    </label>
                    <input
                      type="text" placeholder="Ej. Gómez" required
                      value={formCrear.adminApellido} onChange={e => setFormCrear({ ...formCrear, adminApellido: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      CORREO DE ACCESO DEL ADMIN *
                    </label>
                    <input
                      type="email" placeholder="admin@alcaldianeiva.gov.co" required
                      value={formCrear.adminEmail} onChange={e => setFormCrear({ ...formCrear, adminEmail: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      CONTRASEÑA TEMPORAL *
                    </label>
                    <input
                      type="text" placeholder="Clave segura para el cliente" required
                      value={formCrear.adminPassword} onChange={e => setFormCrear({ ...formCrear, adminPassword: e.target.value })}
                      style={{
                        width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button" onClick={() => setModalCrear(false)}
                  style={{
                    padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={procesando}
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 800, cursor: procesando ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(236,72,153,0.4)', opacity: procesando ? 0.7 : 1
                  }}
                >
                  {procesando ? 'Creando Entidad...' : 'Crear Entidad & Administrador'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL EDITAR ENTIDAD ══════════════ */}
      {modalEditar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={(e) => { if (e.target === e.currentTarget) setModalEditar(null); }}>
          
          <div style={{
            width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
            background: '#121022', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', padding: '2rem'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white', margin: 0 }}>
                  Editar Entidad: {modalEditar.nombre}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0 0 0' }}>
                  Ajuste de datos institucionales y límites de recursos contratados.
                </p>
              </div>
              <button onClick={() => setModalEditar(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {errorModal && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '0.8rem', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={16} /> {errorModal}
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    NOMBRE DE LA ENTIDAD
                  </label>
                  <input
                    type="text" required
                    value={formEditar.nombre} onChange={e => setFormEditar({ ...formEditar, nombre: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    NIT
                  </label>
                  <input
                    type="text" required
                    value={formEditar.NIT} onChange={e => setFormEditar({ ...formEditar, NIT: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    CORREO
                  </label>
                  <input
                    type="email" required
                    value={formEditar.correo} onChange={e => setFormEditar({ ...formEditar, correo: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    TELÉFONO
                  </label>
                  <input
                    type="text" required
                    value={formEditar.telefono} onChange={e => setFormEditar({ ...formEditar, telefono: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    DIRECCIÓN
                  </label>
                  <input
                    type="text" required
                    value={formEditar.direccion} onChange={e => setFormEditar({ ...formEditar, direccion: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Ajuste de Límites */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f472b6', marginBottom: '0.8rem' }}>
                  Límites de Recursos Permitidos (Cuotas)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      MÁX. USUARIOS
                    </label>
                    <input
                      type="number" min={1} required
                      value={formEditar.cantidadMaximaUsuarios} onChange={e => setFormEditar({ ...formEditar, cantidadMaximaUsuarios: e.target.value })}
                      style={{
                        width: '100%', height: '40px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      MÁX. VENTANILLAS
                    </label>
                    <input
                      type="number" min={1} required
                      value={formEditar.cantidadMaximaVentanillas} onChange={e => setFormEditar({ ...formEditar, cantidadMaximaVentanillas: e.target.value })}
                      style={{
                        width: '100%', height: '40px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                      MÁX. TRÁMITES
                    </label>
                    <input
                      type="number" min={1} required
                      value={formEditar.cantidadMaximaTramites} onChange={e => setFormEditar({ ...formEditar, cantidadMaximaTramites: e.target.value })}
                      style={{
                        width: '100%', height: '40px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button" onClick={() => setModalEditar(null)}
                  style={{
                    padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={procesando}
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 800, cursor: procesando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {procesando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL CONFIRMACIÓN ACCIÓN SENSIBLE ══════════════ */}
      {modalConfirmacion && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '480px', background: '#151329', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px', padding: '2rem', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '50%',
              background: modalConfirmacion.tipo === 'archivar' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              color: modalConfirmacion.tipo === 'archivar' ? '#f87171' : '#facc15'
            }}>
              {modalConfirmacion.tipo === 'archivar' ? <Archive size={24} /> : <AlertTriangle size={24} />}
            </div>

            <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
              {modalConfirmacion.titulo}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.75rem 0' }}>
              {modalConfirmacion.mensaje}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setModalConfirmacion(null)}
                style={{
                  padding: '0.7rem 1.25rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacion.accion}
                disabled={procesando}
                style={{
                  padding: '0.7rem 1.5rem', borderRadius: '10px',
                  background: modalConfirmacion.tipo === 'archivar' ? '#ef4444' : modalConfirmacion.tipo === 'reactivar' ? '#22c55e' : '#eab308',
                  border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer'
                }}
              >
                {procesando ? 'Procesando...' : 'Confirmar Acción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL ÉXITO & CREDENCIALES GENERADAS ══════════════ */}
      {modalExitoCredenciales && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '520px', background: '#121022', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '22px', padding: '2.25rem', boxShadow: '0 30px 70px rgba(0,0,0,0.9)'
          }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', margin: '0 auto 1.25rem'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', margin: '0 0 0.5rem 0' }}>
              ¡Entidad Creada con Éxito!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', margin: '0 0 1.5rem 0' }}>
              La institución <strong>{modalExitoCredenciales.entidad?.nombre}</strong> y su Administrador han sido aprovisionados.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase' }}>
                Credenciales de Acceso Institucional:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Administrador:</span>
                <span style={{ color: 'white', fontWeight: 700 }}>{modalExitoCredenciales.admin?.nombre} {modalExitoCredenciales.admin?.apellido}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Correo Electrónico:</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{modalExitoCredenciales.admin?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Contraseña Temporal:</span>
                <span style={{ color: '#f472b6', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {modalExitoCredenciales.passwordTemporal}
                </span>
              </div>
            </div>

            <button
              onClick={() => setModalExitoCredenciales(null)}
              style={{
                width: '100%', height: '46px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none',
                color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer'
              }}
            >
              Entendido y Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
