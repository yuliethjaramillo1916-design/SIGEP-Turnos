require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        let usuario = await Usuario.findOne({ email: 'superadmin@sigep.com' });
        if (!usuario) {
            usuario = new Usuario({
                nombre: 'Super',
                apellido: 'Admin',
                email: 'superadmin@sigep.com',
                password: 'superadmin123', // pre('save') genera el salt y hash limpio
                rol: 'SUPER_ADMIN',
                estado: true,
                entidadId: null
            });
            await usuario.save();
            console.log('✅ Usuario SuperAdmin creado con contraseña: superadmin123');
        } else {
            // Asignar en texto plano para que el hook pre('save') lo encripte una sola vez
            usuario.password = 'superadmin123';
            usuario.rol = 'SUPER_ADMIN';
            usuario.estado = true;
            usuario.entidadId = null;
            await usuario.save();
            console.log('✅ Contraseña de SuperAdmin actualizada con éxito a: superadmin123');
        }

        // Verificación inmediata con bcrypt.compare
        const verificacion = await bcrypt.compare('superadmin123', usuario.password);
        console.log('Verificación de contraseña superadmin123:', verificacion ? 'CORRECTA ✅' : 'FALLO ❌');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error al actualizar contraseña:', err);
        process.exit(1);
    }
}

resetPassword();
