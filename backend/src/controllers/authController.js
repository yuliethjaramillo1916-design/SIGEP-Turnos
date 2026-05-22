const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Generar un JWT
const generateToken = (id) => {
    return jwt.sign(
        { id }, 
        process.env.JWT_SECRET || 'sigep_turnos_secret_key_2026_super_secure', 
        { expiresIn: '8h' }
    );
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Público
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validar campos
        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, ingrese correo y contraseña' });
        }

        // Buscar usuario por correo
        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Validar si el usuario está activo
        if (!usuario.estado) {
            return res.status(403).json({ message: 'Tu cuenta ha sido desactivada. Comunícate con el administrador.' });
        }

        // Comparar contraseñas
        const isMatch = await usuario.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Responder con datos y token
        res.status(200).json({
            _id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol,
            token: generateToken(usuario._id)
        });

    } catch (error) {
        console.error('Error en Login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// @desc    Obtener perfil de usuario logueado
// @route   GET /api/auth/me
// @access  Privado
exports.getMe = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.user._id).select('-password');
        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error en GetMe:', error);
        res.status(500).json({ message: 'Error al obtener datos del perfil' });
    }
};
