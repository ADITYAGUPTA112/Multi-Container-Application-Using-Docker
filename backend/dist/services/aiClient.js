"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiClient = exports.AIServiceClient = void 0;
const config_1 = require("../config");
class AIServiceClient {
    baseUrl;
    constructor() {
        this.baseUrl = config_1.config.aiServiceUrl;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`⚠️ [AI Client] Request to ${endpoint} returned ${response.status}: ${errorText}`);
                return null;
            }
            return (await response.json());
        }
        catch (err) {
            console.warn(`ℹ️ [AI Client] AI Service at ${url} unreachable (${err.message}). Using local fallback heuristics.`);
            return null;
        }
    }
    async indexNote(note) {
        const res = await this.request('/api/v1/vectors/notes', {
            method: 'POST',
            body: JSON.stringify(note),
        });
        return res?.success ?? true;
    }
    async deleteNoteVector(noteId, userId) {
        const res = await this.request(`/api/v1/vectors/notes/${noteId}?user_id=${userId}`, {
            method: 'DELETE',
        });
        return res?.success ?? true;
    }
    async deleteDocumentVectors(documentId, userId) {
        const res = await this.request(`/api/v1/vectors/documents/${documentId}?user_id=${userId}`, {
            method: 'DELETE',
        });
        return res?.success ?? true;
    }
    async semanticSearch(params) {
        const res = await this.request('/api/v1/search/semantic', {
            method: 'POST',
            body: JSON.stringify(params),
        });
        if (res && res.results) {
            return res.results;
        }
        // Resilient local fallback when AI service is detached
        return [];
    }
    async chatWithKnowledgeBase(params) {
        const res = await this.request('/api/v1/chat/rag', {
            method: 'POST',
            body: JSON.stringify(params),
        });
        if (res) {
            return res;
        }
        // Fallback response with notice
        return {
            answer: "I couldn't reach the AI intelligence engine at this moment. Please verify the AI service is active.",
            citations: [],
        };
    }
    async autoTagNote(params) {
        const res = await this.request('/api/v1/nlp/auto-tag', {
            method: 'POST',
            body: JSON.stringify(params),
        });
        if (res) {
            return res;
        }
        // Smart heuristic extraction fallback
        const words = (params.title + ' ' + params.content).toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
        const freq = {};
        for (const w of words) {
            if (!['with', 'from', 'that', 'this', 'have', 'were', 'which', 'their'].includes(w)) {
                freq[w] = (freq[w] || 0) + 1;
            }
        }
        const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
        return {
            category: params.existingCategories[0] || 'General',
            tags: topWords.slice(0, 3),
            description: params.content.slice(0, 140).trim() + '...',
            keywords: topWords,
        };
    }
}
exports.AIServiceClient = AIServiceClient;
exports.aiClient = new AIServiceClient();
