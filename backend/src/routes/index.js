const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const tramiteRoutes = require('./tramiteRoutes');
const turnoRoutes = require('./turnoRoutes');
const ventanillaRoutes = require('./ventanillaRoutes');
const historialRoutes = require('./historialRoutes');
const reporteRoutes = require('./reporteRoutes');
const configuracionRoutes = require('./configuracionRoutes');

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/tramites', tramiteRoutes);
router.use('/turnos', turnoRoutes);
router.use('/ventanillas', ventanillaRoutes);
router.use('/historial', historialRoutes);
router.use('/reportes', reporteRoutes);
router.use('/configuracion', configuracionRoutes);

module.exports = router;
