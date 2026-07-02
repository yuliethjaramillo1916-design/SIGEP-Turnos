import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * DarkSelect — select personalizado dark mode con portal.
 * El dropdown se renderiza en document.body para escapar
 * cualquier overflow:hidden o stacking context del padre.
 *
 * Props:
 *  value       – valor seleccionado actualmente
 *  onChange    – fn(newValue)
 *  options     – [{ value, label }]
 *  placeholder – texto cuando no hay selección
 *  height      – altura del botón (default '40px')
 *  style       – estilos extra para el contenedor
 */
const DarkSelect = ({ value, onChange, options, placeholder = 'Seleccionar...', height = '40px', style = {} }) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  /* Calcular posición al abrir */
  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setOpen(p => !p);
  };

  /* Cerrar al hacer clic fuera */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Recalcular si se hace scroll */
  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setDropPos({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* ── Botón trigger ── */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%',
          height,
          background: 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${open ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px',
          color: value !== '' && value !== undefined ? 'var(--text-main)' : 'rgba(255,255,255,0.35)',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.75rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            marginLeft: '0.4rem',
            opacity: 0.5,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* ── Dropdown via Portal ── */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'absolute',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 99999,
            background: '#1a1830',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: '0.65rem 0.875rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: value === opt.value ? 'rgba(124,58,237,0.22)' : 'transparent',
                color: value === opt.value ? '#c4b5fd' : 'rgba(255,255,255,0.78)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check size={13} style={{ flexShrink: 0, marginLeft: '0.4rem', color: '#a78bfa' }} />
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DarkSelect;
