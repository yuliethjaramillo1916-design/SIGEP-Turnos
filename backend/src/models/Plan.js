const mongoose = require('mongoose');

/**
 * Modelo: Plan
 * Representa los planes o paquetes de suscripción SaaS disponibles en la plataforma.
 */
const planSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: [true, 'El nombre del plan es obligatorio'],
            unique: true,
            trim: true,
            maxlength: [100, 'El nombre no puede superar 100 caracteres']
        },
        descripcion: {
            type: String,
            default: '',
            trim: true
        },
        precio: {
            type: Number,
            required: [true, 'El precio del plan es obligatorio'],
            min: [0, 'El precio no puede ser negativo'],
            default: 0
        },
        cantidadMaximaUsuarios: {
            type: Number,
            required: [true, 'La cantidad máxima de usuarios es obligatoria'],
            default: 10,
            min: [1, 'Mínimo 1 usuario']
        },
        cantidadMaximaVentanillas: {
            type: Number,
            required: [true, 'La cantidad máxima de ventanillas es obligatoria'],
            default: 5,
            min: [1, 'Mínimo 1 ventanilla']
        },
        cantidadMaximaTramites: {
            type: Number,
            required: [true, 'La cantidad máxima de trámites es obligatoria'],
            default: 15,
            min: [1, 'Mínimo 1 trámite']
        },
        modulosHabilitados: {
            type: [String],
            default: ['TURNOS', 'ATENCION', 'HISTORIAL', 'REPORTES', 'VENTANILLAS', 'TRAMITES', 'USUARIOS', 'CONFIGURACION']
        },
        nivelSoporte: {
            type: String,
            enum: ['Básico', 'Estándar', 'Premium', '24/7 Dedicado'],
            default: 'Estándar'
        },
        frecuenciaBackups: {
            type: String,
            enum: ['Diario', 'Semanal', 'Mensual'],
            default: 'Semanal'
        },
        actualizacionesIncluidas: {
            type: Boolean,
            default: true
        },
        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo'
        }
    },
    {
        timestamps: true,
        collection: 'planes'
    }
);

module.exports = mongoose.model('Plan', planSchema);
