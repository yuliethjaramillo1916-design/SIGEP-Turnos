const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` al historial de turnos.
// Aunque el historial puede llegar a la entidad vía turno → entidadId,
// tener entidadId directo permite consultas de auditoría eficientes
// sin necesitar un $lookup adicional.
// Ejemplo: "historial de cambios de estado de esta entidad en el último mes"
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a los existentes.
// ─────────────────────────────────────────────────────────────────────────────

const historialTurnoSchema = new mongoose.Schema({
    turno: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Turno', 
        required: true 
    },
    estado_anterior: { 
        type: String 
    },
    nuevo_estado: { 
        type: String 
    },
    observaciones: { 
        type: String 
    },
    usuario_accion: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario' 
    },

    // ── MULTI-ENTIDAD ───────────────────────────────────────────────────────
    entidadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entidad',
        default: null
        // Sin required: true — migración segura.
    }
    // ────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

// ── Índices ──────────────────────────────────────────────────────────────────
// Consultas de auditoría temporales por entidad (más recientes primero)
historialTurnoSchema.index({ entidadId: 1, createdAt: -1 });
// Buscar todo el historial de un turno específico
historialTurnoSchema.index({ turno: 1, entidadId: 1 });

module.exports = mongoose.model('HistorialTurno', historialTurnoSchema);
