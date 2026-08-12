import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { Volume2, VolumeX, Play, Zap, Users, Clock } from 'lucide-react';

/* ── Calendario vectorial SVG ── */
const CalendarIcon = ({ size = 24, color = 'white', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    style={style}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <circle cx="8"  cy="15" r="1" fill={color} stroke="none" />
    <circle cx="12" cy="15" r="1" fill={color} stroke="none" />
    <circle cx="16" cy="15" r="1" fill={color} stroke="none" />
  </svg>
);

const PantallaPublica = () => {
  const [currentTurno, setCurrentTurno]   = useState(null);
  const [espera, setEspera]               = useState([]);
  const [empresaNombre, setEmpresaNombre] = useState('SIGEP-TURNOS');
  const [audioEnabled, setAudioEnabled]   = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(true);
  const [blinking, setBlinking]           = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [horaActual, setHoraActual]       = useState('');

  const socketRef          = useRef(null);
  const pollingIntervalRef = useRef(null);
  const announcedRef       = useRef(new Set());
  const audioEnabledRef    = useRef(false);
  const currentTurnoRef    = useRef(null);

  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { currentTurnoRef.current = currentTurno; }, [currentTurno]);

  /* Reloj en tiempo real */
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHoraActual(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Audio ── */
  const playChime = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      [{ freq: 880, start: 0, dur: 0.5 }, { freq: 1100, start: 0.25, dur: 0.5 }, { freq: 660, start: 0.5, dur: 0.8 }]
        .forEach(({ freq, start, dur }) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.22, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
        });
    } catch {}
  };

  const speakTurno = (turno) => {
    try {
      window.speechSynthesis.cancel();
      const texto = `Turno ${turno.codigoTurno.split('').join(' ')}, favor acercarse a ${turno.ventanilla || 'la ventanilla asignada'}`;
      const utt = new SpeechSynthesisUtterance(texto);
      utt.lang = 'es-ES'; utt.rate = 0.9; utt.pitch = 1.0; utt.volume = 1.0;
      const doSpeak = () => {
        const voz = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
        if (voz) utt.voice = voz;
        window.speechSynthesis.speak(utt);
      };
      window.speechSynthesis.getVoices().length > 0
        ? doSpeak()
        : (window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; });
    } catch {}
  };

  const anunciarTurnoRef = useRef(null);
  anunciarTurnoRef.current = (turno) => {
    if (!turno) return;
    const key = turno.codigoTurno;
    if (announcedRef.current.has(key)) return;
    announcedRef.current.add(key);
    setTimeout(() => announcedRef.current.delete(key), 30000);
    setBlinking(true);
    setTimeout(() => setBlinking(false), 7000);
    if (!audioEnabledRef.current) return;
    playChime();
    setTimeout(() => speakTurno(turno), 1500);
  };

  /* ── Datos ── */
  const fetchConfig = async () => {
    try {
      const res = await api.get('/configuracion');
      if (res.data?.nombre_empresa) setEmpresaNombre(res.data.nombre_empresa);
    } catch {}
  };

  const fetchPublicStats = async () => {
    try {
      const res = await api.get('/turnos/publico');
      const { enAtencion, enEspera } = res.data;
      setEspera(enEspera || []);
      if (enAtencion?.length > 0) {
        const next = enAtencion[0];
        if (currentTurnoRef.current?.codigoTurno !== next.codigoTurno) {
          setCurrentTurno(next);
          anunciarTurnoRef.current(next);
        }
      } else {
        setCurrentTurno(null);
      }
    } catch {}
  };

  const startPolling = () => {
    if (!pollingIntervalRef.current)
      pollingIntervalRef.current = setInterval(fetchPublicStats, 4000);
  };

  const initSocket = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl);
    socketRef.current = socket;
    socket.on('connect',       () => { setSocketConnected(true); if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; } });
    socket.on('disconnect',    () => { setSocketConnected(false); startPolling(); });
    socket.on('connect_error', () => { setSocketConnected(false); startPolling(); });
    socket.on('turno_llamado', (turno) => { setCurrentTurno(turno); anunciarTurnoRef.current(turno); fetchPublicStats(); });
    socket.on('cola_actualizada', () => fetchPublicStats());
  };

  useEffect(() => {
    fetchConfig(); fetchPublicStats(); initSocket();
    return () => { socketRef.current?.disconnect(); if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, []);

  const habilitarAudioYComenzar = () => {
    setAudioEnabled(true); audioEnabledRef.current = true; setShowAudioModal(false);
    playChime();
    setTimeout(() => { const u = new SpeechSynthesisUtterance('Sistema de llamados activado'); u.lang = 'es-ES'; window.speechSynthesis.speak(u); }, 1000);
    fetchPublicStats();
  };

  const esPrioritario = currentTurno?.prioridad === 'PRIORITARIO';

  return (
    <div style={{
      background: '#0f0e17',
      minHeight: '100vh', height: '100vh',
      color: 'white',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Modal activar audio ── */}
      {showAudioModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(10,9,20,0.95)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1830 0%, #1e1c35 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '28px', padding: '3.5rem', textAlign: 'center',
            maxWidth: '480px', width: '90%',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.15)',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '80px', height: '80px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              borderRadius: '22px', color: 'white', marginBottom: '1.75rem',
              boxShadow: '0 12px 32px rgba(124,58,237,0.45)',
            }}>
              <Volume2 size={38} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
              Pantalla de Llamados
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Para reproducir alertas sonoras y llamados por voz, el navegador requiere una interacción inicial.
            </p>
            <button onClick={habilitarAudioYComenzar} style={{
              width: '100%', height: '56px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white', border: 'none', borderRadius: '14px',
              fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              boxShadow: '0 8px 28px rgba(124,58,237,0.5)',
              fontFamily: 'inherit',
            }}>
              <Play size={20} fill="white" />
              Activar Pantalla y Audio
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={{
        height: '72px', flexShrink: 0,
        background: 'rgba(13,12,23,0.95)',
        borderBottom: '1px solid rgba(124,58,237,0.2)',
        padding: '0 2.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(124,58,237,0.4)',
          }}>
            <CalendarIcon size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {empresaNombre}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: '1px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Sistema de Gestión de Turnos
            </div>
          </div>
        </div>

        {/* Centro: reloj */}
        <div style={{
          fontSize: '1.75rem', fontWeight: 800, color: 'white',
          letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums',
          background: 'rgba(255,255,255,0.05)', padding: '0.35rem 1.25rem',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {horaActual}
        </div>

        {/* Derecha: estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
            {audioEnabled ? <Volume2 size={16} style={{ color: '#a78bfa' }} /> : <VolumeX size={16} style={{ color: '#f87171' }} />}
            <span>{audioEnabled ? 'Audio activo' : 'Sin audio'}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.875rem', borderRadius: '20px',
            background: socketConnected ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
            border: `1px solid ${socketConnected ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)'}`,
            color: socketConnected ? '#34d399' : '#fbbf24',
            fontSize: '0.78rem', fontWeight: 700,
          }}>
            <Zap size={13} />
            {socketConnected ? 'EN LÍNEA' : 'POLLING'}
          </div>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Izquierda: turno en atención ── */}
        <section style={{
          borderRight: '1px solid rgba(124,58,237,0.15)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '3rem 4rem', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #13111c 0%, #1a1530 100%)',
        }}>
          {/* Orbe decorativo */}
          <div style={{
            position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
            width: '500px', height: '500px', borderRadius: '50%',
            background: esPrioritario
              ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 65%)'
              : blinking
                ? 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)'
                : 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)',
            pointerEvents: 'none', transition: 'background 0.5s',
          }} />

          {currentTurno ? (
            <div style={{
              textAlign: 'center', width: '100%',
              position: 'relative', zIndex: 1,
            }}>
              {/* Badge de tipo */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1.5rem', borderRadius: '999px', marginBottom: '2rem',
                background: esPrioritario ? 'rgba(251,191,36,0.15)' : 'rgba(124,58,237,0.18)',
                border: `1px solid ${esPrioritario ? 'rgba(251,191,36,0.4)' : 'rgba(124,58,237,0.4)'}`,
                color: esPrioritario ? '#fde047' : '#c4b5fd',
                fontSize: '1rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {esPrioritario ? `⭐ Llamado Preferencial · ${currentTurno.motivoPrioridad}` : '🟢 Llamado Activo'}
              </div>

              {/* Código gigante */}
              <div style={{
                fontSize: 'clamp(6rem, 14vw, 11rem)',
                fontWeight: 950,
                color: 'white',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                marginBottom: '1.5rem',
                textShadow: blinking
                  ? `0 0 60px ${esPrioritario ? 'rgba(251,191,36,0.7)' : 'rgba(124,58,237,0.8)'}`
                  : '0 0 30px rgba(255,255,255,0.1)',
                animation: blinking ? 'pulseScale 1.2s ease-in-out infinite' : 'none',
                transition: 'text-shadow 0.3s',
              }}>
                {currentTurno.codigoTurno}
              </div>

              {/* Trámite */}
              <div style={{
                fontSize: '1.5rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.55)',
                marginBottom: '2.5rem',
                letterSpacing: '-0.01em',
              }}>
                {currentTurno.tramite?.nombre}
              </div>

              {/* Ventanilla */}
              {currentTurno.ventanilla && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem 3rem', borderRadius: '20px',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 12px 40px rgba(124,58,237,0.5)',
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ventanilla</span>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{currentTurno.ventanilla}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '30px', margin: '0 auto 2rem',
                background: 'rgba(124,58,237,0.1)', border: '2px dashed rgba(124,58,237,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(124,58,237,0.4)',
              }}>
                <CalendarIcon size={48} color="rgba(124,58,237,0.5)" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem' }}>
                Sin turno activo
              </h2>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.15)' }}>
                Los llamados aparecerán aquí automáticamente
              </p>
            </div>
          )}
        </section>

        {/* ── Derecha: cola de espera ── */}
        <section style={{
          background: '#13111c',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header de la cola */}
          <div style={{
            height: '64px', flexShrink: 0,
            background: 'rgba(124,58,237,0.08)',
            borderBottom: '1px solid rgba(124,58,237,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={18} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Próximos Turnos
              </span>
            </div>
            {espera.length > 0 && (
              <span style={{
                background: 'rgba(124,58,237,0.2)', color: '#c4b5fd',
                border: '1px solid rgba(124,58,237,0.35)',
                padding: '0.15rem 0.65rem', borderRadius: '999px',
                fontSize: '0.8rem', fontWeight: 700,
              }}>{espera.length} en espera</span>
            )}
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {espera.length > 0 ? espera.map((t, idx) => (
              <div key={t._id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: '14px',
                background: t.prioridad === 'PRIORITARIO'
                  ? 'rgba(251,191,36,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s',
              }}>
                {/* Número */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: idx === 0
                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                    : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 800,
                  color: idx === 0 ? 'white' : 'rgba(255,255,255,0.4)',
                  boxShadow: idx === 0 ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                }}>
                  {idx + 1}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {t.codigoTurno}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.tramite?.nombre}
                  </div>
                </div>

                {/* Badge + hora */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '6px',
                    background: t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.2)' : 'rgba(124,58,237,0.2)',
                    color: t.prioridad === 'PRIORITARIO' ? '#fde047' : '#c4b5fd',
                    border: `1px solid ${t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.35)' : 'rgba(124,58,237,0.35)'}`,
                    textTransform: 'uppercase',
                  }}>
                    {t.prioridad === 'PRIORITARIO' ? '⭐ PREF.' : 'NORMAL'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>
                    <Clock size={10} />{t.hora}
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.15)', gap: '0.5rem' }}>
                <Users size={40} strokeWidth={1} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Fila vacía</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer marquesina ── */}
      <footer style={{
        height: '52px', flexShrink: 0,
        background: 'rgba(13,12,23,0.95)',
        borderTop: '1px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', padding: '0 2rem', overflow: 'hidden', gap: '1.25rem',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: 'white', padding: '0.2rem 0.875rem', borderRadius: '6px',
          fontWeight: 800, fontSize: '0.72rem', flexShrink: 0, letterSpacing: '0.05em',
        }}>
          AVISO
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)',
            animation: 'marqueeScroll 30s linear infinite',
          }}>
            📢 Por favor tenga a mano su ticket e identifique su número en pantalla. Los turnos PREFERENCIALES (adultos mayores, mujeres en estado de embarazo y personas con discapacidad) serán atendidos con prioridad. Gracias por su paciencia y colaboración.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.03); }
        }
        @keyframes marqueeScroll {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default PantallaPublica;
