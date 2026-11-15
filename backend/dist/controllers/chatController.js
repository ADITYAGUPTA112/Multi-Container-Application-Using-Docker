"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.deleteChatSession = exports.getChatSession = exports.createChatSession = exports.listChatSessions = exports.sendMessageSchema = exports.createSessionSchema = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const aiClient_1 = require("../services/aiClient");
const errorHandler_1 = require("../middleware/errorHandler");
exports.createSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).default('New Conversation'),
    }),
});
exports.sendMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: zod_1.z.string().min(1, 'Message cannot be empty'),
    }),
});
const listChatSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db_1.db.query(`SELECT cs.*, COUNT(cm.id)::int as message_count,
              MAX(cm.created_at) as last_message_at
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cs.id = cm.session_id
       WHERE cs.user_id = $1
       GROUP BY cs.id
       ORDER BY COALESCE(MAX(cm.created_at), cs.created_at) DESC`, [userId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.listChatSessions = listChatSessions;
const createChatSession = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { title } = req.body;
        const result = await db_1.db.query(`INSERT INTO chat_sessions (user_id, title)
       VALUES ($1, $2)
       RETURNING *`, [userId, title || 'New Conversation']);
        res.status(201).json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
};
exports.createChatSession = createChatSession;
const getChatSession = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const sessionRes = await db_1.db.query('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        if (sessionRes.rows.length === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404, 'SESSION_NOT_FOUND');
        }
        const messagesRes = await db_1.db.query(`SELECT id, session_id, sender_role, message_text, citations_json, created_at
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`, [sessionId]);
        res.json({
            success: true,
            data: {
                session: sessionRes.rows[0],
                messages: messagesRes.rows,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getChatSession = getChatSession;
const deleteChatSession = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const result = await db_1.db.query('DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [sessionId, userId]);
        if (result.rows.length === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404, 'SESSION_NOT_FOUND');
        }
        res.json({
            success: true,
            message: 'Chat session deleted successfully',
        });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteChatSession = deleteChatSession;
const sendMessage = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { message } = req.body;
        // Verify session belongs to user
        const sessionRes = await db_1.db.query('SELECT id, title FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
        if (sessionRes.rows.length === 0) {
            throw new errorHandler_1.AppError('Chat session not found', 404, 'SESSION_NOT_FOUND');
        }
        // 1. Save User Message
        const userMsgRes = await db_1.db.query(`INSERT INTO chat_messages (session_id, sender_role, message_text, citations_json)
       VALUES ($1, 'user', $2, '[]')
       RETURNING *`, [sessionId, message]);
        const userMessage = userMsgRes.rows[0];
        // Auto-update session title if it's the first user message and has default title
        if (sessionRes.rows[0].title === 'New Conversation') {
            const generatedTitle = message.slice(0, 30).trim() + (message.length > 30 ? '...' : '');
            await db_1.db.query('UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2', [generatedTitle, sessionId]);
        }
        // 2. Fetch recent conversation history (last 8 messages)
        const historyRes = await db_1.db.query(`SELECT sender_role as role, message_text as content
       FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 8`, [sessionId]);
        const history = historyRes.rows.reverse();
        // 3. Delegate to RAG Engine with User Isolation
        const ragResponse = await aiClient_1.aiClient.chatWithKnowledgeBase({
            userId,
            message,
            history,
        });
        // 4. Save Assistant Response with Citations
        const assistantMsgRes = await db_1.db.query(`INSERT INTO chat_messages (session_id, sender_role, message_text, citations_json)
       VALUES ($1, 'assistant', $2, $3)
       RETURNING *`, [sessionId, ragResponse.answer, JSON.stringify(ragResponse.citations)]);
        const assistantMessage = assistantMsgRes.rows[0];
        res.status(201).json({
            success: true,
            data: {
                user_message: userMessage,
                assistant_message: assistantMessage,
                citations: ragResponse.citations,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.sendMessage = sendMessage;
