const mongoose = require('mongoose');

/**
 * Modelo: AuditoriaGlobal
 * Registra todas las acciones administrativas y eventos sensibles ejecutados por SUPER_ADMIN o el sistema.
 */
const auditoriaGlobalSchema = new mongoose.Schema(
    {
        accion: {
            type: String,
            required: [true, 'La acción es obligatoria'],
            enum: [
                'CREAR_ENTIDAD',
                'EDITAR_ENTIDAD',
                'CAMBIAR_ESTADO_ENTIDAD',
                'ARCHIVAR_ENTIDAD',
                'REACTIVAR_ENTIDAD',
                'CREAR_ADMIN_ENTIDAD',
                'CREAR_PLAN',
                'EDITAR_PLAN',
                'CAMBIAR_ESTADO_PLAN',
                'CREAR_LICENCIA',
                'RENOVAR_LICENCIA',
                'SUSPENDER_LICENCIA',
                'CONFIGURACION_GLOBAL_MODIFICADA',
                'LOGIN_SUPER_ADMIN',
                'LOGOUT_SUPER_ADMIN',
                'BACKUP_EJECUTADO',
                'ALERTA_SISTEMA'
            ]
        },
        entidadAfectada: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Entidad',
            default: null
        },
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: [true, 'El autor es obligatorio']
        },
        detalles: {
            type: String,
            default: ''
        },
        ip: {
            type: String,
            default: ''
        },
        userAgent: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true,
        collection: 'auditoria_global'
    }
);

auditoriaGlobalSchema.index({ accion: 1 });
auditoriaGlobalSchema.index({ entidadAfectada: 1 });
auditoriaGlobalSchema.index({ autor: 1 });
auditoriaGlobalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditoriaGlobal', auditoriaGlobalSchema);
