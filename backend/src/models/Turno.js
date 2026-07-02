const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` al turno — el documento central del sistema.
// Cada entidad tiene su propia secuencia de turnos por fecha.
// Con entidadId, los códigos T-001 de la Alcaldía y T-001 de Movilidad
// son turnos completamente independientes en la misma BD.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a los existentes.
// ─────────────────────────────────────────────────────────────────────────────

const turnoSchema = new mongoose.Schema({
    codigoTurno: { 
        type: String, 
        required: true 
    },
    tramite: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tramite', 
        required: true 
    },
    estado: { 
        type: String, 
        enum: ['ESPERA', 'ATENDIENDO', 'FINALIZADO', 'CANCELADO', 'PAUSADO'], 
        default: 'ESPERA' 
    },
    prioridad: { 
        type: String, 
        enum: ['NORMAL', 'PRIORITARIO'], 
        default: 'NORMAL' 
    },
    motivoPrioridad: { 
        type: String, 
        enum: ['Adulto Mayor', 'Embarazo', 'Discapacidad', 'Urgencias', null], 
        default: null 
    },
    ventanilla: { 
        type: String, // Nombre o número de la ventanilla, ej: "Ventanilla 1"
        default: null
    },
    usuarioAtencion: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario',
        default: null
    },
    fecha: { 
        type: String, // Formato YYYY-MM-DD
        required: true
    },
    hora: { 
        type: String, // Formato HH:MM:SS
        required: true
    },
    tiempoEspera: { 
        type: Number, // en segundos
        default: 0
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
// Query más frecuente del sistema: "turnos de hoy de esta entidad"
turnoSchema.index({ entidadId: 1, fecha: 1, estado: 1 });
// Para búsqueda por código dentro de una entidad y fecha
turnoSchema.index({ entidadId: 1, fecha: 1, codigoTurno: 1 });
// Para el panel en tiempo real: turnos en espera de una entidad
turnoSchema.index({ entidadId: 1, estado: 1, prioridad: 1 });

module.exports = mongoose.model('Turno', turnoSchema);
