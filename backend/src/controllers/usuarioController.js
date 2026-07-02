const Usuario = require('../models/Usuario');
const Ventanilla = require('../models/Ventanilla');
const bcrypt = require('bcryptjs');

// Helper para obtener el filtro según el rol del usuario
const getQueryFilter = (user) => {
    return user.rol === 'SUPER_ADMIN' ? {} : { entidadId: user.entidadId };
};

// @desc    Obtener todos los usuarios
// @route   GET /api/usuarios
// @access  Privado (ADMINISTRADOR)
exports.getUsuarios = async (req, res) => {
    try {
        const query = getQueryFilter(req.user);
        const usuarios = await Usuario.find(query).select('-password').populate('ventanilla');
        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener usuario por ID
// @route   GET /api/usuarios/:id
// @access  Privado (ADMINISTRADOR)
exports.getUsuarioById = async (req, res) => {
    try {
        const query = { _id: req.params.id, ...getQueryFilter(req.user) };
        const usuario = await Usuario.findOne(query).select('-password').populate('ventanilla');
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado o no tiene permisos para acceder a este recurso' });
        }
        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Crear usuario
// @route   POST /api/usuarios
// @access  Privado (ADMINISTRADOR)
exports.createUsuario = async (req, res) => {
    const { nombre, apellido, email, password, rol, estado, ventanilla } = req.body;
    try {
        // La entidadId será la de la petición si es SUPER_ADMIN, sino la del token
        const targetEntidadId = req.user.rol === 'SUPER_ADMIN' ? req.body.entidadId : req.user.entidadId;

        // Validar si el email ya existe en esa entidad
        const userExists = await Usuario.findOne({ email, entidadId: targetEntidadId });
        if (userExists) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado en esta entidad' });
        }

        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            email,
            password,
            rol,
            estado,
            ventanilla: ventanilla || null,
            entidadId: targetEntidadId || null
        });

        const usuarioGuardado = await nuevoUsuario.save();

        // Sincronizar relación con Ventanilla si se asignó una
        if (ventanilla) {
            // Validar que la ventanilla pertenezca a la misma entidad
            const ventanillaValida = await Ventanilla.findOne({ _id: ventanilla, entidadId: targetEntidadId });
            if (ventanillaValida) {
                // Desvincular este usuario de cualquier otra ventanilla
                await Ventanilla.updateMany(
                    { operador: usuarioGuardado._id, _id: { $ne: ventanilla }, entidadId: targetEntidadId },
                    { $unset: { operador: 1 } }
                );
                // Si la ventanilla elegida ya tenía otro operador, desvincularlo a él
                if (ventanillaValida.operador) {
                    await Usuario.findOneAndUpdate({ _id: ventanillaValida.operador, entidadId: targetEntidadId }, { ventanilla: null });
                }
                // Vincular el usuario a la nueva ventanilla
                await Ventanilla.findOneAndUpdate({ _id: ventanilla, entidadId: targetEntidadId }, { operador: usuarioGuardado._id });
            }
        }

        await usuarioGuardado.populate('ventanilla');

        // Quitar password de la respuesta
        const userResponse = usuarioGuardado.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Actualizar usuario
// @route   PUT /api/usuarios/:id
// @access  Privado (ADMINISTRADOR)
exports.updateUsuario = async (req, res) => {
    const { nombre, apellido, email, password, rol, estado, ventanilla } = req.body;
    try {
        const query = { _id: req.params.id, ...getQueryFilter(req.user) };
        const usuario = await Usuario.findOne(query);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado o no tiene permisos para acceder a este recurso' });
        }

        const targetEntidadId = usuario.entidadId;

        // Si se cambia el email, validar que no esté en uso en esa entidad
        if (email && email !== usuario.email) {
            const emailExists = await Usuario.findOne({ email, entidadId: targetEntidadId });
            if (emailExists) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado en esta entidad' });
            }
            usuario.email = email;
        }

        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (rol) usuario.rol = rol;
        if (estado !== undefined) usuario.estado = estado;
        if (ventanilla !== undefined) usuario.ventanilla = ventanilla || null;
        
        // El administrador no puede cambiar la entidadId de un usuario a menos que sea SUPER_ADMIN (no implementado en este controller genérico para no complicar, asumo que se editará la entidad mediante un endpoint especial si hace falta, o el targetEntidadId se respeta)

        // Si se proporciona una contraseña, se encripta
        if (password && password.trim() !== '') {
            usuario.password = password; // pre('save') hook se ejecutará y la encriptará
        }

        const usuarioActualizado = await usuario.save();

        // Sincronizar relación con Ventanilla si cambió el campo ventanilla
        if (ventanilla !== undefined && targetEntidadId) {
            const newVentId = ventanilla || null;

            // 1. Quitar el operador de cualquier otra ventanilla que tuviera a este usuario
            await Ventanilla.updateMany(
                { operador: usuarioActualizado._id, _id: { $ne: newVentId }, entidadId: targetEntidadId },
                { $unset: { operador: 1 } }
            );

            if (newVentId) {
                const ventanillaValida = await Ventanilla.findOne({ _id: newVentId, entidadId: targetEntidadId });
                if (ventanillaValida) {
                    // 2. Si esa ventanilla ya tenía otro operador, desvincular al operador anterior de su ventanilla
                    if (ventanillaValida.operador && String(ventanillaValida.operador) !== String(usuarioActualizado._id)) {
                        await Usuario.findOneAndUpdate({ _id: ventanillaValida.operador, entidadId: targetEntidadId }, { ventanilla: null });
                    }

                    // 3. Establecer el operador en la nueva ventanilla
                    await Ventanilla.findOneAndUpdate({ _id: newVentId, entidadId: targetEntidadId }, { operador: usuarioActualizado._id });
                }
            }
        }

        await usuarioActualizado.populate('ventanilla');
        
        const userResponse = usuarioActualizado.toObject();
        delete userResponse.password;

        res.status(200).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Eliminar usuario
// @route   DELETE /api/usuarios/:id
// @access  Privado (ADMINISTRADOR)
exports.deleteUsuario = async (req, res) => {
    try {
        const query = { _id: req.params.id, ...getQueryFilter(req.user) };
        const usuario = await Usuario.findOne(query);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado o no tiene permisos para acceder a este recurso' });
        }

        // Evitar que el administrador se elimine a sí mismo
        if (usuario._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador' });
        }

        await Usuario.findOneAndDelete(query);
        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
