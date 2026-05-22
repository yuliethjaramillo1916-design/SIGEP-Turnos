const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Middleware para proteger rutas (verificar JWT)
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token del encabezado
            token = req.headers.authorization.split(' ')[1];

            // Verificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sigep_turnos_secret_key_2026_super_secure');

            // Obtener el usuario del token (excluyendo la contraseña)
            req.user = await Usuario.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Usuario no encontrado con este token' });
            }

            if (!req.user.estado) {
                return res.status(403).json({ message: 'Este usuario está desactivado' });
            }

            next();
        } catch (error) {
            console.error('Error en autenticación JWT:', error);
            return res.status(401).json({ message: 'No autorizado, token inválido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó ningún token' });
    }
};

// Middleware para autorizar roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ 
                message: `El rol '${req.user.rol}' no tiene permisos para acceder a este recurso` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
