const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const config = require('../config/env');

const isSupabaseConfigured =
  config.SUPABASE_URL &&
  config.SUPABASE_SERVICE_ROLE_KEY &&
  !config.SUPABASE_URL.includes('your_supabase') &&
  !config.SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase');

let supabase = null;
if (isSupabaseConfigured) {
  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Memory store fallback
const memoryAiAnalyses = new Map();

class AiAnalysisStore {
  /**
   * Find existing AI analysis for an anomaly (scoped to user)
   */
  static async findByAnomalyId(userId, anomalyId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ai_analyses')
          .select('*')
          .eq('anomaly_id', anomalyId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        // Fallback
      }
    }

    for (const analysis of memoryAiAnalyses.values()) {
      if (analysis.anomaly_id === anomalyId && analysis.user_id === userId) {
        return { ...analysis };
      }
    }
    return null;
  }

  /**
   * Create & store AI analysis record
   */
  static async createAnalysis(userId, { reading_id, anomaly_id, risk_score, summary, recommendations, raw_model_output }) {
    const analysisId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: analysisId,
      user_id: userId,
      reading_id: reading_id || null,
      anomaly_id: anomaly_id || null,
      risk_score: risk_score !== undefined ? Number(risk_score) : 50.0,
      summary: summary || '',
      recommendations: recommendations || [],
      raw_model_output: raw_model_output || {},
      created_at: now,
    };

    if (supabase) {
      try {
        const { data: dbData, error } = await supabase
          .from('ai_analyses')
          .insert(record)
          .select()
          .single();

        if (dbData && !error) {
          memoryAiAnalyses.set(analysisId, dbData);
          return dbData;
        }
      } catch (err) {
        // Fallback
      }
    }

    memoryAiAnalyses.set(analysisId, record);
    return record;
  }
}

module.exports = {
  AiAnalysisStore,
};
