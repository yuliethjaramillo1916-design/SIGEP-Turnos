import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Package, Plus, Check, Edit2, AlertTriangle, ShieldCheck,
  Zap, Users, Monitor, BookOpen, Clock, X, CheckCircle2
} from 'lucide-react';

export default function SuperAdminPlanes() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalForm, setModalForm] = useState(false);
  const [planEditando, setPlanEditando] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: 0,
    cantidadMaximaUsuarios: 10,
    cantidadMaximaVentanillas: 5,
    cantidadMaximaTramites: 15,
    nivelSoporte: 'Estándar',
    frecuenciaBackups: 'Semanal',
    actualizacionesIncluidas: true,
    estado: 'activo'
  });

  const fetchPlanes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/planes');
      setPlanes(res.data || []);
    } catch (err) {
      console.error('Error al cargar planes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  const abrirModalCrear = () => {
    setPlanEditando(null);
    setForm({
      nombre: '',
      descripcion: '',
      precio: 0,
      cantidadMaximaUsuarios: 10,
      cantidadMaximaVentanillas: 5,
      cantidadMaximaTramites: 15,
      nivelSoporte: 'Estándar',
      frecuenciaBackups: 'Semanal',
      actualizacionesIncluidas: true,
      estado: 'activo'
    });
    setErrorModal(null);
    setModalForm(true);
  };

  const abrirModalEditar = (plan) => {
    setPlanEditando(plan);
    setForm({
      nombre: plan.nombre || '',
      descripcion: plan.descripcion || '',
      precio: plan.precio || 0,
      cantidadMaximaUsuarios: plan.cantidadMaximaUsuarios || 10,
      cantidadMaximaVentanillas: plan.cantidadMaximaVentanillas || 5,
      cantidadMaximaTramites: plan.cantidadMaximaTramites || 15,
      nivelSoporte: plan.nivelSoporte || 'Estándar',
      frecuenciaBackups: plan.frecuenciaBackups || 'Semanal',
      actualizacionesIncluidas: plan.actualizacionesIncluidas !== undefined ? plan.actualizacionesIncluidas : true,
      estado: plan.estado || 'activo'
    });
    setErrorModal(null);
    setModalForm(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal(null);
    try {
      if (planEditando) {
        await api.put(`/super-admin/planes/${planEditando._id}`, form);
      } else {
        await api.post('/super-admin/planes', form);
      }
      setModalForm(false);
      fetchPlanes();
    } catch (err) {
      setErrorModal(err.response?.data?.message || 'Error al guardar el plan');
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = async (planId, nuevoEstado) => {
    try {
      await api.patch(`/super-admin/planes/${planId}/estado`, { estado: nuevoEstado });
      fetchPlanes();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado del plan');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Gestión de Planes de Suscripción
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Configuración de paquetes SaaS, tarifas, límites de módulos y cuotas de uso institucional.
          </p>
        </div>

        <button
          onClick={abrirModalCrear}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.4rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none',
            boxShadow: '0 6px 20px rgba(124,58,237,0.35)', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Nuevo Plan SaaS
        </button>
      </div>

      {/* ── Tabla de Planes SaaS ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Cargando planes...</div>
      ) : planes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <Package size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No hay planes creados</h3>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Nombre del Plan</th>
                <th>Precio Mensual</th>
                <th>Usuarios Máx.</th>
                <th>Ventanillas Máx.</th>
                <th>Trámites Máx.</th>
                <th>Soporte / Backups</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planes.map((plan) => (
                <tr key={plan._id}>
                  {/* Nombre */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a78bfa', flexShrink: 0
                      }}>
                        <Package size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: 'white' }}>{plan.nombre}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                          {plan.descripcion || 'Sin descripción'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Precio */}
                  <td style={{ padding: '1rem', fontWeight: 800, color: 'white', fontSize: '0.92rem' }}>
                    ${plan.precio?.toLocaleString('es-CO')} <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ mes</span>
                  </td>

                  {/* Usuarios */}
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'white' }}>
                    {plan.cantidadMaximaUsuarios}
                  </td>

                  {/* Ventanillas */}
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'white' }}>
                    {plan.cantidadMaximaVentanillas}
                  </td>

                  {/* Trámites */}
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'white' }}>
                    {plan.cantidadMaximaTramites}
                  </td>

                  {/* Soporte y Backups */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'white' }}>{plan.nivelSoporte}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>Backup: {plan.frecuenciaBackups}</div>
                  </td>

                  {/* Estado */}
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '20px',
                      background: plan.estado === 'activo' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: plan.estado === 'activo' ? '#4ade80' : '#f87171', textTransform: 'capitalize'
                    }}>
                      {plan.estado}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        onClick={() => abrirModalEditar(plan)}
                        style={{
                          padding: '0.45rem 0.85rem', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                          color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                      >
                        <Edit2 size={13} /> Editar
                      </button>

                      <button
                        onClick={() => handleCambiarEstado(plan._id, plan.estado === 'activo' ? 'inactivo' : 'activo')}
                        style={{
                          padding: '0.45rem 0.85rem', borderRadius: '8px',
                          background: plan.estado === 'activo' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                          border: `1px solid ${plan.estado === 'activo' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                          color: plan.estado === 'activo' ? '#f87171' : '#4ade80', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                        }}
                      >
                        {plan.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ MODAL CREAR/EDITAR PLAN ══════════════ */}
      {modalForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={(e) => { if (e.target === e.currentTarget) setModalForm(false); }}>
          
          <div style={{
            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
            background: '#121022', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)', padding: '2rem'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white', margin: 0 }}>
                {planEditando ? `Editar Plan: ${planEditando.nombre}` : 'Crear Nuevo Plan SaaS'}
              </h2>
              <button onClick={() => setModalForm(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
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

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    NOMBRE DEL PLAN *
                  </label>
                  <input
                    type="text" placeholder="Ej. Plan Empresarial" required
                    value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    PRECIO MENSUAL ($) *
                  </label>
                  <input
                    type="number" min={0} required
                    value={form.precio} onChange={e => setForm({ ...form, precio: Number(e.target.value) })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    DESCRIPCIÓN
                  </label>
                  <input
                    type="text" placeholder="Orientado a gobernaciones y grandes entidades..."
                    value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    style={{
                      width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Cuotas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    MÁX. USUARIOS
                  </label>
                  <input
                    type="number" min={1} required
                    value={form.cantidadMaximaUsuarios} onChange={e => setForm({ ...form, cantidadMaximaUsuarios: Number(e.target.value) })}
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
                    value={form.cantidadMaximaVentanillas} onChange={e => setForm({ ...form, cantidadMaximaVentanillas: Number(e.target.value) })}
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
                    value={form.cantidadMaximaTramites} onChange={e => setForm({ ...form, cantidadMaximaTramites: Number(e.target.value) })}
                    style={{
                      width: '100%', height: '40px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Parámetros extras */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    NIVEL DE SOPORTE
                  </label>
                  <select
                    value={form.nivelSoporte} onChange={e => setForm({ ...form, nivelSoporte: e.target.value })}
                    style={{
                      width: '100%', height: '40px', padding: '0 0.8rem', background: '#1a1830',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <option value="Básico">Básico</option>
                    <option value="Estándar">Estándar</option>
                    <option value="Premium">Premium</option>
                    <option value="24/7 Dedicado">24/7 Dedicado</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                    FRECUENCIA DE BACKUPS
                  </label>
                  <select
                    value={form.frecuenciaBackups} onChange={e => setForm({ ...form, frecuenciaBackups: e.target.value })}
                    style={{
                      width: '100%', height: '40px', padding: '0 0.8rem', background: '#1a1830',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                    }}
                  >
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button" onClick={() => setModalForm(false)}
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
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 800, cursor: procesando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {procesando ? 'Guardando...' : planEditando ? 'Actualizar Plan' : 'Crear Plan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
