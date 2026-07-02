const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` para que cada entidad gestione sus propios trámites.
// Ejemplo: "Licencia de conducción" en Movilidad, "Predial" en la Alcaldía.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a los existentes.
// ─────────────────────────────────────────────────────────────────────────────

const tramiteSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre del trámite es obligatorio'],
        trim: true 
    },
    descripcion: { 
        type: String,
        trim: true 
    },
    tiempoEstimado: { 
        type: Number, 
        default: 15 // en minutos
    },
    estado: { 
        type: Boolean, 
        default: true 
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
// Permite que dos entidades distintas tengan un trámite con el mismo nombre.
// En ETAPA 4 se activará unique: true en este índice.
tramiteSchema.index({ entidadId: 1, nombre: 1 });
// Útil para listar trámites activos de una entidad.
tramiteSchema.index({ entidadId: 1, estado: 1 });

module.exports = mongoose.model('Tramite', tramiteSchema);
