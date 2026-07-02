const jwt     = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Entidad = require('../models/Entidad');

const JWT_SECRET = process.env.JWT_SECRET || 'sigep_turnos_secret_key_2026_super_secure';

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3 — Multi-Entidad
// generateToken ahora incluye: id, nombre, rol, entidadId
// El entidadId viaja en el token para que el middleware lo exponga en req.user
// sin necesitar consultar la BD en cada request.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera un JWT con los datos completos del usuario.
 * @param {Object} payload - { id, nombre, rol, entidadId }
 */
const generateToken = ({ id, nombre, rol, entidadId }) => {
    return jwt.sign(
        { id, nombre, rol, entidadId },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Público
exports.login = async (req, res) => {
    // ── ETAPA 5: Ahora recibimos entidadId desde el frontend
    const { email, password, entidadId } = req.body;

    try {
        // ── 1. Validar campos de entrada básicos ─────────────────────────────
        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, ingrese correo y contraseña' });
        }

        // ── 2. Búsqueda Condicional ──────────────────────────────────────────
        // Si el usuario proporcionó entidadId, buscamos por correo y entidad.
        // Si NO proporcionó (ej. SUPER_ADMIN sin seleccionar nada), busca solo por correo.
        const query = { email: email.toLowerCase().trim() };
        if (entidadId) {
            query.entidadId = entidadId;
        }

        const usuario = await Usuario.findOne(query);
        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // ── 3. Validación de Selección de Entidad ────────────────────────────
        // Los usuarios normales están obligados a proporcionar entidadId.
        // Solo el SUPER_ADMIN puede loguearse sin seleccionar entidad.
        if (usuario.rol !== 'SUPER_ADMIN' && !entidadId) {
            return res.status(400).json({ message: 'Debe seleccionar una entidad para iniciar sesión.' });
        }

        // ── 4. Validar que la cuenta esté activa ─────────────────────────────
        if (!usuario.estado) {
            return res.status(403).json({
                message: 'Tu cuenta ha sido desactivada. Comunícate con el administrador.'
            });
        }

        // ── 5. Validar contraseña ────────────────────────────────────────────
        const isMatch = await usuario.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // ── 6. Validar entidad (solo si el usuario pertenece a una) ──────────
        let entidad = null;

        if (usuario.entidadId) {
            entidad = await Entidad.findById(usuario.entidadId).lean();

            if (!entidad) {
                return res.status(403).json({
                    message: 'La entidad asociada a tu cuenta no existe. Contacta al administrador.'
                });
            }

            if (entidad.estado !== 'activa') {
                const mensajes = {
                    inactiva:   'La entidad a la que perteneces está inactiva temporalmente.',
                    suspendida: 'La entidad a la que perteneces ha sido suspendida. Contacta al administrador del sistema.'
                };
                return res.status(403).json({
                    message: mensajes[entidad.estado] || 'No tienes permiso para acceder al sistema.'
                });
            }
        }

        // ── 7. Generar JWT con entidadId incluido ───────────────────────────
        const tokenPayload = {
            id:        usuario._id,
            nombre:    usuario.nombre,
            rol:       usuario.rol,
            entidadId: usuario.entidadId || null   // null para SUPER_ADMIN
        };

        const token = generateToken(tokenPayload);

        // ── 8. Responder con datos completos ────────────────────────────────
        return res.status(200).json({
            _id:       usuario._id,
            nombre:    usuario.nombre,
            apellido:  usuario.apellido,
            email:     usuario.email,
            rol:       usuario.rol,
            entidadId: usuario.entidadId || null,
            ventanilla: usuario.ventanilla,
            // Datos de la entidad para que el frontend pueda mostrar nombre/logo
            entidad: entidad ? {
                _id:            entidad._id,
                nombre:         entidad.nombre,
                logo:           entidad.logo,
                prefijoCodigo:  entidad.prefijoCodigo
            } : null,
            token
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
        // req.user ya está disponible desde el middleware (con entidadId incluido)
        const usuario = await Usuario.findById(req.user._id)
            .select('-password')
            .populate('entidadId', 'nombre logo estado prefijoCodigo');

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error en GetMe:', error);
        res.status(500).json({ message: 'Error al obtener datos del perfil' });
    }
};
