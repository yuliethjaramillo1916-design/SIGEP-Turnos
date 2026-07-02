const Configuracion = require('../models/Configuracion');

exports.getConfiguracion = async (req, res) => {
    try {
        const config = await Configuracion.findOne({ entidadId: req.user.entidadId });
        if (!config) {
            // Devolver configuración vacía por defecto si aún no existe
            return res.status(200).json({});
        }
        res.status(200).json(config);
    } catch (error) {
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
