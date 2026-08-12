const mongoose = require('mongoose');

/**
 * Modelo: Licencia
 * Representa la licencia o suscripción activa asignada a una entidad cliente.
 */
const licenciaSchema = new mongoose.Schema(
    {
        claveLicencia: {
            type: String,
            required: [true, 'La clave de licencia es obligatoria'],
            unique: true,
            trim: true,
            uppercase: true
        },
        entidadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Entidad',
            required: [true, 'La entidad es obligatoria']
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: [true, 'El plan es obligatorio']
        },
        fechaInicio: {
            type: Date,
            default: Date.now
        },
        fechaVencimiento: {
            type: Date,
            required: [true, 'La fecha de vencimiento es obligatoria']
        },
        estado: {
            type: String,
            enum: ['activa', 'vencida', 'suspendida', 'cancelada'],
            default: 'activa'
        },
        limiteUsuarios: {
            type: Number,
            default: 10
        },
        limiteVentanillas: {
            type: Number,
            default: 5
        },
        limiteTramites: {
            type: Number,
            default: 15
        },
        notas: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true,
        collection: 'licencias'
    }
);

licenciaSchema.index({ entidadId: 1 });
licenciaSchema.index({ estado: 1 });
licenciaSchema.index({ fechaVencimiento: 1 });

module.exports = mongoose.model('Licencia', licenciaSchema);
