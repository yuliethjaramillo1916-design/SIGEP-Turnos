/**
 * Helper para evaluar el horario de atención configurado en el sistema
 * Soporta formatos como "08:00 - 18:00", "8:00 a 17:30", etc.
 */
export const evaluarHorarioAtencion = (horarioStr) => {
  if (!horarioStr || typeof horarioStr !== 'string') {
    return { estado: 'sin_limite', activo: true, horaApertura: '', horaCierre: '', minutosParaCierre: null };
  }

  const match = horarioStr.match(/(\d{1,2}):(\d{2})\s*(?:-|a|hasta)\s*(\d{1,2}):(\d{2})/i);
  if (!match) {
    return { estado: 'sin_limite', activo: true, horaApertura: '', horaCierre: '', minutosParaCierre: null };
  }

  const [_, hIni, mIni, hFin, mFin] = match;
  const startMin = parseInt(hIni, 10) * 60 + parseInt(mIni, 10);
  const endMin = parseInt(hFin, 10) * 60 + parseInt(mFin, 10);

  // Hora actual del cliente
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const horaApertura = `${String(hIni).padStart(2, '0')}:${String(mIni).padStart(2, '0')}`;
  const horaCierre = `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`;

  // Caso: Antes del horario de apertura
  if (currentMin < startMin) {
    return {
      estado: 'antes_apertura',
      activo: false,
      horaApertura,
      horaCierre,
      minutosParaCierre: null,
      minutosFaltantes: startMin - currentMin
    };
  }

  // Caso: Fuera del horario de atención (después del cierre)
  if (currentMin >= endMin) {
    return {
      estado: 'cerrado',
      activo: false,
      horaApertura,
      horaCierre,
      minutosParaCierre: 0,
      minutosFaltantes: 0
    };
  }

  // Dentro del horario de atención
  const minutosParaCierre = endMin - currentMin;

  // Caso: 10 minutos o menos para el cierre
  if (minutosParaCierre <= 10) {
    return {
      estado: 'aviso_10',
      activo: true,
      horaApertura,
      horaCierre,
      minutosParaCierre
    };
  }

  // Caso: 1 hora o menos (entre 11 y 60 minutos) para el cierre
  if (minutosParaCierre <= 60) {
    return {
      estado: 'aviso_60',
      activo: true,
      horaApertura,
      horaCierre,
      minutosParaCierre
    };
  }

  // Operación normal
  return {
    estado: 'abierto',
    activo: true,
    horaApertura,
    horaCierre,
    minutosParaCierre
  };
};
