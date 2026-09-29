const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const config = require('../config/env');
const { ReadingStore } = require('./readingStore');

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
const memoryInterventions = new Map();

class InterventionStore {
  static async createIntervention(userId, data) {
    const interventionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const record = {
      id: interventionId,
      user_id: userId,
      location_name: data.location_name,
      anomaly_id: data.anomaly_id || null,
      action_type: data.action_type,
      description: data.description || '',
      status: data.status || 'planned',
      notes: data.notes || '',
      start_date: data.start_date ? new Date(data.start_date).toISOString() : now,
      completion_date: data.completion_date ? new Date(data.completion_date).toISOString() : null,
      created_at: now,
    };

    if (supabase) {
      try {
        const { data: dbData, error } = await supabase
          .from('interventions')
          .insert(record)
          .select()
          .single();

        if (dbData && !error) {
          memoryInterventions.set(interventionId, dbData);
          return dbData;
        }
      } catch (err) {
        // Fallback
      }
    }

    memoryInterventions.set(interventionId, record);
    return record;
  }

  static async listInterventions(userId, { page = 1, limit = 10, location_name, status, anomaly_id }) {
    if (supabase) {
      try {
        let query = supabase
          .from('interventions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (location_name) query = query.ilike('location_name', `%${location_name}%`);
        if (status) query = query.eq('status', status);
        if (anomaly_id) query = query.eq('anomaly_id', anomaly_id);

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, count, error } = await query;
        if (data && !error && data.length > 0) {
          return { data, total: count || 0 };
        }
      } catch (err) {
        // Fallback
      }
    }

    let userItems = Array.from(memoryInterventions.values()).filter((i) => i.user_id === userId);

    if (location_name) {
      const q = location_name.toLowerCase();
      userItems = userItems.filter((i) => i.location_name.toLowerCase().includes(q));
    }
    if (status) {
      userItems = userItems.filter((i) => i.status === status);
    }
    if (anomaly_id) {
      userItems = userItems.filter((i) => i.anomaly_id === anomaly_id);
    }

    userItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = userItems.length;
    const startIndex = (page - 1) * limit;
    const paginated = userItems.slice(startIndex, startIndex + limit);

    return { data: paginated, total };
  }

  static async getInterventionById(userId, interventionId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interventions')
          .select('*')
          .eq('id', interventionId)
          .eq('user_id', userId)
          .single();

        if (data && !error) return data;
      } catch (err) {
        // Fallback
      }
    }

    const item = memoryInterventions.get(interventionId);
    if (item && item.user_id === userId) {
      return { ...item };
    }
    return null;
  }

  static async updateIntervention(userId, interventionId, updateData) {
    const existing = await InterventionStore.getInterventionById(userId, interventionId);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      id: existing.id,
      user_id: existing.user_id,
      created_at: existing.created_at,
    };

    if (updateData.start_date) {
      updated.start_date = new Date(updateData.start_date).toISOString();
    }
    if (updateData.completion_date) {
      updated.completion_date = new Date(updateData.completion_date).toISOString();
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interventions')
          .update(updated)
          .eq('id', interventionId)
          .eq('user_id', userId)
          .select()
          .single();

        if (data && !error) {
          memoryInterventions.set(interventionId, data);
          return data;
        }
      } catch (err) {
        // Fallback
      }
    }

    memoryInterventions.set(interventionId, updated);
    return updated;
  }

  static async deleteIntervention(userId, interventionId) {
    const existing = await InterventionStore.getInterventionById(userId, interventionId);
    if (!existing) return false;

    if (supabase) {
      try {
        await supabase
          .from('interventions')
          .delete()
          .eq('id', interventionId)
          .eq('user_id', userId);
      } catch (err) {
        // Fallback
      }
    }

    memoryInterventions.delete(interventionId);
    return true;
  }

  /**
   * Measure pre- vs post-intervention water savings impact for a location
   */
  static async calculateImpact(userId, interventionId) {
    const intervention = await InterventionStore.getInterventionById(userId, interventionId);
    if (!intervention) return null;

    // Fetch all water readings for this location
    const { data: readings } = await ReadingStore.listReadings(userId, {
      location_name: intervention.location_name,
      limit: 1000,
    });

    const startDate = new Date(intervention.start_date || intervention.created_at);
    const endDate = intervention.completion_date ? new Date(intervention.completion_date) : startDate;

    const preReadings = readings.filter(
      (r) => new Date(r.recorded_at) < startDate && r.flow_rate_lps !== null && r.flow_rate_lps !== undefined
    );

    const postReadings = readings.filter(
      (r) => new Date(r.recorded_at) >= endDate && r.flow_rate_lps !== null && r.flow_rate_lps !== undefined
    );

    if (preReadings.length < 2 || postReadings.length < 1) {
      return {
        measured: false,
        message: 'Insufficient reading data to calculate water savings impact',
        requirements: {
          minPreReadingsRequired: 2,
          foundPreReadings: preReadings.length,
          minPostReadingsRequired: 1,
          foundPostReadings: postReadings.length,
        },
        intervention,
      };
    }

    const preSum = preReadings.reduce((sum, r) => sum + Number(r.flow_rate_lps), 0);
    const preBaselineAvgLps = Number((preSum / preReadings.length).toFixed(2));

    const postSum = postReadings.reduce((sum, r) => sum + Number(r.flow_rate_lps), 0);
    const postAvgLps = Number((postSum / postReadings.length).toFixed(2));

    const lpsReduced = Number(Math.max(0, preBaselineAvgLps - postAvgLps).toFixed(2));
    // 86,400 seconds in a day
    const estimatedLitresSavedPerDay = Number((lpsReduced * 86400).toFixed(2));
    const percentageReduction = Number((((preBaselineAvgLps - postAvgLps) / preBaselineAvgLps) * 100).toFixed(2));

    return {
      measured: true,
      intervention_id: intervention.id,
      location_name: intervention.location_name,
      action_type: intervention.action_type,
      status: intervention.status,
      metrics: {
        preBaselineAvgLps,
        postAvgLps,
        lpsReduced,
        estimatedLitresSavedPerDay,
        percentageReduction: percentageReduction > 0 ? percentageReduction : 0,
        sampleCounts: {
          preReadingsCount: preReadings.length,
          postReadingsCount: postReadings.length,
        },
      },
    };
  }
}

module.exports = {
  InterventionStore,
};
