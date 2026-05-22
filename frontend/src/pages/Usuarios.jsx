import { useState, useEffect } from 'react';
import { Plus, UserPlus, Edit, Trash2, ShieldCheck, Mail, Info, RefreshCw, UserCheck, UserX } from 'lucide-react';
import api from '../services/api';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de modal
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'OPERADOR',
    estado: true,
    ventanilla: ''
  });

  const [ventanillas, setVentanillas] = useState([]);
  const [ventanillaSearch, setVentanillaSearch] = useState('');
  const [isOpenVentanilla, setIsOpenVentanilla] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchUsuarios(), fetchVentanillas()]);
    setLoading(false);
  };

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchVentanillas = async () => {
    try {
      const res = await api.get('/ventanillas');
      setVentanillas(res.data || []);
    } catch (error) {
      console.error('Error fetching ventanillas:', error);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedId(null);
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'OPERADOR',
      estado: true,
      ventanilla: ''
    });
    setVentanillaSearch('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditMode(true);
    setSelectedId(user._id);
    const vId = user.ventanilla?._id || (typeof user.ventanilla === 'string' ? user.ventanilla : '');
    const vLabel = user.ventanilla && typeof user.ventanilla === 'object'
      ? `Ventanilla ${user.ventanilla.numero} - ${user.ventanilla.nombre || 'General'}`
      : '';

    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      password: '', // Vacía para no forzar cambio
      rol: user.rol,
      estado: user.estado,
      ventanilla: vId
    });

    if (vLabel) {
      setVentanillaSearch(vLabel);
    } else if (vId) {
      const vObj = ventanillas.find(v => v._id === vId);
      setVentanillaSearch(vObj ? `Ventanilla ${vObj.numero} - ${vObj.nombre || 'General'}` : '');
    } else {
      setVentanillaSearch('');
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este usuario de forma permanente?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      fetchUsuarios();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const toggleEstado = async (user) => {
    try {
      await api.put(`/usuarios/${user._id}`, { estado: !user.estado });
      fetchUsuarios();
    } catch (error) {
      alert('Error al cambiar el estado del usuario');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.rol !== 'OPERADOR' || !payload.ventanilla) {
        payload.ventanilla = null;
      }

      if (editMode) {
        // Enviar payload. Si password está vacío, no se actualiza
        if (payload.password.trim() === '') {
          delete payload.password;
        }
        await api.put(`/usuarios/${selectedId}`, payload);
      } else {
        if (payload.password.trim() === '') {
          return alert('La contraseña es obligatoria para nuevos usuarios');
        }
        await api.post('/usuarios', payload);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error en la operación');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)', fontWeight: 'bold' }}>
        <span>Cargando usuarios de SIGEP-Turnos...</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Gestión de Usuarios
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Registra, edita y administra los permisos y roles de los operadores del sistema.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ borderRadius: '10px', height: '42px', fontWeight: 700 }}>
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Tabla Premium */}
      <div className="table-container" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <table>
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Rol Asignado</th>
              <th>Ventanilla</th>
              <th>Estado</th>
              <th>Fecha de Registro</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                    </div>
                    <strong>{u.nombre} {u.apellido}</strong>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                    <Mail size={14} />
                    <span>{u.email}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${
                    u.rol === 'ADMINISTRADOR' ? 'badge-danger' : 
                    u.rol === 'OPERADOR' ? 'badge-primary' : 'badge-success'
                  }`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  {u.rol === 'OPERADOR' ? (
                    u.ventanilla ? (
                      <span className="badge" style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        Ventanilla {u.ventanilla.numero}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Sin asignar</span>
                    )
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>
                <td>
                  <button 
                    onClick={() => toggleEstado(u)}
                    style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', background: 'none', border: 'none' }}
                    title={u.estado ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                  >
                    <span className={`badge badge-${u.estado ? 'success' : 'danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {u.estado ? <UserCheck size={12} /> : <UserX size={12} />}
                      {u.estado ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </button>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString('es-ES')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', color: 'var(--primary)', borderColor: '#dbeafe' }} onClick={() => openEditModal(u)}>
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', borderColor: '#fee2e2' }} onClick={() => handleDelete(u._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear y Editar */}
      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editMode ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Nombre</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Apellido</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.apellido} 
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                    style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600 }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600 }}>
                  Contraseña {editMode && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(dejar en blanco para no modificar)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editMode}
                  value={formData.password} 
                  placeholder={editMode ? "••••••••" : ""}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ marginTop: '0.35rem', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 600 }}>Rol del Usuario</label>
                <select 
                  required 
                  value={formData.rol} 
                  onChange={(e) => {
                    const newRol = e.target.value;
                    setFormData({
                      ...formData, 
                      rol: newRol,
                      ventanilla: newRol === 'OPERADOR' ? formData.ventanilla : ''
                    });
                    if (newRol !== 'OPERADOR') {
                      setVentanillaSearch('');
                    }
                  }}
                  style={{ marginTop: '0.35rem', borderRadius: '8px', height: '40px' }}
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total)</option>
                  <option value="OPERADOR">OPERADOR (Consola de Atención)</option>
                  <option value="VIGILANTE">VIGILANTE (Generador de Tickets)</option>
                </select>
              </div>

              {formData.rol === 'OPERADOR' && (
                <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <label style={{ fontWeight: 600 }}>Ventanilla Asignada</label>
                  <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                    <input
                      type="text"
                      placeholder="Escriba para buscar ventanilla..."
                      value={ventanillaSearch}
                      onFocus={() => setIsOpenVentanilla(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setIsOpenVentanilla(false);
                          if (!formData.ventanilla) {
                            setVentanillaSearch('');
                          } else {
                            const vObj = ventanillas.find(v => v._id === formData.ventanilla);
                            if (vObj) {
                              setVentanillaSearch(`Ventanilla ${vObj.numero} - ${vObj.nombre || 'General'}`);
                            }
                          }
                        }, 250);
                      }}
                      onChange={(e) => {
                        setVentanillaSearch(e.target.value);
                        setIsOpenVentanilla(true);
                        if (formData.ventanilla) {
                          setFormData(prev => ({ ...prev, ventanilla: '' }));
                        }
                      }}
                      style={{ borderRadius: '8px', paddingRight: '2.5rem' }}
                    />
                    {formData.ventanilla && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, ventanilla: '' }));
                          setVentanillaSearch('');
                        }}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>

                  {isOpenVentanilla && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 50,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '0.25rem'
                    }}>
                      {(() => {
                        const filtered = ventanillas.filter(v => {
                          const searchLower = ventanillaSearch.toLowerCase();
                          return (
                            v.numero.toLowerCase().includes(searchLower) ||
                            (v.nombre && v.nombre.toLowerCase().includes(searchLower))
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                              No se encontraron ventanillas
                            </div>
                          );
                        }

                        return filtered.map(v => {
                          const isSelected = formData.ventanilla === v._id;
                          const isOccupiedByOther = v.operador && String(v.operador._id || v.operador) !== String(selectedId);
                          const isInactive = v.estado === 'inactiva';

                          return (
                            <div
                              key={v._id}
                              onMouseDown={() => {
                                setFormData(prev => ({ ...prev, ventanilla: v._id }));
                                setVentanillaSearch(`Ventanilla ${v.numero} - ${v.nombre || 'General'}`);
                                setIsOpenVentanilla(false);
                              }}
                              style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s',
                                opacity: isInactive ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 600 }}>Ventanilla {v.numero}</span>
                                <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  {v.nombre ? `(${v.nombre})` : ''}
                                </span>
                                {isInactive && (
                                  <span style={{ marginLeft: '0.5rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    (Inactiva)
                                  </span>
                                )}
                              </div>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: isOccupiedByOther ? 'var(--danger)' : 'var(--text-muted)',
                                fontWeight: isOccupiedByOther ? 600 : 400
                              }}>
                                {isOccupiedByOther 
                                  ? `Ocupada por ${v.operador.nombre || ''} ${v.operador.apellido || ''}`
                                  : 'Disponible'
                                }
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="checkbox-group" style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="estado_chk"
                  checked={formData.estado} 
                  onChange={(e) => setFormData({...formData, estado: e.target.checked})}
                  style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="estado_chk" style={{ marginBottom: 0, fontWeight: 600, cursor: 'pointer' }}>Cuenta Activa (Permitir Ingreso)</label>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }}>
                  {editMode ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
