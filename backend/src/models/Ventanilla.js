const mongoose = require('mongoose');

const ventanillaSchema = new mongoose.Schema({
    numero: { type: String, required: true },
    nombre: { type: String },
    operador: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    estado: { type: String, enum: ['activa', 'inactiva'], default: 'activa' }
}, { timestamps: true });

module.exports = mongoose.model('Ventanilla', ventanillaSchema);
