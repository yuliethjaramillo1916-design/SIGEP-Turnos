const express = require('express');
const router = express.Router();
const tramiteController = require('../controllers/tramiteController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Todos los usuarios autenticados pueden ver la lista de trámites
router.get('/', protect, tramiteController.getTramites);
router.get('/:id', protect, tramiteController.getTramiteById);

// Solo el rol ADMINISTRADOR puede crear, editar y eliminar trámites
router.post('/', protect, authorize('ADMINISTRADOR'), tramiteController.createTramite);
router.put('/:id', protect, authorize('ADMINISTRADOR'), tramiteController.updateTramite);
router.delete('/:id', protect, authorize('ADMINISTRADOR'), tramiteController.deleteTramite);

module.exports = router;
