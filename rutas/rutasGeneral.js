const express = require('express');
const router = express.Router();

// Controladores
const generalController = require('../controladores/generalController');
const perfilController = require('../controladores/perfilController');

// Rutas de Auth
router.post('/registro', generalController.registrarUsuarioGeneral);
router.post('/login', generalController.loginUsuario);

// Rutas de Perfil
router.get('/perfil/:id', perfilController.obtenerPerfil);

// ¡AQUÍ ESTÁ LA MAGIA! Agregamos upload.single('foto') como interceptor
router.put('/perfil/:id', perfilController.upload.single('foto'), perfilController.actualizarPerfil);

module.exports = router;