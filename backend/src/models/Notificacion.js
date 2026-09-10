const mongoose = require('mongoose');

// Modelo de Notificación para eventos de sesión y alertas de entidad
const notificacionSchema = new mongoose.Schema({
    entidadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entidad',
        required: true,
        index: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    nombreUsuario: {
        type: String,
        required: true
    },
    rol: {
        type: String,
        enum: ['OPERADOR', 'VIGILANTE', 'ADMINISTRADOR'],
        required: true
    },
    tipo: {
        type: String,
        enum: ['LOGIN', 'LOGOUT'],
        required: true
    },
    titulo: {
        type: String,
        required: true
    },
    mensaje: {
        type: String,
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now,
        index: true
    },
    leido: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Índice compuesto para consultas rápidas por entidad y orden cronológico
notificacionSchema.index({ entidadId: 1, fecha: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);
