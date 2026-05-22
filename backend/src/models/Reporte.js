const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
    tipo: { type: String, required: true }, // Ej: 'diario', 'mensual', 'por_tramite'
    data: { type: Object, required: true },
    fecha_generacion: { type: Date, default: Date.now },
    generado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('Reporte', reporteSchema);
