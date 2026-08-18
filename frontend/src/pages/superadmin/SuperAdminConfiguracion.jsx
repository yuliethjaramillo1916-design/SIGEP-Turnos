import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Settings, Save, AlertTriangle, CheckCircle2, ShieldCheck,
  Mail, Phone, Clock, Bell, Sparkles, RefreshCw
} from 'lucide-react';

export default function SuperAdminConfiguracion() {
  const [config, setConfig] = useState({
    nombrePlataforma: 'SIGEP-Turnos SaaS',
    versionSistema: '2.5.0',
    emailSoporte: 'soporte@sigepturnos.com',
    telefonoSoporte: '+57 300 000 0000',
    modoMantenimiento: false,
    mensajeMantenimiento: 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.',
    frecuenciaBackupsGlobal: 'Diario',
    diasAlertaVencimientoLicencia: 15,
    limiteMaximoEntidades: 100
  });

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/configuracion');
      if (res.data) setConfig(res.data);
    } catch (err) {
      console.error('Error al cargar configuración SaaS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const res = await api.put('/super-admin/configuracion', config);
      setConfig(res.data);
      setMensajeExito('Configuración global de la plataforma actualizada correctamente.');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Cargando configuración...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
          Configuración Global de la Plataforma
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          Parámetros técnicos y comerciales maestros que aplican a todas las entidades del ecosistema.
        </p>
      </div>

      {mensajeExito && (
        <div style={{
          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '12px', padding: '1rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <CheckCircle2 size={18} /> {mensajeExito}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '1rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Parámetros de Marca y Soporte */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.75rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 1.25rem 0' }}>
            1. Identidad de Plataforma & Contacto de Soporte
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                NOMBRE DE LA PLATAFORMA SAAS
              </label>
              <input
                type="text" required
                value={config.nombrePlataforma} onChange={e => setConfig({ ...config, nombrePlataforma: e.target.value })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                VERSIÓN DEL SISTEMA
              </label>
              <input
                type="text" required
                value={config.versionSistema} onChange={e => setConfig({ ...config, versionSistema: e.target.value })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                CORREO DE SOPORTE GLOBAL
              </label>
              <input
                type="email" required
                value={config.emailSoporte} onChange={e => setConfig({ ...config, emailSoporte: e.target.value })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                LÍNEA DE ATENCIÓN / WHATSAPP
              </label>
              <input
                type="text" required
                value={config.telefonoSoporte} onChange={e => setConfig({ ...config, telefonoSoporte: e.target.value })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Políticas de Suscripciones & Alertas */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.75rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 1.25rem 0' }}>
            2. Políticas de Suscripciones y Alertas
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                DÍAS PREVIOS PARA ALERTA DE VENCIMIENTO DE LICENCIA
              </label>
              <input
                type="number" min={1} required
                value={config.diasAlertaVencimientoLicencia} onChange={e => setConfig({ ...config, diasAlertaVencimientoLicencia: Number(e.target.value) })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                LÍMITE MÁXIMO DE ENTIDADES EN EL CLUSTER
              </label>
              <input
                type="number" min={1} required
                value={config.limiteMaximoEntidades} onChange={e => setConfig({ ...config, limiteMaximoEntidades: Number(e.target.value) })}
                style={{
                  width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit" disabled={guardando}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 2rem', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', border: 'none',
              color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: guardando ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)', opacity: guardando ? 0.7 : 1
            }}
          >
            <Save size={18} /> {guardando ? 'Guardando Configuración...' : 'Guardar Configuración Global'}
          </button>
        </div>

      </form>

    </div>
  );
}
