import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { Volume2, VolumeX, Tv, Play } from 'lucide-react';

const PantallaPublica = () => {
  const [currentTurno, setCurrentTurno] = useState(null);
  const [espera, setEspera] = useState([]);
  const [empresaNombre, setEmpresaNombre] = useState('SIGEP-TURNOS');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(true);
  const [blinking, setBlinking] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Refs — siempre tienen el valor actual, seguros dentro de closures de socket
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const announcedRef = useRef(new Set());
  const audioEnabledRef = useRef(false);
  const currentTurnoRef = useRef(null);

  // Sincronizar refs con estado
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { currentTurnoRef.current = currentTurno; }, [currentTurno]);

  // ─── Audio ────────────────────────────────────────────────────────────────

  const playChime = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const notas = [
        { freq: 880, start: 0,   dur: 0.6 },
        { freq: 659, start: 0.3, dur: 0.6 },
        { freq: 523, start: 0.6, dur: 0.8 },
      ];
      notas.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      });
    } catch (err) {
      console.error('Error timbre:', err);
    }
  };

  const speakTurno = (turno) => {
    try {
      window.speechSynthesis.cancel();
      const texto = `Turno ${turno.codigoTurno.split('').join(' ')}, favor acercarse a ${turno.ventanilla || 'la ventanilla asignada'}`;
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const doSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const voz = voices.find(v => v.lang.startsWith('es'));
        if (voz) utterance.voice = voz;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          doSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    } catch (err) {
      console.error('Error síntesis de voz:', err);
    }
  };

  // Guardado en ref para que el listener del socket siempre llame la versión actualizada
  const anunciarTurnoRef = useRef(null);
  anunciarTurnoRef.current = (turno) => {
    if (!turno) return;

    // Anti-duplicados
    const key = turno.codigoTurno;
    if (announcedRef.current.has(key)) return;
    announcedRef.current.add(key);
    setTimeout(() => announcedRef.current.delete(key), 30000);

    // Parpadeo visual
    setBlinking(true);
    setTimeout(() => setBlinking(false), 6000);

    // Audio
    if (!audioEnabledRef.current) return;
    playChime();
    setTimeout(() => speakTurno(turno), 1500);
  };

  // ─── Datos ────────────────────────────────────────────────────────────────

  const fetchConfig = async () => {
    try {
      const res = await api.get('/configuracion');
      if (res.data?.nombre_empresa) setEmpresaNombre(res.data.nombre_empresa);
    } catch (_) {}
  };

  const fetchPublicStats = async () => {
    try {
      const res = await api.get('/turnos/publico');
      const { enAtencion, enEspera } = res.data;
      setEspera(enEspera || []);

      if (enAtencion && enAtencion.length > 0) {
        const next = enAtencion[0];
        if (currentTurnoRef.current?.codigoTurno !== next.codigoTurno) {
          setCurrentTurno(next);
          anunciarTurnoRef.current(next);
        }
      } else {
        setCurrentTurno(null);
      }
    } catch (err) {
      console.error('Error polling público:', err);
    }
  };

  // ─── Socket ───────────────────────────────────────────────────────────────

  const startPolling = () => {
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(fetchPublicStats, 4000);
    }
  };

  const initSocket = () => {
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    });

    socket.on('disconnect', () => { setSocketConnected(false); startPolling(); });
    socket.on('connect_error', () => { setSocketConnected(false); startPolling(); });

    socket.on('turno_llamado', (turno) => {
      console.log('⚡ turno_llamado:', turno);
      setCurrentTurno(turno);
      // Llamar via ref para tener siempre la versión actualizada de la función
      anunciarTurnoRef.current(turno);
      fetchPublicStats();
    });

    socket.on('cola_actualizada', () => fetchPublicStats());
  };

  useEffect(() => {
    fetchConfig();
    fetchPublicStats();
    initSocket();
    return () => {
      socketRef.current?.disconnect();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // ─── Activar audio ────────────────────────────────────────────────────────

  const habilitarAudioYComenzar = () => {
    setAudioEnabled(true);
    audioEnabledRef.current = true;
    setShowAudioModal(false);

    // Desbloquear AudioContext con interacción del usuario
    playChime();
    setTimeout(() => {
      const test = new SpeechSynthesisUtterance('Sistema de llamados activado');
      test.lang = 'es-ES';
      window.speechSynthesis.speak(test);
    }, 1000);

    fetchPublicStats();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: '#0f172a',
      minHeight: '100vh',
      color: 'white',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Modal de activación de audio */}
      {showAudioModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)',
          zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: '24px', padding: '3rem', textAlign: 'center',
            maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '20px', color: 'white', marginBottom: '1.5rem',
            }}>
              <Volume2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Pantalla de Visualización
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2.5rem' }}>
              Para reproducir los sonidos de alerta y las llamadas automáticas por voz, necesitamos tu interacción inicial debido a las políticas de seguridad del navegador.
            </p>
            <button
              onClick={habilitarAudioYComenzar}
              style={{
                width: '100%', height: '52px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white', border: 'none', borderRadius: '14px',
                fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              }}
            >
              <Play size={20} fill="white" />
              Activar Audio y Pantalla
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        height: '90px', borderBottom: '2px solid #1e293b',
        padding: '0 3rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', background: '#0b0f19'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '45px', height: '45px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', borderRadius: '12px'
          }}>
            <Tv size={24} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            {empresaNombre}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '1rem', fontWeight: 600 }}>
            {audioEnabled
              ? <Volume2 size={20} style={{ color: '#10b981' }} />
              : <VolumeX size={20} style={{ color: '#ef4444' }} />}
            <span>{audioEnabled ? 'Altavoz Activo' : 'Mudo'}</span>
          </div>
          <div style={{
            background: '#1e293b', padding: '0.4rem 1rem', borderRadius: '10px',
            fontSize: '0.85rem', fontWeight: 700,
            color: socketConnected ? '#10b981' : '#f59e0b'
          }}>
            {socketConnected ? '⚡ EN LÍNEA' : '🔁 POLLING'}
          </div>
        </div>
      </header>

      {/* Panel principal */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', overflow: 'hidden' }}>

        {/* Izquierda: turno actual */}
        <section style={{
          borderRight: '3px solid #1e293b',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '4rem', position: 'relative',
          background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)'
        }}>
          {currentTurno ? (
            <div style={{
              textAlign: 'center', width: '100%',
              animation: blinking ? 'blinkGlow 1.2s infinite' : 'none',
              borderRadius: '32px', padding: '3rem',
              background: blinking ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              border: blinking ? '3px solid #10b981' : '3px solid transparent',
              transition: 'all 0.3s ease'
            }}>
              <span style={{
                fontSize: '2rem', fontWeight: 800, letterSpacing: '0.15em',
                textTransform: 'uppercase', display: 'block', marginBottom: '1rem',
                color: currentTurno.prioridad === 'PRIORITARIO' ? '#fbbf24' : '#60a5fa',
              }}>
                {currentTurno.prioridad === 'PRIORITARIO'
                  ? `⭐ Llamado Preferencial (${currentTurno.motivoPrioridad})`
                  : 'Llamado Activo'}
              </span>

              <h2 style={{
                fontSize: '12rem', fontWeight: 950, color: 'white',
                lineHeight: 1, letterSpacing: '-0.05em', margin: '1.5rem 0',
                textShadow: '0 0 40px rgba(255,255,255,0.1)'
              }}>
                {currentTurno.codigoTurno}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '1rem 3rem', borderRadius: '20px',
                  boxShadow: '0 10px 30px rgba(16, 185, 129, 0.25)'
                }}>
                  <h3 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', margin: 0 }}>
                    {currentTurno.ventanilla}
                  </h3>
                </div>
              </div>

              <p style={{ fontSize: '1.75rem', color: '#94a3b8', fontWeight: 600, marginTop: '2.5rem' }}>
                Trámite: {currentTurno.tramite?.nombre}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#475569' }}>
              <Tv size={120} strokeWidth={1} style={{ marginBottom: '2rem' }} />
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#334155' }}>
                Esperando Asignaciones
              </h2>
              <p style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>
                Los nuevos llamados aparecerán aquí automáticamente.
              </p>
            </div>
          )}
        </section>

        {/* Derecha: próximos turnos */}
        <section style={{ background: '#0b0f19', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            height: '80px', background: '#090d16', borderBottom: '2px solid #1e293b',
            display: 'flex', alignItems: 'center', padding: '0 2.5rem'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.02em' }}>
              Próximos Turnos
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {espera.length > 0 ? espera.map((t, idx) => (
              <div key={t._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.5rem 2rem',
                background: t.prioridad === 'PRIORITARIO' ? 'linear-gradient(90deg, #1e293b 0%, #78350f 100%)' : '#1e293b',
                border: t.prioridad === 'PRIORITARIO' ? '2px solid #d97706' : '1px solid #334155',
                borderRadius: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{
                    width: '45px', height: '45px', borderRadius: '12px',
                    background: '#0f172a', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#94a3b8'
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1 }}>
                      {t.codigoTurno}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.35rem' }}>
                      {t.tramite?.nombre}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    background: t.prioridad === 'PRIORITARIO' ? '#92400e' : '#1e3a5f',
                    color: t.prioridad === 'PRIORITARIO' ? '#fde68a' : '#93c5fd',
                  }}>
                    {t.prioridad === 'PRIORITARIO' ? '⭐ PREFERENCIAL' : 'NORMAL'}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    {t.hora}
                  </p>
                </div>
              </div>
            )) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fila vacía</h3>
                <p style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>No hay turnos pendientes.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer marquesina */}
      <footer style={{
        height: '60px', background: '#090d16', borderTop: '2px solid #1e293b',
        display: 'flex', alignItems: 'center', padding: '0 3rem', overflow: 'hidden',
      }}>
        <div style={{
          background: '#ef4444', color: 'white', padding: '0.25rem 1rem',
          borderRadius: '6px', fontWeight: 800, fontSize: '0.85rem',
          marginRight: '2rem', flexShrink: 0
        }}>
          ANUNCIO
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            whiteSpace: 'nowrap', fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8',
            animation: 'marqueeScroll 25s linear infinite'
          }}>
            📢 ATENCIÓN: Por favor, tenga a la mano su ticket impreso y observe su número en pantalla. Los turnos prioritarios (adultos mayores, mujeres embarazadas y personas con discapacidad) serán atendidos con preferencia. Agradecemos su paciencia y colaboración.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blinkGlow {
          0%   { border-color: rgba(16,185,129,0.2); box-shadow: 0 0 10px rgba(16,185,129,0.1); }
          50%  { border-color: rgba(16,185,129,1);   box-shadow: 0 0 35px rgba(16,185,129,0.6); }
          100% { border-color: rgba(16,185,129,0.2); box-shadow: 0 0 10px rgba(16,185,129,0.1); }
        }
        @keyframes marqueeScroll {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default PantallaPublica;
