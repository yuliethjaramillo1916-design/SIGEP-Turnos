import { useState, useEffect } from 'react';
import {
  Save, Settings, Monitor, Plus, Edit, Trash2,
  Building2, Clock, Hash, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, Layout
} from 'lucide-react';
import api from '../services/api';

const TAB_CONFIG = 'config';
const TAB_VENTANILLAS = 'ventanillas';

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState(TAB_CONFIG);

  // --- Configuración General ---
  const [config, setConfig] = useState({
    nombre_empresa: 'SIGEP - Gestión de Turnos',
    horario_atencion: '08:00 - 18:00',
    limite_turnos_dia: 200,
    logo: '',
    activo: true,
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // --- Ventanillas ---
  const [ventanillas, setVentanillas] = useState([]);
  const [ventLoading, setVentLoading] = useState(true);
  const [showVentModal, setShowVentModal] = useState(false);
  const [ventEditMode, setVentEditMode] = useState(false);
  const [ventSelectedId, setVentSelectedId] = useState(null);
  const [ventForm, setVentForm] = useState({ numero: '', nombre: '', estado: 'activa' });
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetchConfig();
    fetchVentanillas();
    fetchUsuarios();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/configuracion');
      if (res.data) setConfig(res.data);
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchVentanillas = async () => {
    try {
      const res = await api.get('/ventanillas');
      setVentanillas(res.data || []);
    } catch (err) {
      console.error('Error al cargar ventanillas:', err);
    } finally {
      setVentLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios((res.data || []).filter(u => u.rol === 'OPERADOR' && u.estado));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigSuccess(false);
    try {
      await api.post('/configuracion', config);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err) {
      alert('Error al guardar la configuración: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfigSaving(false);
    }
  };

  const openCreateVent = () => {
    setVentEditMode(false);
    setVentSelectedId(null);
    setVentForm({ numero: '', nombre: '', estado: 'activa' });
    setShowVentModal(true);
  };

  const openEditVent = (v) => {
    setVentEditMode(true);
    setVentSelectedId(v._id);
    setVentForm({ numero: v.numero, nombre: v.nombre || '', estado: v.estado || 'activa' });
    setShowVentModal(true);
  };

  const handleDeleteVent = async (id) => {
    if (!confirm('¿Eliminar esta ventanilla? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/ventanillas/${id}`);
      fetchVentanillas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar ventanilla');
    }
  };

  const handleToggleVentEstado = async (v) => {
    try {
      const newEstado = v.estado === 'activa' ? 'inactiva' : 'activa';
      await api.put(`/ventanillas/${v._id}`, { estado: newEstado });
      fetchVentanillas();
    } catch (err) {
      alert('Error al cambiar el estado de la ventanilla');
    }
  };

  const handleVentSubmit = async (e) => {
    e.preventDefault();
    if (!ventForm.numero.trim()) return alert('El número de ventanilla es obligatorio');
    try {
      if (ventEditMode) {
        await api.put(`/ventanillas/${ventSelectedId}`, ventForm);
      } else {
        await api.post('/ventanillas', ventForm);
      }
      setShowVentModal(false);
      fetchVentanillas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar la ventanilla');
    }
  };

  const tabStyle = (tab) => ({
    padding: '0.65rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    background: activeTab === tab ? 'var(--primary)' : 'transparent',
    color: activeTab === tab ? 'white' : 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Configuración del Sistema
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Administra los parámetros globales del sistema y las ventanillas de atención física.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: '#f1f5f9',
        padding: '0.35rem',
        borderRadius: '10px',
        marginBottom: '2rem',
        width: 'fit-content',
      }}>
        <button style={tabStyle(TAB_CONFIG)} onClick={() => setActiveTab(TAB_CONFIG)}>
          <Settings size={16} /> General
        </button>
        <button style={tabStyle(TAB_VENTANILLAS)} onClick={() => setActiveTab(TAB_VENTANILLAS)}>
          <Monitor size={16} /> Ventanillas
        </button>
      </div>

      {/* ===== TAB: CONFIGURACIÓN GENERAL ===== */}
      {activeTab === TAB_CONFIG && (
        <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card: Identidad */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(37,99,235,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                <Building2 size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Identidad Corporativa</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Datos institucionales del sistema</p>
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Nombre de la Institución / Empresa</label>
              <input
                type="text"
                value={config.nombre_empresa}
                placeholder="Ej: SIGEP - Gestión de Turnos"
                onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
                style={{ marginTop: '0.35rem', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* Card: Operación */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                <Clock size={20} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Parámetros de Operación</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Controla el flujo diario de atención</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Horario de Atención</label>
                <input
                  type="text"
                  value={config.horario_atencion}
                  placeholder="Ej: 08:00 - 18:00"
                  onChange={(e) => setConfig({ ...config, horario_atencion: e.target.value })}
                  style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Límite Turnos/Día</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{config.limite_turnos_dia}</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={config.limite_turnos_dia}
                  onChange={(e) => setConfig({ ...config, limite_turnos_dia: parseInt(e.target.value) || 0 })}
                  style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                />
              </div>
            </div>
          </div>

          {/* Card: Estado del sistema */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                <Layout size={20} style={{ color: 'var(--warning)' }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Estado del Sistema</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Activa o suspende la operación global</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: config.activo ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${config.activo ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '10px',
              padding: '1rem 1.25rem',
            }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>
                  Sistema de Turnos: {config.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                </strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {config.activo
                    ? 'Los usuarios pueden generar y llamar turnos normalmente.'
                    : 'Se ha suspendido la generación de nuevos turnos en el sistema.'}
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, activo: !config.activo })}
                style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {config.activo
                  ? <ToggleRight size={42} style={{ color: 'var(--success)' }} />
                  : <ToggleLeft size={42} style={{ color: 'var(--danger)' }} />
                }
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveConfig}
              disabled={configSaving}
              style={{ fontWeight: 700, borderRadius: '10px', padding: '0.7rem 1.75rem' }}
            >
              {configSaving ? (
                <span>Guardando...</span>
              ) : (
                <><Save size={18} /> Guardar Configuración</>
              )}
            </button>
            {configSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                <CheckCircle size={18} /> ¡Configuración guardada exitosamente!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: VENTANILLAS ===== */}
      {activeTab === TAB_VENTANILLAS && (
        <div>
          {/* Header de ventanillas */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                Ventanillas de Atención
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Crea y gestiona las ventanillas físicas. Los operadores las seleccionan al iniciar su turno.
              </p>
            </div>
            <button className="btn btn-primary" onClick={openCreateVent} style={{ borderRadius: '10px', fontWeight: 700 }}>
              <Plus size={18} /> Nueva Ventanilla
            </button>
          </div>

          {ventLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando ventanillas...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {ventanillas.length === 0 && (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Monitor size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
                  <p>No hay ventanillas registradas. Crea la primera ventanilla para empezar.</p>
                </div>
              )}
              {ventanillas.map((v) => (
                <div key={v._id} className="card" style={{
                  borderLeft: `4px solid ${v.estado === 'activa' ? 'var(--success)' : '#cbd5e1'}`,
                  position: 'relative',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Estado badge */}
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                    <span className={`badge badge-${v.estado === 'activa' ? 'success' : 'danger'}`}>
                      {v.estado === 'activa' ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>

                  {/* Número de ventanilla */}
                  <div style={{
                    background: v.estado === 'activa' ? 'rgba(34,197,94,0.08)' : '#f8fafc',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}>
                    <div style={{
                      background: v.estado === 'activa' ? 'var(--success)' : '#94a3b8',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      width: '48px',
                      height: '48px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {v.numero}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ventanilla {v.numero}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {v.nombre || 'Sin nombre asignado'}
                      </div>
                    </div>
                  </div>

                  {/* Operador asignado */}
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    {v.operador
                      ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>👤 {v.operador.nombre} {v.operador.apellido}</span>
                      : <span style={{ fontStyle: 'italic' }}>Sin operador asignado</span>
                    }
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', justifyContent: 'center' }}
                      onClick={() => handleToggleVentEstado(v)}
                    >
                      {v.estado === 'activa'
                        ? <><XCircle size={14} /> Desactivar</>
                        : <><CheckCircle size={14} /> Activar</>
                      }
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.6rem', color: 'var(--primary)', borderColor: '#dbeafe' }}
                      onClick={() => openEditVent(v)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: '#fee2e2' }}
                      onClick={() => handleDeleteVent(v._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Ventanilla */}
      {showVentModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {ventEditMode ? 'Editar Ventanilla' : 'Nueva Ventanilla'}
              </h2>
              <button onClick={() => setShowVentModal(false)} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>&times;</button>
            </div>
            <form onSubmit={handleVentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>
                    <Hash size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Número
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1"
                    value={ventForm.numero}
                    onChange={(e) => setVentForm({ ...ventForm, numero: e.target.value })}
                    style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Nombre / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Caja Principal, Información"
                    value={ventForm.nombre}
                    onChange={(e) => setVentForm({ ...ventForm, nombre: e.target.value })}
                    style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                  />
                </div>
              </div>

              {ventEditMode && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 600 }}>Estado</label>
                  <select
                    value={ventForm.estado}
                    onChange={(e) => setVentForm({ ...ventForm, estado: e.target.value })}
                    style={{ marginTop: '0.35rem', borderRadius: '8px', height: '40px' }}
                  >
                    <option value="activa">Activa — Disponible para uso</option>
                    <option value="inactiva">Inactiva — No disponible</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowVentModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }}>
                  {ventEditMode ? 'Guardar Cambios' : 'Crear Ventanilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;
