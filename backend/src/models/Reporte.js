const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega `entidadId` a los reportes.
// Un administrador de Movilidad nunca debe ver reportes de la Alcaldía.
// Los reportes son generados con datos agregados de su propia entidad.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - El script migrar-multi-entidad.js asignará la entidad a los existentes.
// ─────────────────────────────────────────────────────────────────────────────

const reporteSchema = new mongoose.Schema({
    tipo: { 
        type: String, 
        required: true 
        // Ejemplos: 'diario', 'mensual', 'por_tramite', 'por_ventanilla'
    },
    data: { 
        type: Object, 
        required: true 
    },
    fecha_generacion: { 
        type: Date, 
        default: Date.now 
    },
    generado_por: { 
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
// Consulta típica: "reportes mensuales de esta entidad, más recientes primero"
reporteSchema.index({ entidadId: 1, tipo: 1, fecha_generacion: -1 });
// Listado general de reportes de una entidad (panel de administración)
reporteSchema.index({ entidadId: 1, fecha_generacion: -1 });

module.exports = mongoose.model('Reporte', reporteSchema);
