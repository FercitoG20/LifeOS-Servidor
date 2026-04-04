const db = require('../configuracion/baseDeDatos');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==========================================
// CONFIGURACIÓN DE MULTER
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const userId = req.params.id || req.body.id || 'unknown';
        cb(null, `usuario_${userId}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo no es una imagen válida'), false);
    }
};

exports.upload = multer({ storage: storage, fileFilter: fileFilter });

// ==========================================
// 1. OBTENER DATOS DEL PERFIL
// ==========================================
exports.obtenerPerfil = async (req, res) => {
    try {
        const id = req.params.id; 
        const [rows] = await db.execute(
            'SELECT id, nombres, apellido_paterno, apellido_materno, edad, sexo, email, ciudad_pais, foto_perfil FROM usuarios WHERE id = ?', 
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: true, mensaje: "Usuario no encontrado" });
        res.json({ error: false, perfil: rows[0] });
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        res.status(500).json({ error: true, mensaje: "Error interno" });
    }
};

// ==========================================
// 2. ACTUALIZAR PERFIL (CON BLINDAJE)
// ==========================================
exports.actualizarPerfil = async (req, res) => {
    try {
        const id = req.params.id;
        const { nombres, apellido_paterno, apellido_materno, ciudad_pais, foto_link } = req.body;
        
        console.log(`\n============================`);
        console.log(`🛠️ INICIANDO ACTUALIZACIÓN`);
        console.log(`👤 ID DEL USUARIO:`, id);

        // 1. BLINDAJE: Si el ID viene como "undefined", rebotamos la petición
        if (!id || id === 'undefined') {
            return res.status(400).json({ error: true, mensaje: "ID de usuario inválido o no detectado." });
        }

        let fotoFinal = null;

        // 2. Lógica de Foto Dual
        if (req.file) {
            fotoFinal = `/uploads/${req.file.filename}`;
            console.log("📸 FOTO GUARDADA EN CARPETA:", fotoFinal);
        } else if (foto_link && foto_link.startsWith('http')) {
            fotoFinal = foto_link;
            console.log("🔗 LINK RECIBIDO:", fotoFinal);
        } else {
            const [user] = await db.execute('SELECT foto_perfil FROM usuarios WHERE id = ?', [id]);
            if(user.length > 0) {
                fotoFinal = user[0].foto_perfil;
            }
        }

        const sql = `
            UPDATE usuarios SET 
                nombres = ?, 
                apellido_paterno = ?, 
                apellido_materno = ?, 
                ciudad_pais = ?, 
                foto_perfil = ? 
            WHERE id = ?
        `;

        // 3. Ejecutamos MySQL
        const [resultadoBD] = await db.execute(sql, [
            nombres || null, 
            apellido_paterno || null, 
            apellido_materno || null, 
            ciudad_pais || null, 
            fotoFinal || null, 
            id
        ]);

        console.log("⚙️ FILAS AFECTADAS EN BD:", resultadoBD.affectedRows);
        console.log(`============================\n`);

        // 4. BLINDAJE DE FALSO POSITIVO: Si afectó 0 filas, el ID no existe en la tabla
        if (resultadoBD.affectedRows === 0) {
            return res.status(404).json({ error: true, mensaje: "El perfil no se guardó. El ID de usuario no existe en la base de datos." });
        }

        res.json({ error: false, mensaje: "Núcleo sincronizado", foto_actualizada: fotoFinal });
    } catch (error) {
        console.error("❌ Error al actualizar perfil:", error);
        res.status(500).json({ error: true, mensaje: "Error al intentar guardar en la base de datos." });
    }
};