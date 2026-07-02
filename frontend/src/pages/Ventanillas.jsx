import { useState, useEffect } from 'react';
import { Monitor, Plus, Edit, Trash2, CheckCircle, XCircle, Hash, Search } from 'lucide-react';
import api from '../services/api';

const Ventanillas = () => {
  const [ventanillas, setVentanillas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    numero: '',
    nombre: '',
    estado: 'activa'
  });

  useEffect(() => {
    fetchVentanillas();
  }, []);

  const fetchVentanillas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ventanillas');
      setVentanillas(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar ventanillas:', err);
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedId(null);
    setFormData({
      numero: '',
      nombre: '',
      estado: 'activa'
    });
    setShowModal(true);
  };

  const openEditModal = (v) => {
    setEditMode(true);
    setSelectedId(v._id);
    setFormData({
      numero: v.numero,
      nombre: v.nombre || '',
      estado: v.estado || 'activa'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta ventanilla? Esta acción no se puede deshacer y desvinculará a los operadores asignados.')) return;
    try {
      await api.delete(`/ventanillas/${id}`);
      fetchVentanillas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar ventanilla');
    }
  };

  const toggleEstado = async (v) => {
    try {
      const newEstado = v.estado === 'activa' ? 'inactiva' : 'activa';
      await api.put(`/ventanillas/${v._id}`, { estado: newEstado });
      fetchVentanillas();
    } catch (err) {
      alert('Error al cambiar el estado de la ventanilla');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.numero.trim()) return alert('El número de ventanilla es obligatorio');
    try {
      if (editMode) {
        await api.put(`/ventanillas/${selectedId}`, formData);
      } else {
        await api.post('/ventanillas', formData);
      }
      setShowModal(false);
      fetchVentanillas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar la ventanilla');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)', fontWeight: 'bold' }}>
        <span>Cargando ventanillas de SIGEP-Turnos...</span>
      </div>
    );
  }

  // Lista filtrada (cliente)
  const filteredVentanillas = ventanillas.filter((v) => {
    const matchesText =
      v.numero.toLowerCase().includes(searchText.toLowerCase()) ||
      (v.nombre && v.nombre.toLowerCase().includes(searchText.toLowerCase())) ||
      (v.operador &&
        (`${v.operador.nombre} ${v.operador.apellido}`)
          .toLowerCase()
          .includes(searchText.toLowerCase()));

    const matchesEstado =
      filterEstado === 'todos' ||
      v.estado === filterEstado;

    return matchesText && matchesEstado;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Gestión de Ventanillas
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Crea y gestiona las ventanillas físicas del sistema. Los operadores se asignan a estas ventanillas para la llamada de turnos.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ borderRadius: '10px', height: '42px', fontWeight: 700 }}>
          <Plus size={18} /> Nueva Ventanilla
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.75rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Búsqueda de texto */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Buscar por número, nombre u operador…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.25rem',
              paddingRight: '0.75rem',
              height: '40px',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: 'var(--text-main)',
              background: 'var(--bg-card)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filtro de estado */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { value: 'todos',    label: 'Todas' },
            { value: 'activa',   label: '● Activas' },
            { value: 'inactiva', label: '● Inactivas' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterEstado(value)}
              style={{
                height: '40px',
                padding: '0 1rem',
                borderRadius: '10px',
                border: filterEstado === value
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border)',
                background: filterEstado === value ? 'var(--primary)' : 'var(--bg-card)',
                color: filterEstado === value ? 'white' : 'var(--text-muted)',
                fontWeight: filterEstado === value ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.18s',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contador de resultados */}
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filteredVentanillas.length} de {ventanillas.length} ventanilla{ventanillas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid de Ventanillas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {ventanillas.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <Monitor size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No hay ventanillas registradas</h3>
            <p style={{ fontSize: '0.9rem' }}>Crea tu primera ventanilla para empezar a asignarle operadores y turnos.</p>
          </div>
        )}

        {ventanillas.length > 0 && filteredVentanillas.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            <Search size={40} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>Sin resultados</h3>
            <p style={{ fontSize: '0.875rem' }}>Ninguna ventanilla coincide con los filtros aplicados. Prueba con otros términos.</p>
            <button
              onClick={() => { setSearchText(''); setFilterEstado('todos'); }}
              style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
        
        {filteredVentanillas.map((v) => (
          <div key={v._id} className="card" style={{
            borderLeft: `4px solid ${v.estado === 'activa' ? '#34d399' : 'rgba(255,255,255,0.12)'}`,
            position: 'relative', transition: 'box-shadow 0.2s',
          }}>
            {/* Estado badge */}
            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
              <span className={`badge badge-${v.estado === 'activa' ? 'success' : 'danger'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {v.estado === 'activa' ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>

            {/* Número y Nombre */}
            <div style={{
              background: v.estado === 'activa' ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
              borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              border: `1px solid ${v.estado === 'activa' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{
                background: v.estado === 'activa' ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.12)',
                color: 'white', fontWeight: 800, fontSize: '1.25rem',
                width: '48px', height: '48px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: v.estado === 'activa' ? '0 4px 12px rgba(5,150,105,0.35)' : 'none',
              }}>
                {v.numero}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>Ventanilla {v.numero}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                  {v.nombre || 'Sin descripción'}
                </div>
              </div>
            </div>

            {/* Operador asignado */}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Operador:</span>
              {v.operador ? (
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>👤 {v.operador.nombre} {v.operador.apellido}</span>
              ) : (
                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Sin asignar (Disponible)</span>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => toggleEstado(v)}
              >
                {v.estado === 'activa' ? (
                  <><XCircle size={14} /> Desactivar</>
                ) : (
                  <><CheckCircle size={14} /> Activar</>
                )}
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.6rem', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)' }}
                onClick={() => openEditModal(v)}
              >
                <Edit size={16} />
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.6rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                onClick={() => handleDelete(v._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ventanilla */}
      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ maxWidth: '440px', borderRadius: '20px', background: '#1a1830', padding: '2rem', width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editMode ? 'Editar Ventanilla' : 'Nueva Ventanilla'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    <Hash size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    Número
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    style={{ marginTop: '0.375rem', borderRadius: '8px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Nombre / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Caja Principal, Atención Rápida"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    style={{ marginTop: '0.375rem', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  style={{ marginTop: '0.375rem', borderRadius: '8px', height: '40px', colorScheme: 'dark' }}
                >
                  <option value="activa" style={{ background: '#1e1c35' }}>Activa — Disponible para uso</option>
                  <option value="inactiva" style={{ background: '#1e1c35' }}>Inactiva — No disponible</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }}>
                  {editMode ? 'Guardar Cambios' : 'Crear Ventanilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventanillas;
