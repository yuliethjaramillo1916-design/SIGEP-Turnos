const Entidad = require('../models/Entidad');

// @desc    Obtener entidades activas para el selector público (Login)
// @route   GET /api/entidades/public
// @access  Público
exports.getEntidadesPublicas = async (req, res) => {
    try {
        // Solo traemos entidades activas y los campos mínimos necesarios para el UI
        const entidades = await Entidad.find({ estado: 'activa' })
            .select('_id nombre logo prefijoCodigo')
            .lean();
            
        res.status(200).json(entidades);
    } catch (error) {
        console.error('Error al obtener entidades públicas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
