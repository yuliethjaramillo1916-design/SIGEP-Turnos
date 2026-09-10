const Configuracion = require('../models/Configuracion');
const Entidad = require('../models/Entidad');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'sigep_turnos_secret_key_2026_super_secure';

exports.getConfiguracion = async (req, res) => {
    try {
        let entidadId = req.user?.entidadId || req.query?.entidadId;

        // Si no está en req.user (ruta pública sin middleware protect), intentar leer del token Authorization si existe
        if (!entidadId && req.headers?.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                entidadId = decoded.entidadId;
            } catch (e) {}
        }

        let config = null;
        if (entidadId) {
            config = await Configuracion.findOne({ entidadId });
        }
        if (!config) {
            config = await Configuracion.findOne();
        }

        let result = config ? (config.toObject ? config.toObject() : { ...config }) : {};

        // Si la entidad tiene horarioAtencion configurado y no está en config, usarlo como fallback
        if (!result.horario_atencion && entidadId) {
            const ent = await Entidad.findById(entidadId).lean();
            if (ent && ent.horarioAtencion) {
                result.horario_atencion = ent.horarioAtencion;
            }
        }

        // Si aún no tiene horario definido, asignar el horario estándar institucional
        if (!result.horario_atencion) {
            result.horario_atencion = '08:00 - 18:00';
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error en getConfiguracion:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateConfiguracion = async (req, res) => {
    try {
        let config = await Configuracion.findOne({ entidadId: req.user.entidadId });
        if (config) {
            config = await Configuracion.findOneAndUpdate(
                { _id: config._id, entidadId: req.user.entidadId },
                req.body,
                { new: true }
            );
        } else {
            config = new Configuracion({
                ...req.body,
                entidadId: req.user.entidadId
            });
            await config.save();
        }
        res.status(200).json(config);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
