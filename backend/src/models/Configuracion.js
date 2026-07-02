const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` a la configuración.
// Actualmente existe una sola configuración global. Con entidadId, cada
// entidad tendrá su propia configuración operacional (nombre, logo, horario).
//
// COEXISTENCIA CON ENTIDAD:
//   - El modelo Entidad ya contiene horarioAtencion, limiteTurnosDia, logo.
//   - Esta colección se mantiene para configuraciones más específicas o
//     extendidas que no quepan en el modelo Entidad.
//   - En etapas futuras se puede consolidar o deprecar según decisión.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a la existente.
// ─────────────────────────────────────────────────────────────────────────────

const configuracionSchema = new mongoose.Schema({
    nombre_empresa: { 
        type: String, 
        required: true 
    },
    logo: { 
        type: String 
    },
    horario_atencion: { 
        type: String 
    },
    limite_turnos_dia: { 
        type: Number 
    },
    activo: { 
        type: Boolean, 
        default: true 
    },

    // ── MULTI-ENTIDAD ───────────────────────────────────────────────────────
    entidadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entidad',
        default: null
        // Sin required: true — migración segura.
        // Cada entidad tendrá exactamente 1 documento de configuración.
    }
    // ────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

// ── Índices ──────────────────────────────────────────────────────────────────
// Cada entidad tiene una sola configuración — búsqueda directa por entidad.
// En ETAPA 4 se puede activar unique: true para garantizar 1 config por entidad.
configuracionSchema.index({ entidadId: 1 });

module.exports = mongoose.model('Configuracion', configuracionSchema);
