"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchKnowledgeBase = exports.searchSchema = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const aiClient_1 = require("../services/aiClient");
exports.searchSchema = zod_1.z.object({
    body: zod_1.z.object({
        query: zod_1.z.string().min(1, 'Search query cannot be empty'),
        type: zod_1.z.enum(['all', 'notes', 'documents']).default('all'),
        folder_id: zod_1.z.string().uuid().optional(),
        tag: zod_1.z.string().optional(),
        page: zod_1.z.number().int().positive().default(1),
        limit: zod_1.z.number().int().positive().max(50).default(10),
    }),
});
const searchKnowledgeBase = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { query, type, folder_id, tag, page, limit } = req.body;
        // 1. Lexical / Full-Text Search in PostgreSQL
        let lexicalResults = [];
        if (type === 'all' || type === 'notes') {
            let notesQuery = `
        SELECT n.id, 'note' as type, n.title, 
               ts_headline('english', n.content_text, plainto_tsquery('english', $2), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') as excerpt,
               ts_rank_cd(n.tsv_content, plainto_tsquery('english', $2)) as lexical_score,
               n.folder_id, n.updated_at
        FROM notes n
        WHERE n.user_id = $1 AND (n.tsv_content @@ plainto_tsquery('english', $2) OR n.title ILIKE $3)
      `;
            const params = [userId, query, `%${query}%`];
            if (folder_id) {
                notesQuery += ` AND n.folder_id = $4`;
                params.push(folder_id);
            }
            notesQuery += ` ORDER BY lexical_score DESC LIMIT 20`;
            try {
                const noteFts = await db_1.db.query(notesQuery, params);
                for (const row of noteFts.rows) {
                    lexicalResults.push({
                        id: row.id,
                        type: 'note',
                        title: row.title,
                        excerpt: row.excerpt || row.title,
                        score: Math.min(row.lexical_score || 0.5, 1.0),
                        folder_id: row.folder_id,
                        updated_at: row.updated_at,
                    });
                }
            }
            catch (e) {
                // Fallback simple ILIKE
                const fallback = await db_1.db.query(`SELECT id, 'note' as type, title, substring(content_text from 1 for 180) as excerpt, 0.6 as score
           FROM notes WHERE user_id = $1 AND (title ILIKE $2 OR content_text ILIKE $2) LIMIT 10`, [userId, `%${query}%`]);
                for (const row of fallback.rows) {
                    lexicalResults.push(row);
                }
            }
        }
        if (type === 'all' || type === 'documents') {
            try {
                const docFts = await db_1.db.query(`SELECT dc.id, 'document' as type, d.original_name as title, dc.page_number as page,
                  ts_headline('english', dc.chunk_text, plainto_tsquery('english', $2), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') as excerpt,
                  ts_rank_cd(dc.tsv_chunk, plainto_tsquery('english', $2)) as lexical_score
           FROM document_chunks dc
           JOIN documents d ON dc.document_id = d.id
           WHERE dc.user_id = $1 AND dc.tsv_chunk @@ plainto_tsquery('english', $2)
           ORDER BY lexical_score DESC LIMIT 20`, [userId, query]);
                for (const row of docFts.rows) {
                    lexicalResults.push({
                        id: row.id,
                        type: 'document',
                        title: row.title,
                        page: row.page,
                        excerpt: row.excerpt || row.title,
                        score: Math.min(row.lexical_score || 0.5, 1.0),
                    });
                }
            }
            catch (e) {
                // Fallback
            }
        }
        // 2. Vector Semantic Search from AI Service (Qdrant)
        const vectorResults = await aiClient_1.aiClient.semanticSearch({
            userId,
            query,
            type,
            folderId: folder_id,
            tag,
            limit: 20,
        });
        // 3. Reciprocal Rank Fusion (RRF) Algorithm
        // Formula: RRF(doc) = sum(1 / (k + rank_i)) where k = 60
        const k = 60;
        const scoreMap = new Map();
        // Process lexical ranks
        lexicalResults.forEach((item, index) => {
            const rank = index + 1;
            const rrf = 1 / (k + rank);
            const existing = scoreMap.get(item.id);
            if (existing) {
                existing.rrfScore += rrf;
            }
            else {
                scoreMap.set(item.id, { item, rrfScore: rrf });
            }
        });
        // Process vector ranks
        vectorResults.forEach((item, index) => {
            const rank = index + 1;
            const rrf = 1 / (k + rank);
            const existing = scoreMap.get(item.id);
            if (existing) {
                existing.rrfScore += rrf;
                // Merge richer vector excerpt or title if needed
                if (!existing.item.excerpt || existing.item.excerpt.length < item.excerpt.length) {
                    existing.item.excerpt = item.excerpt;
                }
            }
            else {
                scoreMap.set(item.id, { item, rrfScore: rrf });
            }
        });
        // Sort by combined RRF score
        const combined = Array.from(scoreMap.values())
            .sort((a, b) => b.rrfScore - a.rrfScore)
            .map(entry => {
            // Normalize score between 0.0 and 1.0 for UI display
            const normalizedScore = Math.min(Math.round(entry.rrfScore * 100 * 30) / 100, 0.99);
            return {
                ...entry.item,
                relevance_score: Math.max(normalizedScore, 0.45),
            };
        });
        // Apply pagination
        const offset = (page - 1) * limit;
        const paginated = combined.slice(offset, offset + limit);
        res.json({
            success: true,
            data: {
                query,
                results: paginated,
                total: combined.length,
                page,
                limit,
                has_more: offset + limit < combined.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.searchKnowledgeBase = searchKnowledgeBase;
