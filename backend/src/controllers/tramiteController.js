const Tramite = require('../models/Tramite');

exports.getTramites = async (req, res) => {
    try {
        const tramites = await Tramite.find();
        res.status(200).json(tramites);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getTramiteById = async (req, res) => {
    try {
        const tramite = await Tramite.findById(req.params.id);
        if (!tramite) return res.status(404).json({ message: 'Trámite no encontrado' });
        res.status(200).json(tramite);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createTramite = async (req, res) => {
    try {
        const nuevoTramite = new Tramite(req.body);
        const tramiteGuardado = await nuevoTramite.save();
        res.status(201).json(tramiteGuardado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateTramite = async (req, res) => {
    try {
        const tramiteActualizado = await Tramite.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tramiteActualizado) return res.status(404).json({ message: 'Trámite no encontrado' });
        res.status(200).json(tramiteActualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteTramite = async (req, res) => {
    try {
        const tramiteEliminado = await Tramite.findByIdAndDelete(req.params.id);
        if (!tramiteEliminado) return res.status(404).json({ message: 'Trámite no encontrado' });
        res.status(200).json({ message: 'Trámite eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
