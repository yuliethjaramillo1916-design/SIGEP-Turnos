const AuditoriaGlobal = require('../models/AuditoriaGlobal');

/**
 * Registra una acción administrativa en la colección AuditoriaGlobal
 * @param {Object} params
 * @param {string} params.accion - Tipo de acción (CREAR_ENTIDAD, EDITAR_PLAN, etc.)
 * @param {string} [params.entidadAfectada] - ID de la entidad afectada si aplica
 * @param {string} params.autor - ID del usuario autor (SUPER_ADMIN)
 * @param {string} [params.detalles] - Descripción o JSON con detalles del cambio
 * @param {Object} [params.req] - Objeto Request de Express para extraer IP y User Agent
 */
const registrarAuditoria = async ({ accion, entidadAfectada = null, autor, detalles = '', req = null }) => {
    try {
        let ip = '';
        let userAgent = '';

        if (req) {
            ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            userAgent = req.headers['user-agent'] || '';
        }

        await AuditoriaGlobal.create({
            accion,
            entidadAfectada: entidadAfectada || null,
            autor,
            detalles: typeof detalles === 'object' ? JSON.stringify(detalles) : String(detalles),
            ip,
            userAgent
        });
    } catch (error) {
        console.error('Error al registrar auditoría global:', error.message);
    }
};

module.exports = { registrarAuditoria };
