"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTag = exports.createTag = exports.listTags = exports.createTagSchema = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const errorHandler_1 = require("../middleware/errorHandler");
exports.createTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Tag name is required').max(50),
        color: zod_1.z.string().optional().default('#8b5cf6'),
    }),
});
const listTags = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db_1.db.query(`SELECT t.*, COUNT(nt.note_id)::int as note_count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`, [userId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.listTags = listTags;
const createTag = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, color } = req.body;
        const normalizedName = name.toLowerCase().trim();
        const result = await db_1.db.query(`INSERT INTO tags (user_id, name, color)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
       RETURNING *`, [userId, normalizedName, color || '#8b5cf6']);
        res.status(201).json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createTag = createTag;
const deleteTag = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tagId = req.params.id;
        const result = await db_1.db.query('DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING id', [tagId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Tag not found', 404, 'TAG_NOT_FOUND');
        }
        res.json({
            success: true,
            message: 'Tag deleted successfully',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteTag = deleteTag;
