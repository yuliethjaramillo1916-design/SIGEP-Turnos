require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('superadmin123', salt);
        
        let usuario = await Usuario.findOne({ email: 'superadmin@sigep.com' });
        if (!usuario) {
            usuario = new Usuario({
                nombre: 'Super',
                apellido: 'Admin',
                email: 'superadmin@sigep.com',
                password: hash,
                rol: 'SUPER_ADMIN',
                estado: true,
                entidadId: null
            });
            await usuario.save();
            console.log('✅ Usuario SuperAdmin creado con contraseña superadmin123');
        } else {
            usuario.password = hash;
            usuario.rol = 'SUPER_ADMIN';
            usuario.estado = true;
            usuario.entidadId = null;
            await usuario.save();
            console.log('✅ Contraseña de SuperAdmin actualizada exitosamente a: superadmin123');
        }
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al actualizar contraseña:', err);
        process.exit(1);
    }
}

resetPassword();
