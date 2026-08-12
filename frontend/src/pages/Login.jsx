import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Eye, EyeOff, LogIn, AlertTriangle, X, Shield, Clock, Monitor, 
  Ticket, User, Lock, CalendarCheck, Bell, BarChart3, Users,
  Building2, ChevronDown, Search
} from 'lucide-react';

export default function Login() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [limiteTurnos, setLimiteTurnos] = useState(null);

  // ── Estados para el selector de entidades ──
  const [entidades, setEntidades] = useState([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [busquedaEntidad, setBusquedaEntidad] = useState('');
  
  const dropdownRef = useRef(null);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const isProd = typeof window !== 'undefined' && 
                 window.location.hostname !== 'localhost' && 
                 window.location.hostname !== '127.0.0.1';
  const apiBase = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://localhost:3001/api');

  // ── Cargar límite de turnos (opcional) ──
  useEffect(() => {
    fetch(`${apiBase}/configuracion`)
      .then(r => r.json())
      .then(data => { if (data?.limite_turnos_dia) setLimiteTurnos(data.limite_turnos_dia); })
      .catch(() => {});
  }, [apiBase]);

  // ── Cargar entidades públicas ──
  useEffect(() => {
    const fetchEntidades = async () => {
      setLoadingEntidades(true);
      try {
        const res = await fetch(`${apiBase}/entidades/public`);
        const data = await res.json();
        setEntidades(data || []);
      } catch (err) {
        console.error('Error cargando entidades', err);
      } finally {
        setLoadingEntidades(false);
      }
    };
    
    // Cargar entidades solo cuando el formulario se muestra
    if (showForm) {
      fetchEntidades();
    }
  }, [showForm]);

  // Cierra el dropdown si se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // El login ahora recibe entidadId como primer parámetro
      const entidadId = entidadSeleccionada ? entidadSeleccionada._id : null;
      const user = await login(entidadId, email, password);
      
      if      (user.rol === 'SUPER_ADMIN')   navigate('/super-admin');
      else if (user.rol === 'ADMINISTRADOR') navigate('/');
      else if (user.rol === 'OPERADOR')      navigate('/atencion');
      else if (user.rol === 'VIGILANTE')     navigate('/turnos');
      else                                   navigate('/');
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const entidadesFiltradas = entidades.filter(e => 
    e.nombre.toLowerCase().includes(busquedaEntidad.toLowerCase()) || 
    (e.prefijoCodigo && e.prefijoCodigo.toLowerCase().includes(busquedaEntidad.toLowerCase()))
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Inter','Segoe UI',sans-serif",
      color: 'white',
      overflowX: 'hidden',
    }}>

      {/* ══════════════ NAVBAR ══════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 3rem',
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124,58,237,0.15)',
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
          SIGEP<span style={{ color: '#7c3aed' }}>-Turnos</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          Dashboard
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '0.6rem 1.5rem', borderRadius: '50px', border: 'none',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white', fontWeight: 700, fontSize: '0.875rem',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
          transition: 'all 0.2s',
        }}>
          Iniciar Sesión
        </button>
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        padding: '8rem 3rem 4rem',
        gap: '3rem',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Izquierda */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', padding: '0.35rem 1rem', borderRadius: '50px',
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem',
          }}>
            Innovación en Sector Público
          </div>

          <h1 style={{
            fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', marginBottom: '1.5rem',
          }}>
            Sistema Inteligente<br/>
            de <span style={{ color: '#7c3aed' }}>Gestión</span> de<br/>
            <span style={{ color: '#7c3aed' }}>Turnos</span>
          </h1>

          <p style={{
            fontSize: '1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
            marginBottom: '2.5rem', maxWidth: '440px',
          }}>
            Transformando la experiencia de atención al ciudadano con tecnología innovadora, gestión eficiente de turnos y procesos más ágiles para entidades públicas.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowForm(true)} style={{
              padding: '0.85rem 2rem', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 28px rgba(124,58,237,0.4)',
              transition: 'all 0.2s',
            }}>
              Iniciar Sesión
            </button>
            <button style={{
              padding: '0.85rem 2rem', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.95rem',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              Explorar Demo
            </button>
          </div>
        </div>

        {/* Derecha — stats */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
            padding: '1.5rem 2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <Clock size={18} color="#a78bfa" />
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>Tiempo real</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>Plataforma de administración</div>
              </div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', marginTop: '4px' }}/>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
              padding: '1.25rem',
            }}>
              <Monitor size={20} color="#a78bfa" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>7</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>Ventanillas activas</div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
              padding: '1.25rem',
            }}>
              <Ticket size={20} color="#a78bfa" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{limiteTurnos ?? '∞'}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>Turnos / día</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ MODAL FORMULARIO ══════════════ */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.25s ease',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>

          {/* Card modal */}
          <div style={{
            width: '100%', maxWidth: '750px',
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            display: 'grid', gridTemplateColumns: '1fr 1.3fr',
            overflow: 'hidden',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

            {/* ── Izquierda: Identidad Institucional ── */}
            <div style={{
              background: 'radial-gradient(ellipse at 50% 60%, rgba(124,58,237,0.3) 0%, rgba(10,10,15,0.9) 70%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '3rem 2rem', position: 'relative', overflow: 'hidden', textAlign: 'center'
            }}>
              <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', right: '1.25rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>SIGEP<span style={{ color: '#7c3aed' }}>-Turnos</span></div>
              </div>

              {entidadSeleccionada ? (
                // ── Muestra Entidad Seleccionada ──
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.5s' }}>
                  <div style={{
                    width: '110px', height: '110px', borderRadius: '24px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.5rem', overflow: 'hidden',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(124,58,237,0.15)',
                  }}>
                    {entidadSeleccionada.logo ? (
                      <img src={entidadSeleccionada.logo} alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    ) : (
                      <Building2 size={40} color="#a78bfa" />
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {entidadSeleccionada.nombre}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Plataforma Oficial
                  </div>
                </div>
              ) : (
                // ── Muestra Predeterminada (Global) ──
                <div style={{
                  width: '160px', height: '160px', borderRadius: '22px',
                  background: 'rgba(30,20,50,0.9)', border: '1px solid rgba(124,58,237,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'rotate(-5deg)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.15)',
                }}>
                  <Shield size={45} color="#a78bfa" />
                </div>
              )}
            </div>

            {/* ── Derecha: Formulario ── */}
            <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button onClick={() => setShowForm(false)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={15} />
                </button>
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', marginBottom: '0.3rem', letterSpacing: '-0.03em' }}>
                Iniciar Sesión
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
                Acceso Institucional SIGEP-Turnos
              </p>

              {error && (
                <div style={{
                  background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  color: '#fca5a5', fontSize: '0.82rem',
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* ── SELECTOR DE ENTIDAD (Visible Siempre) ── */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    ENTIDAD INSTITUCIONAL / ACCESO
                  </label>
                  
                  <div 
                    onClick={() => setDropdownAbierto(!dropdownAbierto)}
                    style={{
                      width: '100%', height: '48px',
                      padding: '0 1rem 0 2.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid',
                      borderColor: dropdownAbierto ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: 'white', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <Building2 size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem' }} />
                    <span style={{ color: entidadSeleccionada ? 'white' : '#f472b6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: entidadSeleccionada ? 500 : 700 }}>
                      {loadingEntidades ? 'Cargando entidades...' : 
                       entidadSeleccionada ? entidadSeleccionada.nombre : '👑 Acceso Global / Super Administrador'}
                    </span>
                    <ChevronDown size={15} color="rgba(255,255,255,0.3)" style={{ transform: dropdownAbierto ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
                  </div>

                    {/* Menú desplegable */}
                    {dropdownAbierto && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                        background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', zIndex: 10, padding: '0.5rem',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.15s ease'
                      }}>
                        {/* Buscador interno */}
                        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                          <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                          <input 
                            type="text" 
                            placeholder="Buscar entidad..." 
                            value={busquedaEntidad}
                            onChange={(e) => setBusquedaEntidad(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%', height: '36px', paddingLeft: '2.25rem',
                              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '8px', color: 'white', fontSize: '0.85rem', outline: 'none'
                            }}
                          />
                        </div>
                        
                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                          {/* Opción Super Admin */}
                          <div
                            onClick={() => { setEntidadSeleccionada(null); setDropdownAbierto(false); }}
                            style={{
                              padding: '0.65rem 0.75rem', borderRadius: '8px',
                              cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              background: !entidadSeleccionada ? 'rgba(236,72,153,0.15)' : 'transparent',
                              color: !entidadSeleccionada ? '#f472b6' : 'rgba(255,255,255,0.7)',
                              borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.25rem'
                            }}
                          >
                            <Shield size={16} color={!entidadSeleccionada ? '#f472b6' : 'rgba(255,255,255,0.4)'} />
                            <span>Acceso Global / Super Administrador</span>
                          </div>

                          {entidadesFiltradas.length === 0 ? (
                            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                              No se encontraron entidades
                            </div>
                          ) : (
                            entidadesFiltradas.map(ent => (
                              <div 
                                key={ent._id}
                                onClick={() => { setEntidadSeleccionada(ent); setDropdownAbierto(false); }}
                                style={{
                                  padding: '0.65rem 0.75rem', borderRadius: '8px',
                                  cursor: 'pointer', fontSize: '0.9rem',
                                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                                  background: entidadSeleccionada?._id === ent._id ? 'rgba(124,58,237,0.15)' : 'transparent',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => { if(entidadSeleccionada?._id !== ent._id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                onMouseLeave={(e) => { if(entidadSeleccionada?._id !== ent._id) e.currentTarget.style.background = 'transparent' }}
                              >
                                {ent.logo ? (
                                  <img src={ent.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                                ) : (
                                  <Building2 size={16} color="rgba(255,255,255,0.4)" />
                                )}
                                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ent.nombre}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                {/* ── FIN SELECTOR ── */}

                {/* Email */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    CORREO ELECTRÓNICO
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type="email" placeholder="Usuario o DNI"
                      value={email} onChange={e => setEmail(e.target.value)} required
                      style={{
                        width: '100%', height: '48px',
                        paddingLeft: '2.75rem', paddingRight: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', color: 'white', fontSize: '0.9rem',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                    CLAVE DE SEGURIDAD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required
                      style={{
                        width: '100%', height: '48px',
                        paddingLeft: '2.75rem', paddingRight: '3rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', color: 'white', fontSize: '0.9rem',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Botón */}
                <button type="submit" disabled={loading} style={{
                  height: '50px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', fontWeight: 700, fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: '0 8px 28px rgba(124,58,237,0.4)',
                  opacity: loading ? 0.7 : 1,
                  marginTop: '0.5rem'
                }}>
                  {loading
                    ? <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Ingresando...</>
                    : <><LogIn size={18} /> Ingresar</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
        /* Scrollbar styles para el dropdown */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}
