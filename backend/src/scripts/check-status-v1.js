const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Ventanilla = require('../models/Ventanilla');
    const Usuario = require('../models/Usuario');
    
    const v1 = await Ventanilla.findOne({ numero: '1' }).populate('operador');
    console.log('--- ESTADO DE VENTANILLA 1 ---');
    console.log('ID:', v1?._id);
    console.log('Numero:', v1?.numero);
    console.log('Nombre:', v1?.nombre);
    console.log('Estado:', v1?.estado);
    console.log('Operador asignado:', v1?.operador?.nombre, v1?.operador?.apellido, `(${v1?.operador?.email})`);
    
    console.log('\n--- OPERADORES DE NEIVA ---');
    const ops = await Usuario.find({ entidadId: v1?.entidadId });
    for (const op of ops) {
        console.log(`- ${op.nombre} ${op.apellido} | ${op.email} | Rol: ${op.rol} | Ventanilla: ${op.ventanilla}`);
    }
    
    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
