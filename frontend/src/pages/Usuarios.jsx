import { useState, useEffect } from 'react';
import { Plus, UserPlus, Edit, Trash2, ShieldCheck, Mail, Info, RefreshCw, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de modal
  const [showModal, setShowModal] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
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
    setShowPwd(false);
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

  // Avatar: gradiente basado en la primera letra del nombre
  const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #7c3aed, #a855f7)',
    'linear-gradient(135deg, #059669, #10b981)',
    'linear-gradient(135deg, #ea580c, #f97316)',
    'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    'linear-gradient(135deg, #db2777, #ec4899)',
    'linear-gradient(135deg, #7c3aed, #6366f1)',
    'linear-gradient(135deg, #0d9488, #14b8a6)',
    'linear-gradient(135deg, #b45309, #f59e0b)',
  ];
  const getAvatarGradient = (nombre) => {
    const idx = (nombre?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
  };

  // Paleta de colores por ventanilla
  const VENTANILLA_PALETA = [
    { bg: 'rgba(124,58,237,0.25)',  border: 'rgba(124,58,237,0.45)',  color: '#c4b5fd' }, // morado
    { bg: 'rgba(5,150,105,0.20)',   border: 'rgba(5,150,105,0.40)',   color: '#34d399' }, // verde
    { bg: 'rgba(234,88,12,0.20)',   border: 'rgba(234,88,12,0.40)',   color: '#fb923c' }, // naranja
    { bg: 'rgba(14,165,233,0.20)',  border: 'rgba(14,165,233,0.40)',  color: '#38bdf8' }, // azul
    { bg: 'rgba(236,72,153,0.20)',  border: 'rgba(236,72,153,0.40)',  color: '#f472b6' }, // rosa
    { bg: 'rgba(250,204,21,0.18)',  border: 'rgba(250,204,21,0.38)',  color: '#fde047' }, // amarillo
    { bg: 'rgba(99,102,241,0.22)',  border: 'rgba(99,102,241,0.42)',  color: '#a5b4fc' }, // índigo
    { bg: 'rgba(20,184,166,0.20)',  border: 'rgba(20,184,166,0.40)',  color: '#2dd4bf' }, // teal
  ];

  const getVentanillaStyle = (numero) => {
    // Extrae el índice numérico de la ventanilla (ej: "V-001" → 1, "3" → 3)
    const num = parseInt(String(numero).replace(/\D/g, '')) || 0;
    const paleta = VENTANILLA_PALETA[num % VENTANILLA_PALETA.length];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.22rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
      background: paleta.bg,
      color: paleta.color,
      border: `1px solid ${paleta.border}`,
      whiteSpace: 'nowrap',
    };
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
      <div className="table-container" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
        <table style={{ fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th style={{ whiteSpace: 'nowrap' }}>Nombre</th>
              <th style={{ whiteSpace: 'nowrap' }}>Correo</th>
              <th style={{ whiteSpace: 'nowrap' }}>Rol</th>
              <th style={{ whiteSpace: 'nowrap' }}>Ventanilla</th>
              <th style={{ whiteSpace: 'nowrap' }}>Estado</th>
              <th style={{ whiteSpace: 'nowrap' }}>Registro</th>
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u._id}>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '30px', height: '30px',
                      borderRadius: '50%',
                      background: getAvatarGradient(u.nombre),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0,
                    }}>
                      {u.nombre.charAt(0)}{u.apellido.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{u.nombre} {u.apellido}</span>
                  </div>
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                    <Mail size={12} />
                    <span style={{ fontSize: '0.8rem' }}>{u.email}</span>
                  </div>
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span className={`badge ${
                    u.rol === 'ADMINISTRADOR' ? 'badge-danger' :
                    u.rol === 'OPERADOR' ? 'badge-primary' : 'badge-success'
                  }`} style={{ fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {u.rol}
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {u.rol === 'OPERADOR' ? (
                    u.ventanilla ? (
                      <span style={getVentanillaStyle(u.ventanilla.numero)}>
                        V. {u.ventanilla.numero}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '0.78rem' }}>Sin asignar</span>
                    )
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <button
                    onClick={() => toggleEstado(u)}
                    style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', background: 'none', border: 'none' }}
                    title={u.estado ? 'Desactivar' : 'Activar'}
                  >
                    <span className={`badge badge-${u.estado ? 'success' : 'danger'}`} style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                      {u.estado ? <UserCheck size={11} /> : <UserX size={11} />}
                      {u.estado ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </button>
                </td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                  {new Date(u.createdAt).toLocaleDateString('es-ES')}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)' }} onClick={() => openEditModal(u)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }} onClick={() => handleDelete(u._id)}>
                      <Trash2 size={14} />
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
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)', alignItems: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem' }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
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
                <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required={!editMode}
                    value={formData.password}
                    placeholder={editMode ? '••••••••' : ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ borderRadius: '8px', paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.4)', padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                    title={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                  style={{ marginTop: '0.35rem', borderRadius: '8px', height: '40px', colorScheme: 'dark', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1.5px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="ADMINISTRADOR" style={{ background: '#1e1c35' }}>ADMINISTRADOR (Acceso Total)</option>
                  <option value="OPERADOR" style={{ background: '#1e1c35' }}>OPERADOR (Consola de Atención)</option>
                  <option value="VIGILANTE" style={{ background: '#1e1c35' }}>VIGILANTE (Generador de Tickets)</option>
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
                      backgroundColor: '#1e1c35',
                      border: '1px solid rgba(124,58,237,0.25)',
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
                                backgroundColor: isSelected ? 'rgba(124,58,237,0.2)' : 'transparent',
                                color: isSelected ? '#c4b5fd' : 'var(--text-main)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s',
                                opacity: isInactive ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
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

              <div className="checkbox-group" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
