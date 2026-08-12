const Entidad = require('../models/Entidad');
const Usuario = require('../models/Usuario');
const Ventanilla = require('../models/Ventanilla');
const Tramite = require('../models/Tramite');
const Licencia = require('../models/Licencia');

/**
 * Obtiene el resumen de consumo de recursos vs límites para una entidad.
 * @param {string} entidadId 
 * @returns {Promise<Object>}
 */
const getConsumoEntidad = async (entidadId) => {
    try {
        const [entidad, totalUsuarios, totalVentanillas, totalTramites, licencia] = await Promise.all([
            Entidad.findById(entidadId).lean(),
            Usuario.countDocuments({ entidadId }),
            Ventanilla.countDocuments({ entidadId }),
            Tramite.countDocuments({ entidadId }),
            Licencia.findOne({ entidadId, estado: 'activa' }).lean()
        ]);

        if (!entidad) return null;

        // Los límites provienen de la entidad o de la licencia activa si existe
        const limiteUsuarios = licencia?.limiteUsuarios || entidad.cantidadMaximaUsuarios || 10;
        const limiteVentanillas = licencia?.limiteVentanillas || entidad.cantidadMaximaVentanillas || 5;
        const limiteTramites = licencia?.limiteTramites || entidad.cantidadMaximaTramites || 15;

        return {
            usuarios: {
                actual: totalUsuarios,
                limite: limiteUsuarios,
                disponible: Math.max(0, limiteUsuarios - totalUsuarios),
                alcanzado: totalUsuarios >= limiteUsuarios
            },
            ventanillas: {
                actual: totalVentanillas,
                limite: limiteVentanillas,
                disponible: Math.max(0, limiteVentanillas - totalVentanillas),
                alcanzado: totalVentanillas >= limiteVentanillas
            },
            tramites: {
                actual: totalTramites,
                limite: limiteTramites,
                disponible: Math.max(0, limiteTramites - totalTramites),
                alcanzado: totalTramites >= limiteTramites
            }
        };
    } catch (error) {
        console.error('Error al calcular consumo de límites:', error.message);
        return null;
    }
};

/**
 * Valida si se puede crear un nuevo recurso del tipo indicado.
 * @param {string} entidadId 
 * @param {'usuario'|'ventanilla'|'tramite'} tipoRecurso 
 * @returns {Promise<{permitido: boolean, mensaje?: string}>}
 */
const validarLimite = async (entidadId, tipoRecurso) => {
    if (!entidadId) return { permitido: true };

    const consumo = await getConsumoEntidad(entidadId);
    if (!consumo) return { permitido: true };

    if (tipoRecurso === 'usuario' && consumo.usuarios.alcanzado) {
        return {
            permitido: false,
            mensaje: `Has alcanzado el límite de usuarios permitidos en tu plan (${consumo.usuarios.actual}/${consumo.usuarios.limite}). Contacta al administrador de la plataforma para ampliar tu suscripción.`
        };
    }

    if (tipoRecurso === 'ventanilla' && consumo.ventanillas.alcanzado) {
        return {
            permitido: false,
            mensaje: `Has alcanzado el límite de ventanillas permitidas en tu plan (${consumo.ventanillas.actual}/${consumo.ventanillas.limite}). Contacta al administrador de la plataforma para ampliar tu suscripción.`
        };
    }

    if (tipoRecurso === 'tramite' && consumo.tramites.alcanzado) {
        return {
            permitido: false,
            mensaje: `Has alcanzado el límite de trámites permitidos en tu plan (${consumo.tramites.actual}/${consumo.tramites.limite}). Contacta al administrador de la plataforma para ampliar tu suscripción.`
        };
    }

    return { permitido: true };
};

module.exports = { getConsumoEntidad, validarLimite };
