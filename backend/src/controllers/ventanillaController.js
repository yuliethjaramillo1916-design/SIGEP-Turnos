const Ventanilla = require('../models/Ventanilla');
const { validarLimite } = require('../services/limitesService');

exports.getVentanillas = async (req, res) => {
    try {
        const ventanillas = await Ventanilla.find({ entidadId: req.user.entidadId }).populate('operador');
        res.status(200).json(ventanillas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getVentanillaById = async (req, res) => {
    try {
        const ventanilla = await Ventanilla.findOne({ _id: req.params.id, entidadId: req.user.entidadId }).populate('operador');
        if (!ventanilla) return res.status(404).json({ message: 'Ventanilla no encontrada o no tiene permisos para acceder a este recurso' });
        res.status(200).json(ventanilla);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createVentanilla = async (req, res) => {
    try {
        if (req.user.entidadId && req.user.rol !== 'SUPER_ADMIN') {
            const validacion = await validarLimite(req.user.entidadId, 'ventanilla');
            if (!validacion.permitido) {
                return res.status(403).json({ message: validacion.mensaje });
            }
        }

        const nuevaVentanilla = new Ventanilla({
            ...req.body,
            entidadId: req.user.entidadId
        });
        const ventanillaGuardada = await nuevaVentanilla.save();
        res.status(201).json(ventanillaGuardada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateVentanilla = async (req, res) => {
    try {
        const oldVentanilla = await Ventanilla.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!oldVentanilla) return res.status(404).json({ message: 'Ventanilla no encontrada o no tiene permisos' });

        const ventanillaActualizada = await Ventanilla.findOneAndUpdate(
            { _id: req.params.id, entidadId: req.user.entidadId },
            req.body,
            { new: true }
        ).populate('operador');
        
        // Sincronizar relación con Usuario si cambió el operador
        if (req.body.operador !== undefined) {
            const Usuario = require('../models/Usuario');
            const newOperatorId = req.body.operador || null;
            const oldOperatorId = oldVentanilla.operador ? oldVentanilla.operador : null;

            if (String(oldOperatorId) !== String(newOperatorId)) {
                // Desvincular operador antiguo de su campo ventanilla
                if (oldOperatorId) {
                    await Usuario.findOneAndUpdate({ _id: oldOperatorId, entidadId: req.user.entidadId }, { ventanilla: null });
                }
                // Vincular nuevo operador a esta ventanilla
                if (newOperatorId) {
                    // Desvincular el nuevo operador de cualquier otra ventanilla que tuviera
                    await Ventanilla.updateMany(
                        { operador: newOperatorId, _id: { $ne: ventanillaActualizada._id }, entidadId: req.user.entidadId },
                        { $unset: { operador: 1 } }
                    );
                    await Usuario.findOneAndUpdate({ _id: newOperatorId, entidadId: req.user.entidadId }, { ventanilla: ventanillaActualizada._id });
                }
            }
        }

        res.status(200).json(ventanillaActualizada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteVentanilla = async (req, res) => {
    try {
        const ventanillaEliminada = await Ventanilla.findOneAndDelete({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!ventanillaEliminada) return res.status(404).json({ message: 'Ventanilla no encontrada o no tiene permisos' });
        
        // Desvincular la ventanilla eliminada de cualquier usuario que la tuviera asignada
        const Usuario = require('../models/Usuario');
        await Usuario.updateMany({ ventanilla: req.params.id, entidadId: req.user.entidadId }, { ventanilla: null });

        res.status(200).json({ message: 'Ventanilla eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
