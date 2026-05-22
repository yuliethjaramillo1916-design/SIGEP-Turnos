import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Check, X, FileText, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import api from '../services/api';

const Tramites = () => {
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tiempoEstimado: 15,
    estado: true
  });

  useEffect(() => {
    fetchTramites();
  }, []);

  const fetchTramites = async () => {
    try {
      const res = await api.get('/tramites');
      setTramites(res.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trámites:', error);
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedId(null);
    setFormData({
      nombre: '',
      descripcion: '',
      tiempoEstimado: 15,
      estado: true
    });
    setShowModal(true);
  };

  const openEditModal = (tramite) => {
    setEditMode(true);
    setSelectedId(tramite._id);
    setFormData({
      nombre: tramite.nombre,
      descripcion: tramite.descripcion || '',
      tiempoEstimado: tramite.tiempoEstimado || 15,
      estado: tramite.estado ?? true
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este trámite? Esto puede afectar a los turnos asociados.')) return;
    try {
      await api.delete(`/tramites/${id}`);
      fetchTramites();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar el trámite');
    }
  };

  const toggleEstado = async (tramite) => {
    try {
      await api.put(`/tramites/${tramite._id}`, { estado: !tramite.estado });
      fetchTramites();
    } catch (error) {
      alert('Error al cambiar el estado del trámite');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return alert('El nombre del trámite es obligatorio');
    
    try {
      if (editMode) {
        await api.put(`/tramites/${selectedId}`, formData);
      } else {
        await api.post('/tramites', formData);
      }
      setShowModal(false);
      fetchTramites();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar el trámite');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)', fontWeight: 'bold' }}>
        <span>Cargando trámites de SIGEP-Turnos...</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Gestión de Trámites
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Crea, edita y configura los tipos de atención disponibles para la emisión de turnos.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ borderRadius: '10px', height: '42px', fontWeight: 700 }}>
          <Plus size={18} /> Nuevo Trámite
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        background: 'rgba(37, 99, 235, 0.08)',
        border: '1px solid rgba(37, 99, 235, 0.2)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
          <strong>¿Cómo se generan los códigos?</strong> El sistema toma automáticamente la primera letra del trámite en mayúsculas como prefijo para los tickets de turnos diarios (Ejemplo: el trámite <strong>C</strong>aja generará turnos como <strong>C-001</strong>, <strong>C-002</strong>, etc.).
        </div>
      </div>

      {/* Premium Table */}
      <div className="table-container" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Prefijo</th>
              <th>Nombre del Trámite</th>
              <th>Descripción</th>
              <th style={{ width: '180px' }}>Tiempo Estimado</th>
              <th style={{ width: '130px' }}>Estado</th>
              <th style={{ textAlign: 'right', width: '120px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tramites.length > 0 ? (
              tramites.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div style={{
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--primary)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(37, 99, 235, 0.15)'
                    }}>
                      {t.nombre ? t.nombre.trim().charAt(0).toUpperCase() : 'T'}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{t.nombre}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.descripcion}>
                    {t.descripcion || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>Sin descripción</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <Clock size={14} style={{ color: 'var(--secondary)' }} />
                      <span>{t.tiempoEstimado || 15} minutos</span>
                    </div>
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleEstado(t)}
                      style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                      title={t.estado ? 'Desactivar Trámite' : 'Activar Trámite'}
                    >
                      <span className={`badge badge-${t.estado ? 'success' : 'danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {t.estado ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {t.estado ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', color: 'var(--primary)', borderColor: '#dbeafe' }} onClick={() => openEditModal(t)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: '#fee2e2' }} onClick={() => handleDelete(t._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <FileText size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem', display: 'block', margin: '0 auto' }} />
                  <span>No hay trámites registrados en el sistema.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Create & Edit */}
      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {editMode ? 'Editar Trámite' : 'Registrar Nuevo Trámite'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600 }}>Nombre del Trámite</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Caja, Atención al Cliente, Asesoría"
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600 }}>Descripción</label>
                <textarea 
                  rows="3" 
                  placeholder="Detalles sobre este tipo de trámite..."
                  value={formData.descripcion} 
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  style={{ marginTop: '0.35rem', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tiempo Estimado de Atención</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formData.tiempoEstimado} min</span>
                </label>
                <input 
                  type="range" 
                  min="2" 
                  max="60" 
                  step="1"
                  value={formData.tiempoEstimado} 
                  onChange={(e) => setFormData({...formData, tiempoEstimado: parseInt(e.target.value)})}
                  style={{ marginTop: '0.5rem', height: '6px', background: '#e2e8f0', borderRadius: '4px', outline: 'none', padding: 0 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>2 min</span>
                  <span>15 min</span>
                  <span>30 min</span>
                  <span>45 min</span>
                  <span>60 min</span>
                </div>
              </div>

              {editMode && (
                <div className="checkbox-group" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <input 
                    type="checkbox" 
                    id="estado_chk"
                    checked={formData.estado} 
                    onChange={(e) => setFormData({...formData, estado: e.target.checked})}
                  />
                  <label htmlFor="estado_chk" style={{ marginBottom: 0, fontWeight: 600, cursor: 'pointer' }}>Trámite Habilitado (Permitir emitir turnos)</label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }}>
                  {editMode ? 'Guardar Cambios' : 'Registrar Trámite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tramites;
