const express = require('express');
const cors = require('cors');
const path = require('path'); // 1. IMPORTAMOS 'PATH' PARA MANEJAR RUTAS DE CARPETAS
require('dotenv').config();
const rutasGeneral = require('./rutas/rutasGeneral');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// TUS RUTAS NORMALES
app.use('/api/general', rutasGeneral);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor LifeOS listo en el puerto ${PORT}`);
});