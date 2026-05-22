const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Usuario = require('./src/models/Usuario');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB\n');

        const email = 'paola@sigep.com';
        const password = 'admin123456';

        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            console.log('❌ Usuario NO encontrado:', email);
            const todos = await Usuario.find({}, 'email rol estado');
            console.log('\nUsuarios en la BD:');
            todos.forEach(u => console.log(` - ${u.email} | ${u.rol} | activo: ${u.estado}`));
        } else {
            console.log('✅ Usuario encontrado:', usuario.email);
            console.log('   Estado:', usuario.estado);
            console.log('   Hash:', usuario.password);
            const match = await bcrypt.compare(password, usuario.password);
            console.log('   bcrypt.compare("admin123456"):', match);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDB();
