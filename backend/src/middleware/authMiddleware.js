const jwt     = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const JWT_SECRET = process.env.JWT_SECRET || 'sigep_turnos_secret_key_2026_super_secure';

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3 — Multi-Entidad
//
// Cambios en `protect`:
//   - Se lee `entidadId` del token decodificado y se agrega a req.user.
//   - req.user expone: _id, nombre, apellido, email, rol, estado,
//                      ventanilla, entidadId, createdAt, updatedAt
//
// Cambios en `authorize`:
//   - SUPER_ADMIN tiene acceso total sin importar qué roles se requieran.
//
// Nota de seguridad:
//   - El entidadId que viaja en el token está firmado con JWT_SECRET.
//     Un usuario NO puede falsificarlo sin conocer la clave secreta.
//   - Los controladores usarán req.user.entidadId para filtrar datos,
//     garantizando aislamiento entre entidades.
// ─────────────────────────────────────────────────────────────────────────────

// ── Middleware: verificar JWT ─────────────────────────────────────────────────
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extraer token del encabezado Authorization
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar y decodificar el token
            const decoded = jwt.verify(token, JWT_SECRET);
            // decoded contiene: { id, nombre, rol, entidadId, iat, exp }

            // 3. Obtener el usuario completo desde la BD (excluye password)
            const usuario = await Usuario.findById(decoded.id).select('-password');

            if (!usuario) {
                return res.status(401).json({ message: 'Usuario no encontrado con este token' });
            }

            if (!usuario.estado) {
                return res.status(403).json({ message: 'Este usuario está desactivado' });
            }

            // 4. Construir req.user con todos los campos necesarios
            //    Se usa el entidadId del TOKEN (firmado) para garantizar
            //    que no puede ser manipulado desde el cliente.
            req.user = {
                _id:        usuario._id,
                id:         usuario._id,      // alias conveniente para los controladores
                nombre:     usuario.nombre,
                apellido:   usuario.apellido,
                email:      usuario.email,
                rol:        usuario.rol,
                estado:     usuario.estado,
                ventanilla: usuario.ventanilla,
                entidadId:  decoded.entidadId || usuario.entidadId || null,
                createdAt:  usuario.createdAt,
                updatedAt:  usuario.updatedAt
            };

            next();

        } catch (error) {
            console.error('Error en autenticación JWT:', error.message);
            return res.status(401).json({ message: 'No autorizado, token inválido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó ningún token' });
    }
};

// ── Middleware: autorizar por rol ────────────────────────────────────────────
/**
 * Verifica que el usuario autenticado tenga uno de los roles requeridos.
 * SUPER_ADMIN siempre tiene acceso sin importar qué roles se listen.
 *
 * Uso en rutas:
 *   router.get('/ruta', protect, authorize('ADMINISTRADOR', 'OPERADOR'), handler)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        // SUPER_ADMIN tiene acceso total al sistema
        if (req.user.rol === 'SUPER_ADMIN') {
            return next();
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                message: `El rol '${req.user.rol}' no tiene permisos para acceder a este recurso`
            });
        }

        next();
    };
};

// ── Middleware adicional: verificar que el usuario tiene entidad ──────────────
/**
 * Úsalo en rutas que requieren que el usuario pertenezca a una entidad.
 * SUPER_ADMIN pasa siempre (puede acceder a rutas de cualquier entidad).
 *
 * Uso:
 *   router.get('/ruta', protect, requireEntidad, handler)
 */
const requireEntidad = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    // SUPER_ADMIN puede operar sin entidadId propio
    if (req.user.rol === 'SUPER_ADMIN') {
        return next();
    }

    if (!req.user.entidadId) {
        return res.status(403).json({
            message: 'Tu cuenta no está asociada a ninguna entidad. Contacta al administrador del sistema.'
        });
    }

    next();
};

module.exports = { protect, authorize, requireEntidad };
