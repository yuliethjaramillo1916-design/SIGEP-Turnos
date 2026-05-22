const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Proteger todas las rutas de usuarios y restringirlas al rol ADMINISTRADOR
router.use(protect);
router.use(authorize('ADMINISTRADOR'));

router.get('/', usuarioController.getUsuarios);
router.get('/:id', usuarioController.getUsuarioById);
router.post('/', usuarioController.createUsuario);
router.put('/:id', usuarioController.updateUsuario);
router.delete('/:id', usuarioController.deleteUsuario);

module.exports = router;
