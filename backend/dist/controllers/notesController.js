"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptAiTags = exports.triggerAiTagging = exports.deleteNote = exports.toggleFavorite = exports.toggleArchive = exports.togglePin = exports.updateNote = exports.getNote = exports.createNote = exports.listNotes = exports.updateNoteSchema = exports.createNoteSchema = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const aiClient_1 = require("../services/aiClient");
const redis_1 = require("../db/redis");
const errorHandler_1 = require("../middleware/errorHandler");
exports.createNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Note title cannot be empty').default('Untitled Note'),
        content_json: zod_1.z.any().optional().default({ type: 'doc', content: [] }),
        content_text: zod_1.z.string().optional().default(''),
        folder_id: zod_1.z.string().uuid().nullable().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    }),
});
exports.updateNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).optional(),
        content_json: zod_1.z.any().optional(),
        content_text: zod_1.z.string().optional(),
        folder_id: zod_1.z.string().uuid().nullable().optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        version: zod_1.z.number().int().optional(),
    }),
});
const listNotes = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { folder_id, tag_id, is_archived, is_favorite, is_pinned, search, page = '1', limit = '20' } = req.query;
        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        const pageLimit = parseInt(limit, 10);
        let queryText = `
      SELECT n.id, n.user_id, n.folder_id, f.name as folder_name, f.color as folder_color,
             n.title, n.content_text, n.version, n.is_pinned, n.is_archived, n.is_favorite,
             n.ai_category, n.ai_description, n.ai_keywords, n.last_edited_at, n.created_at, n.updated_at,
             COALESCE(
               json_agg(
                 json_build_object('id', t.id, 'name', t.name, 'color', t.color)
               ) FILTER (WHERE t.id IS NOT NULL), '[]'
             ) as tags
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.user_id = $1
    `;
        const params = [userId];
        let paramIndex = 2;
        if (is_archived !== undefined) {
            queryText += ` AND n.is_archived = $${paramIndex++}`;
            params.push(is_archived === 'true');
        }
        else {
            queryText += ` AND n.is_archived = false`;
        }
        if (folder_id) {
            queryText += ` AND n.folder_id = $${paramIndex++}`;
            params.push(folder_id);
        }
        if (is_favorite !== undefined) {
            queryText += ` AND n.is_favorite = $${paramIndex++}`;
            params.push(is_favorite === 'true');
        }
        if (is_pinned !== undefined) {
            queryText += ` AND n.is_pinned = $${paramIndex++}`;
            params.push(is_pinned === 'true');
        }
        if (tag_id) {
            queryText += ` AND n.id IN (SELECT note_id FROM note_tags WHERE tag_id = $${paramIndex++})`;
            params.push(tag_id);
        }
        if (search) {
            queryText += ` AND (n.title ILIKE $${paramIndex} OR n.content_text ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        queryText += `
      GROUP BY n.id, f.name, f.color
      ORDER BY n.is_pinned DESC, n.last_edited_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        params.push(pageLimit, offset);
        const result = await db_1.db.query(queryText, params);
        res.json({
            success: true,
            data: {
                notes: result.rows,
                page: parseInt(page, 10),
                limit: pageLimit,
                count: result.rows.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.listNotes = listNotes;
const createNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { title, content_json, content_text, folder_id, tags = [] } = req.body;
        const result = await db_1.db.query(`INSERT INTO notes (user_id, folder_id, title, content_json, content_text, version)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING *`, [userId, folder_id || null, title, content_json, content_text]);
        const note = result.rows[0];
        // Associate tags if any
        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                // Find or create tag
                let tagRes = await db_1.db.query(`INSERT INTO tags (user_id, name)
           VALUES ($1, $2)
           ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
           RETURNING id`, [userId, tagName.toLowerCase().trim()]);
                const tagId = tagRes.rows[0].id;
                await db_1.db.query(`INSERT INTO note_tags (note_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`, [note.id, tagId]);
            }
        }
        // Trigger async vector indexing and auto-tagging
        redis_1.redisManager.enqueueJob('note-indexing', 'index-note', {
            note_id: note.id,
            user_id: userId,
            title: note.title,
            content: note.content_text,
            folder_id: note.folder_id,
            tags,
        });
        res.status(201).json({
            success: true,
            data: note,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createNote = createNote;
const getNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const result = await db_1.db.query(`SELECT n.*, f.name as folder_name, f.color as folder_color,
              COALESCE(
                json_agg(
                  json_build_object('id', t.id, 'name', t.name, 'color', t.color)
                ) FILTER (WHERE t.id IS NOT NULL), '[]'
              ) as tags
       FROM notes n
       LEFT JOIN folders f ON n.folder_id = f.id
       LEFT JOIN note_tags nt ON n.id = nt.note_id
       LEFT JOIN tags t ON nt.tag_id = t.id
       WHERE n.id = $1 AND n.user_id = $2
       GROUP BY n.id, f.name, f.color`, [noteId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Note not found or you do not have permission to view it', 404, 'NOTE_NOT_FOUND');
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getNote = getNote;
const updateNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { title, content_json, content_text, folder_id, tags, version } = req.body;
        // Check existing note and optimistic locking
        const existing = await db_1.db.query('SELECT id, version FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
        if (existing.rows.length === 0) {
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        }
        const currentVersion = existing.rows[0].version;
        // Optimistic concurrency check
        if (version !== undefined && version !== currentVersion) {
            res.status(409).json({
                success: false,
                error: {
                    code: 'CONCURRENCY_CONFLICT',
                    message: 'The note has been modified by another session. Please reload to avoid overwriting changes.',
                    server_version: currentVersion,
                    client_version: version,
                },
            });
            return;
        }
        const newVersion = currentVersion + 1;
        const updateRes = await db_1.db.query(`UPDATE notes
       SET title = COALESCE($1, title),
           content_json = COALESCE($2, content_json),
           content_text = COALESCE($3, content_text),
           folder_id = $4,
           version = $5,
           last_edited_at = NOW(),
           updated_at = NOW()
       WHERE id = $6 AND user_id = $7
       RETURNING *`, [title, content_json, content_text, folder_id, newVersion, noteId, userId]);
        const updatedNote = updateRes.rows[0];
        // Update tags if provided
        if (tags !== undefined) {
            await db_1.db.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
            for (const tagName of tags) {
                let tagRes = await db_1.db.query(`INSERT INTO tags (user_id, name)
           VALUES ($1, $2)
           ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
           RETURNING id`, [userId, tagName.toLowerCase().trim()]);
                await db_1.db.query(`INSERT INTO note_tags (note_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`, [noteId, tagRes.rows[0].id]);
            }
        }
        // Trigger vector re-indexing asynchronously
        redis_1.redisManager.enqueueJob('note-indexing', 'index-note', {
            note_id: updatedNote.id,
            user_id: userId,
            title: updatedNote.title,
            content: updatedNote.content_text,
            folder_id: updatedNote.folder_id,
            tags: tags || [],
        });
        res.json({
            success: true,
            data: updatedNote,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.updateNote = updateNote;
const togglePin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { is_pinned } = req.body;
        const resDb = await db_1.db.query(`UPDATE notes SET is_pinned = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, is_pinned`, [is_pinned, noteId, userId]);
        if (resDb.rows.length === 0)
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        res.json({ success: true, data: resDb.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
exports.togglePin = togglePin;
const toggleArchive = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { is_archived } = req.body;
        const resDb = await db_1.db.query(`UPDATE notes SET is_archived = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, is_archived`, [is_archived, noteId, userId]);
        if (resDb.rows.length === 0)
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        res.json({ success: true, data: resDb.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
exports.toggleArchive = toggleArchive;
const toggleFavorite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { is_favorite } = req.body;
        const resDb = await db_1.db.query(`UPDATE notes SET is_favorite = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, is_favorite`, [is_favorite, noteId, userId]);
        if (resDb.rows.length === 0)
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        res.json({ success: true, data: resDb.rows[0] });
    }
    catch (err) {
        next(err);
    }
};
exports.toggleFavorite = toggleFavorite;
const deleteNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const deleteRes = await db_1.db.query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id', [noteId, userId]);
        if (deleteRes.rows.length === 0) {
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        }
        // Asynchronously delete vector embedding from Qdrant
        aiClient_1.aiClient.deleteNoteVector(noteId, userId).catch(err => {
            console.warn('⚠️ [Notes] Background vector deletion notice:', err.message);
        });
        res.json({
            success: true,
            message: 'Note deleted permanently and queued for vector cleanup',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteNote = deleteNote;
const triggerAiTagging = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const noteRes = await db_1.db.query('SELECT title, content_text FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
        if (noteRes.rows.length === 0) {
            throw new errorHandler_1.AppError('Note not found', 404, 'NOTE_NOT_FOUND');
        }
        const { title, content_text } = noteRes.rows[0];
        // Fetch existing user categories and tags for smart reuse
        const categoriesRes = await db_1.db.query('SELECT DISTINCT name FROM folders WHERE user_id = $1', [userId]);
        const existingCategories = categoriesRes.rows.map(r => r.name);
        const tagsRes = await db_1.db.query('SELECT name FROM tags WHERE user_id = $1', [userId]);
        const existingTags = tagsRes.rows.map(r => r.name);
        const suggestions = await aiClient_1.aiClient.autoTagNote({
            title,
            content: content_text,
            existingCategories,
            existingTags,
        });
        res.json({
            success: true,
            data: suggestions,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.triggerAiTagging = triggerAiTagging;
const acceptAiTags = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const noteId = req.params.id;
        const { category, tags, description, keywords } = req.body;
        // Update note AI metadata
        await db_1.db.query(`UPDATE notes
       SET ai_category = $1, ai_description = $2, ai_keywords = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5`, [category, description, keywords || [], noteId, userId]);
        // If tags provided, attach without removing existing tags
        if (tags && tags.length > 0) {
            for (const tagName of tags) {
                const tagRes = await db_1.db.query(`INSERT INTO tags (user_id, name)
           VALUES ($1, $2)
           ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
           RETURNING id`, [userId, tagName.toLowerCase().trim()]);
                await db_1.db.query(`INSERT INTO note_tags (note_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`, [noteId, tagRes.rows[0].id]);
            }
        }
        res.json({
            success: true,
            message: 'AI tags and categorization accepted successfully',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.acceptAiTags = acceptAiTags;
