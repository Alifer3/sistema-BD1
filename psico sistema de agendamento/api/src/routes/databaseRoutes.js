import express from 'express';
import { query } from '../config/db.js';

const router = express.Router();

router.get('/db/health', async (_, res) => {
  try {
    const result = await query('SELECT NOW() AS agora');
    res.json({ ok: true, database: 'PostgreSQL conectado', agora: result.rows[0].agora });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/psicologos', async (_, res) => {
  try {
    const result = await query(`
      SELECT p.id, u.nome, u.email, u.telefone, p.crp, p.especialidade, p.bio,
             p.valor_consulta, p.atende_online, p.atende_presencial, p.status_validacao,
             e.cidade, e.estado, e.latitude, e.longitude
      FROM psicologos p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN enderecos e ON e.psicologo_id = p.id
      ORDER BY u.nome
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/psicologos', async (req, res) => {
  const { nome, email, telefone, crp, especialidade, bio, valor_consulta, cidade, estado } = req.body;

  if (!nome || !email || !crp) {
    return res.status(400).json({ ok: false, error: 'nome, email e crp são obrigatórios.' });
  }

  try {
    const usuario = await query(
      `INSERT INTO usuarios (nome, email, telefone, tipo) VALUES ($1, $2, $3, 'psicologo') RETURNING id`,
      [nome, email, telefone || null]
    );

    const psicologo = await query(
      `INSERT INTO psicologos (usuario_id, crp, especialidade, bio, valor_consulta)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [usuario.rows[0].id, crp, especialidade || null, bio || null, valor_consulta || 0]
    );

    if (cidade || estado) {
      await query(
        `INSERT INTO enderecos (psicologo_id, cidade, estado) VALUES ($1, $2, $3)`,
        [psicologo.rows[0].id, cidade || null, estado || null]
      );
    }

    res.status(201).json({ ok: true, psicologo: psicologo.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/planos', async (_, res) => {
  try {
    const result = await query('SELECT * FROM planos WHERE ativo = true ORDER BY valor');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/agendamentos', async (_, res) => {
  try {
    const result = await query(`
      SELECT a.*, up.nome AS paciente, ups.nome AS psicologo
      FROM agendamentos a
      LEFT JOIN pacientes pa ON pa.id = a.paciente_id
      LEFT JOIN usuarios up ON up.id = pa.usuario_id
      LEFT JOIN psicologos ps ON ps.id = a.psicologo_id
      LEFT JOIN usuarios ups ON ups.id = ps.usuario_id
      ORDER BY a.data_hora DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
