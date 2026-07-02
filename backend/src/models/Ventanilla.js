const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` para que cada entidad gestione sus propias ventanillas.
// La "Ventanilla 1" de la Alcaldía y la "Ventanilla 1" de Movilidad son
// objetos completamente diferentes.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a las existentes.
// ─────────────────────────────────────────────────────────────────────────────

const ventanillaSchema = new mongoose.Schema({
    numero: { 
        type: String, 
        required: true 
    },
    nombre: { 
        type: String 
    },
    operador: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario' 
    },
    estado: { 
        type: String, 
        enum: ['activa', 'inactiva'], 
        default: 'activa' 
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
// El mismo número de ventanilla puede existir en diferentes entidades.
// En ETAPA 4 se activará unique: true en este índice.
ventanillaSchema.index({ entidadId: 1, numero: 1 });
// Útil para listar ventanillas activas de una entidad.
ventanillaSchema.index({ entidadId: 1, estado: 1 });

module.exports = mongoose.model('Ventanilla', ventanillaSchema);
