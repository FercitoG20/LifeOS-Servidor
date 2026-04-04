const db = require('../configuracion/baseDeDatos');
const bcrypt = require('bcrypt');

/**
 * REGISTRO DE USUARIOS
 * Valida campos obligatorios, maneja duplicados y guarda en la tabla 'usuarios'.
 */
exports.registrarUsuarioGeneral = async (req, res) => {
    const { 
        tipoPerfil, 
        nombres, 
        apellidoPaterno, 
        apellidoMaterno, 
        edad, 
        sexo, 
        email, 
        ciudad, 
        password, 
        fotoPerfil 
    } = req.body;

    try {
        // 1. Validación de campos obligatorios en el servidor
        if (!email || !password || !nombres || !apellidoPaterno) {
            return res.status(400).json({ 
                error: true, 
                mensaje: "Faltan datos obligatorios (Nombre, Apellido, Email o Password)." 
            });
        }

        // 2. Verificar si el correo ya existe (Evita el error 500 de SQL)
        const [existe] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(400).json({ 
                error: true, 
                mensaje: "Este correo ya está registrado." 
            });
        }

        // 3. Obtener el ID de la categoría correspondiente
        const perfilABuscar = tipoPerfil || 'General';
        const [categoriaData] = await db.execute(
            'SELECT id FROM categorias_usuarios WHERE nombre_categoria = ?',
            [perfilABuscar]
        );

        if (categoriaData.length === 0) {
            return res.status(400).json({ error: true, mensaje: "Categoría de perfil no válida." });
        }
        const categoriaId = categoriaData[0].id;

        // 4. Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Inserción en la base de datos
        // Foto de perfil y apellido materno son opcionales (|| null)
        const sql = `INSERT INTO usuarios 
            (categoria_id, nombres, apellido_paterno, apellido_materno, edad, sexo, email, password_hash, ciudad_pais, foto_perfil) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const valores = [
            categoriaId,
            nombres,
            apellidoPaterno,
            apellidoMaterno || null,
            edad || null,
            sexo || 'Masculino',
            email,
            hashedPassword,
            ciudad || 'Puebla',
            fotoPerfil || null
        ];

        await db.execute(sql, valores);

        return res.status(201).json({ 
            error: false, 
            mensaje: "¡Registro exitoso en LifeOS!" 
        });

    } catch (error) {
        console.error("❌ Error detallado en Registro:", error);
        res.status(500).json({ 
            error: true, 
            mensaje: "Error interno al procesar el registro." 
        });
    }
};

/**
 * LOGIN DE USUARIOS
 * Verifica credenciales y actualiza el último acceso.
 */
exports.loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar usuario y unir con su categoría (JOIN)
        // Se corrigió el error de sintaxis previo
        const sql = `
            SELECT u.*, c.nombre_categoria 
            FROM usuarios u
            JOIN categorias_usuarios c ON u.categoria_id = c.id
            WHERE u.email = ?`;

        const [rows] = await db.execute(sql, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ 
                error: true, 
                mensaje: "El correo electrónico no está registrado." 
            });
        }

        const usuario = rows[0];

        // 2. Comparar contraseña encriptada
        const esValida = await bcrypt.compare(password, usuario.password_hash);

        if (!esValida) {
            return res.status(401).json({ 
                error: true, 
                mensaje: "Contraseña incorrecta." 
            });
        }

        // 3. Actualizar último acceso
        await db.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);

        // 4. Respuesta exitosa al frontend
        res.json({
            error: false,
            mensaje: "Sincronización Exitosa",
            usuario: {
                id: usuario.id,
                nombres: usuario.nombres,
                email: usuario.email,
                perfil: usuario.nombre_categoria,
                foto: usuario.foto_perfil
            }
        });

    } catch (error) {
        console.error("❌ Error detallado en Login:", error);
        res.status(500).json({ 
            error: true, 
            mensaje: "Error en el servidor al intentar iniciar sesión." 
        });
    }
};