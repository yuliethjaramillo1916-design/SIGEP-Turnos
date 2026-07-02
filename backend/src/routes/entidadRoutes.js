const express = require('express');
const router = express.Router();
const entidadController = require('../controllers/entidadController');

// @route   GET /api/entidades/public
// @desc    Obtener lista pública de entidades para el login
// @access  Público
router.get('/public', entidadController.getEntidadesPublicas);

module.exports = router;
