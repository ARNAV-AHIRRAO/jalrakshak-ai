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

// Memory reading store fallback
const memoryReadings = new Map();

class ReadingStore {
  static async createReading(userId, data) {
    const readingId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newReading = {
      id: readingId,
      user_id: userId,
      location_name: data.location_name,
      ph_level: data.ph_level !== undefined ? data.ph_level : null,
      turbidity_ntu: data.turbidity_ntu !== undefined ? data.turbidity_ntu : null,
      dissolved_oxygen_mg_l: data.dissolved_oxygen_mg_l !== undefined ? data.dissolved_oxygen_mg_l : null,
      temperature_celsius: data.temperature_celsius !== undefined ? data.temperature_celsius : null,
      contaminant_ppm: data.contaminant_ppm !== undefined ? data.contaminant_ppm : null,
      flow_rate_lps: data.flow_rate_lps !== undefined ? data.flow_rate_lps : null,
      recorded_at: data.recorded_at ? new Date(data.recorded_at).toISOString() : now,
      created_at: now,
    };

    if (supabase) {
      try {
        const { data: dbData, error } = await supabase
          .from('water_readings')
          .insert(newReading)
          .select()
          .single();

        if (dbData && !error) {
          memoryReadings.set(readingId, dbData);
          return dbData;
        }
      } catch (err) {
        // Fallback to memory store if Supabase insert fails
      }
    }

    memoryReadings.set(readingId, newReading);
    return newReading;
  }

  static async listReadings(userId, { page = 1, limit = 10, location_name, start_date, end_date }) {
    if (supabase) {
      try {
        let query = supabase
          .from('water_readings')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (location_name) {
          query = query.ilike('location_name', `%${location_name}%`);
        }
        if (start_date) {
          query = query.gte('recorded_at', new Date(start_date).toISOString());
        }
        if (end_date) {
          query = query.lte('recorded_at', new Date(end_date).toISOString());
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.order('recorded_at', { ascending: false }).range(from, to);

        const { data, count, error } = await query;
        if (data && !error && data.length > 0) {
          return {
            data,
            total: count || 0,
          };
        }
      } catch (err) {
        // Fall through to memory store lookup
      }
    }

    // Memory store filtering
    let userReadings = Array.from(memoryReadings.values()).filter(
      (r) => r.user_id === userId
    );

    if (location_name) {
      const queryLoc = location_name.toLowerCase();
      userReadings = userReadings.filter((r) =>
        r.location_name.toLowerCase().includes(queryLoc)
      );
    }

    if (start_date) {
      const startTime = new Date(start_date).getTime();
      userReadings = userReadings.filter(
        (r) => new Date(r.recorded_at).getTime() >= startTime
      );
    }

    if (end_date) {
      const endTime = new Date(end_date).getTime();
      userReadings = userReadings.filter(
        (r) => new Date(r.recorded_at).getTime() <= endTime
      );
    }

    // Sort descending by recorded_at
    userReadings.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));

    const total = userReadings.length;
    const startIndex = (page - 1) * limit;
    const paginated = userReadings.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      total,
    };
  }

  static async getReadingById(userId, readingId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('water_readings')
          .select('*')
          .eq('id', readingId)
          .eq('user_id', userId)
          .single();

        if (data && !error) {
          return data;
        }
      } catch (err) {
        // Fall through
      }
    }

    const reading = memoryReadings.get(readingId);
    if (reading && reading.user_id === userId) {
      return reading;
    }
    return null;
  }

  static async updateReading(userId, readingId, updateData) {
    const existing = await ReadingStore.getReadingById(userId, readingId);
    if (!existing) return null;

    const updatedReading = {
      ...existing,
      ...updateData,
      id: existing.id,
      user_id: existing.user_id,
      created_at: existing.created_at,
    };

    if (updateData.recorded_at) {
      updatedReading.recorded_at = new Date(updateData.recorded_at).toISOString();
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('water_readings')
          .update(updatedReading)
          .eq('id', readingId)
          .eq('user_id', userId)
          .select()
          .single();

        if (data && !error) {
          memoryReadings.set(readingId, data);
          return data;
        }
      } catch (err) {
        // Fall through
      }
    }

    memoryReadings.set(readingId, updatedReading);
    return updatedReading;
  }

  static async deleteReading(userId, readingId) {
    const existing = await ReadingStore.getReadingById(userId, readingId);
    if (!existing) return false;

    if (supabase) {
      try {
        await supabase
          .from('water_readings')
          .delete()
          .eq('id', readingId)
          .eq('user_id', userId);
      } catch (err) {
        // Fall through
      }
    }

    memoryReadings.delete(readingId);
    return true;
  }
}

module.exports = {
  ReadingStore,
};
