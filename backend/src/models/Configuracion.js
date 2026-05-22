const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema({
    nombre_empresa: { type: String, required: true },
    logo: { type: String },
    horario_atencion: { type: String },
    limite_turnos_dia: { type: Number },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Configuracion', configuracionSchema);
