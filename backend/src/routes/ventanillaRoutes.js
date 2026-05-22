const express = require('express');
const router = express.Router();
const ventanillaController = require('../controllers/ventanillaController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Cualquier usuario autenticado puede listar las ventanillas (para elegir su ventanilla al iniciar)
router.get('/', protect, ventanillaController.getVentanillas);
router.get('/:id', protect, ventanillaController.getVentanillaById);

// Solo el rol ADMINISTRADOR puede crear, editar y eliminar ventanillas físicas
router.post('/', protect, authorize('ADMINISTRADOR'), ventanillaController.createVentanilla);
router.put('/:id', protect, authorize('ADMINISTRADOR'), ventanillaController.updateVentanilla);
router.delete('/:id', protect, authorize('ADMINISTRADOR'), ventanillaController.deleteVentanilla);

module.exports = router;
