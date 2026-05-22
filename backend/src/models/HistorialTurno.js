const mongoose = require('mongoose');

const historialTurnoSchema = new mongoose.Schema({
    turno: { type: mongoose.Schema.Types.ObjectId, ref: 'Turno', required: true },
    estado_anterior: { type: String },
    nuevo_estado: { type: String },
    observaciones: { type: String },
    usuario_accion: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

module.exports = mongoose.model('HistorialTurno', historialTurnoSchema);
