"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFolder = exports.updateFolder = exports.createFolder = exports.listFolders = exports.updateFolderSchema = exports.createFolderSchema = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const errorHandler_1 = require("../middleware/errorHandler");
exports.createFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Folder name is required').max(100),
        color: zod_1.z.string().optional().default('#7c3aed'),
        icon: zod_1.z.string().optional().default('Folder'),
    }),
});
exports.updateFolderSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        color: zod_1.z.string().optional(),
        icon: zod_1.z.string().optional(),
    }),
});
const listFolders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db_1.db.query(`SELECT f.*, COUNT(n.id)::int as note_count
       FROM folders f
       LEFT JOIN notes n ON f.id = n.folder_id AND n.is_archived = false
       WHERE f.user_id = $1
       GROUP BY f.id
       ORDER BY f.name ASC`, [userId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.listFolders = listFolders;
const createFolder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, color, icon } = req.body;
        const existing = await db_1.db.query('SELECT id FROM folders WHERE user_id = $1 AND name = $2', [userId, name]);
        if (existing.rows.length > 0) {
            throw new errorHandler_1.AppError('A folder with this name already exists', 409, 'FOLDER_EXISTS');
        }
        const result = await db_1.db.query(`INSERT INTO folders (user_id, name, color, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [userId, name, color || '#7c3aed', icon || 'Folder']);
        res.status(201).json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createFolder = createFolder;
const updateFolder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;
        const { name, color, icon } = req.body;
        const result = await db_1.db.query(`UPDATE folders
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           icon = COALESCE($3, icon),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`, [name, color, icon, folderId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
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
exports.updateFolder = updateFolder;
const deleteFolder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const folderId = req.params.id;
        // Unassign notes from this folder
        await db_1.db.query('UPDATE notes SET folder_id = NULL WHERE folder_id = $1 AND user_id = $2', [folderId, userId]);
        const result = await db_1.db.query('DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING id', [folderId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
        }
        res.json({
            success: true,
            message: 'Folder deleted and associated notes moved to unassigned',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteFolder = deleteFolder;
