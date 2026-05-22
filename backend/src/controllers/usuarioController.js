const Usuario = require('../models/Usuario');
const Ventanilla = require('../models/Ventanilla');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los usuarios
// @route   GET /api/usuarios
// @access  Privado (ADMINISTRADOR)
exports.getUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find().select('-password').populate('ventanilla');
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
        const usuario = await Usuario.findById(req.params.id).select('-password').populate('ventanilla');
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
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
        // Validar si el email ya existe
        const userExists = await Usuario.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            email,
            password,
            rol,
            estado,
            ventanilla: ventanilla || null
        });

        const usuarioGuardado = await nuevoUsuario.save();

        // Sincronizar relación con Ventanilla si se asignó una
        if (ventanilla) {
            // Desvincular este usuario de cualquier otra ventanilla
            await Ventanilla.updateMany(
                { operador: usuarioGuardado._id, _id: { $ne: ventanilla } },
                { $unset: { operador: 1 } }
            );
            // Si la ventanilla elegida ya tenía otro operador, desvincularlo a él
            const targetVent = await Ventanilla.findById(ventanilla);
            if (targetVent && targetVent.operador) {
                await Usuario.findByIdAndUpdate(targetVent.operador, { ventanilla: null });
            }
            // Vincular el usuario a la nueva ventanilla
            await Ventanilla.findByIdAndUpdate(ventanilla, { operador: usuarioGuardado._id });
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
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si se cambia el email, validar que no esté en uso
        if (email && email !== usuario.email) {
            const emailExists = await Usuario.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
            }
            usuario.email = email;
        }

        if (nombre) usuario.nombre = nombre;
        if (apellido) usuario.apellido = apellido;
        if (rol) usuario.rol = rol;
        if (estado !== undefined) usuario.estado = estado;
        if (ventanilla !== undefined) usuario.ventanilla = ventanilla || null;

        // Si se proporciona una contraseña, se encripta
        if (password && password.trim() !== '') {
            usuario.password = password; // pre('save') hook se ejecutará y la encriptará
        }

        const usuarioActualizado = await usuario.save();

        // Sincronizar relación con Ventanilla si cambió el campo ventanilla
        if (ventanilla !== undefined) {
            const newVentId = ventanilla || null;

            // 1. Quitar el operador de cualquier otra ventanilla que tuviera a este usuario
            await Ventanilla.updateMany(
                { operador: usuarioActualizado._id, _id: { $ne: newVentId } },
                { $unset: { operador: 1 } }
            );

            if (newVentId) {
                // 2. Si esa ventanilla ya tenía otro operador, desvincular al operador anterior de su ventanilla
                const targetVent = await Ventanilla.findById(newVentId);
                if (targetVent && targetVent.operador && String(targetVent.operador) !== String(usuarioActualizado._id)) {
                    await Usuario.findByIdAndUpdate(targetVent.operador, { ventanilla: null });
                }

                // 3. Establecer el operador en la nueva ventanilla
                await Ventanilla.findByIdAndUpdate(newVentId, { operador: usuarioActualizado._id });
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
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Evitar que el administrador se elimine a sí mismo
        if (usuario._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta de administrador' });
        }

        await Usuario.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
