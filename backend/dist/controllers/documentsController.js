"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.getDocumentChunks = exports.getDocument = exports.listDocuments = exports.uploadDocument = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../db");
const config_1 = require("../config");
const redis_1 = require("../db/redis");
const aiClient_1 = require("../services/aiClient");
const errorHandler_1 = require("../middleware/errorHandler");
// Multer storage setup
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (!fs_1.default.existsSync(config_1.config.uploads.dir)) {
            fs_1.default.mkdirSync(config_1.config.uploads.dir, { recursive: true });
        }
        cb(null, config_1.config.uploads.dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: config_1.config.uploads.maxFileSize },
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
        if (!allowedExtensions.includes(ext)) {
            return cb(new errorHandler_1.AppError(`Unsupported file format (${ext}). Allowed: PDF, DOCX, TXT, Markdown`, 400, 'UNSUPPORTED_FILE_TYPE'));
        }
        cb(null, true);
    },
}).single('file');
const uploadDocument = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            throw new errorHandler_1.AppError('No document file uploaded. Please provide a valid file.', 400, 'FILE_MISSING');
        }
        const insertRes = await db_1.db.query(`INSERT INTO documents (user_id, filename, original_name, mime_type, file_size, file_path, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'uploaded')
       RETURNING *`, [userId, file.filename, file.originalname, file.mimetype, file.size, file.path]);
        const document = insertRes.rows[0];
        // Dispatch background extraction, chunking, and embedding
        redis_1.redisManager.enqueueJob('document-processing', 'process-document', {
            document_id: document.id,
            user_id: userId,
            file_path: file.path,
            mime_type: file.mimetype,
            original_name: file.originalname,
        });
        res.status(202).json({
            success: true,
            data: document,
            message: 'Document uploaded successfully and queued for intelligent processing',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.uploadDocument = uploadDocument;
const listDocuments = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db_1.db.query(`SELECT d.*, COUNT(dc.id)::int as chunk_count
       FROM documents d
       LEFT JOIN document_chunks dc ON d.id = dc.document_id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.created_at DESC`, [userId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.listDocuments = listDocuments;
const getDocument = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const docId = req.params.id;
        const result = await db_1.db.query(`SELECT d.*, COUNT(dc.id)::int as chunk_count
       FROM documents d
       LEFT JOIN document_chunks dc ON d.id = dc.document_id
       WHERE d.id = $1 AND d.user_id = $2
       GROUP BY d.id`, [docId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
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
exports.getDocument = getDocument;
const getDocumentChunks = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const docId = req.params.id;
        const result = await db_1.db.query(`SELECT id, chunk_index, page_number, chunk_text, token_count, created_at
       FROM document_chunks
       WHERE document_id = $1 AND user_id = $2
       ORDER BY chunk_index ASC`, [docId, userId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getDocumentChunks = getDocumentChunks;
const deleteDocument = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const docId = req.params.id;
        const docRes = await db_1.db.query('SELECT file_path FROM documents WHERE id = $1 AND user_id = $2', [docId, userId]);
        if (docRes.rows.length === 0) {
            throw new errorHandler_1.AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
        }
        const filePath = docRes.rows[0].file_path;
        // Delete record from DB (foreign keys cascade chunks)
        await db_1.db.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [docId, userId]);
        // Cleanup physical file on disk
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlink(filePath, () => { });
        }
        // Queue Qdrant vector point deletion
        aiClient_1.aiClient.deleteDocumentVectors(docId, userId).catch(err => {
            console.warn('⚠️ [Documents] Background vector deletion notice:', err.message);
        });
        res.json({
            success: true,
            message: 'Document and all associated indexed chunks permanently deleted',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteDocument = deleteDocument;
