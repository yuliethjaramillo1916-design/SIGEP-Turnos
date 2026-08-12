const mongoose = require('mongoose');

/**
 * Modelo: ConfiguracionGlobal
 * Representa la configuración general de la plataforma SaaS SIGEP-Turnos (nivel SUPER_ADMIN).
 */
const configuracionGlobalSchema = new mongoose.Schema(
    {
        nombrePlataforma: {
            type: String,
            default: 'SIGEP-Turnos SaaS',
            trim: true
        },
        versionSistema: {
            type: String,
            default: '2.5.0',
            trim: true
        },
        emailSoporte: {
            type: String,
            default: 'soporte@sigepturnos.com',
            trim: true
        },
        telefonoSoporte: {
            type: String,
            default: '+57 300 000 0000',
            trim: true
        },
        modoMantenimiento: {
            type: Boolean,
            default: false
        },
        mensajeMantenimiento: {
            type: String,
            default: 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.'
        },
        permitirRegistroEntidades: {
            type: Boolean,
            default: false
        },
        frecuenciaBackupsGlobal: {
            type: String,
            enum: ['Diario', 'Semanal', 'Mensual'],
            default: 'Diario'
        },
        diasAlertaVencimientoLicencia: {
            type: Number,
            default: 15,
            min: 1
        },
        notificacionesEmailHabilitadas: {
            type: Boolean,
            default: true
        },
        limiteMaximoEntidades: {
            type: Number,
            default: 100
        }
    },
    {
        timestamps: true,
        collection: 'configuracion_global'
    }
);

module.exports = mongoose.model('ConfiguracionGlobal', configuracionGlobalSchema);
