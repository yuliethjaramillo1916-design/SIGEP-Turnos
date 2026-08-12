const Tramite = require('../models/Tramite');
const { validarLimite } = require('../services/limitesService');

exports.getTramites = async (req, res) => {
    try {
        const tramites = await Tramite.find({ entidadId: req.user.entidadId });
        res.status(200).json(tramites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTramiteById = async (req, res) => {
    try {
        const tramite = await Tramite.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!tramite) return res.status(404).json({ message: 'Trámite no encontrado o no tiene permisos para acceder a este recurso' });
        res.status(200).json(tramite);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createTramite = async (req, res) => {
    try {
        if (req.user.entidadId && req.user.rol !== 'SUPER_ADMIN') {
            const validacion = await validarLimite(req.user.entidadId, 'tramite');
            if (!validacion.permitido) {
                return res.status(403).json({ message: validacion.mensaje });
            }
        }

        const nuevoTramite = new Tramite({
            ...req.body,
            entidadId: req.user.entidadId
        });
        const tramiteGuardado = await nuevoTramite.save();
        res.status(201).json(tramiteGuardado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTramite = async (req, res) => {
    try {
        const tramiteActualizado = await Tramite.findOneAndUpdate(
            { _id: req.params.id, entidadId: req.user.entidadId },
            req.body,
            { new: true }
        );
        if (!tramiteActualizado) return res.status(404).json({ message: 'Trámite no encontrado o no tiene permisos para acceder a este recurso' });
        res.status(200).json(tramiteActualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTramite = async (req, res) => {
    try {
        const tramiteEliminado = await Tramite.findOneAndDelete({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!tramiteEliminado) return res.status(404).json({ message: 'Trámite no encontrado o no tiene permisos para acceder a este recurso' });
        res.status(200).json({ message: 'Trámite eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
