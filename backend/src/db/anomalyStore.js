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
const memoryAnomalies = new Map();

/**
 * Determine severity based on percentage deviation above baseline
 */
function calculateSeverity(deviationPercentage) {
  if (deviationPercentage >= 100) return 'critical';
  if (deviationPercentage >= 50) return 'high';
  if (deviationPercentage >= 35) return 'medium';
  return 'low';
}

class AnomalyStore {
  /**
   * Find existing anomaly by reading_id to prevent duplicates
   */
  static async findByReadingId(userId, readingId) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('anomalies')
          .select('*')
          .eq('reading_id', readingId)
          .eq('user_id', userId)
          .maybeSingle();

        if (data && !error) return data;
      } catch (err) {
        // Fallback
      }
    }

    for (const anomaly of memoryAnomalies.values()) {
      if (anomaly.reading_id === readingId && anomaly.user_id === userId) {
        return { ...anomaly };
      }
    }
    return null;
  }

  /**
   * Run deterministic anomaly detection on a target reading
   */
  static async analyzeReading(userId, targetReading) {
    // Check if an anomaly already exists for this reading
    const existing = await AnomalyStore.findByReadingId(userId, targetReading.id);
    if (existing) {
      return {
        analyzed: true,
        anomalyDetected: true,
        isDuplicate: true,
        anomaly: existing,
      };
    }

    // Fetch all historical readings for this user and location
    const { data: allReadings } = await ReadingStore.listReadings(userId, {
      location_name: targetReading.location_name,
      limit: 1000,
    });

    // Exclude the target reading itself to compare against previous baseline
    const previousReadings = allReadings.filter(
      (r) => r.id !== targetReading.id && new Date(r.recorded_at) <= new Date(targetReading.recorded_at)
    );

    if (previousReadings.length < 3) {
      return {
        analyzed: true,
        anomalyDetected: false,
        message: `Insufficient historical baseline readings (found ${previousReadings.length}, required 3).`,
        historicalCount: previousReadings.length,
      };
    }

    // Calculate baseline average for flow_rate_lps (litres per second)
    const validFlowRates = previousReadings
      .map((r) => r.flow_rate_lps)
      .filter((val) => val !== null && val !== undefined && !isNaN(val));

    if (validFlowRates.length < 3) {
      return {
        analyzed: true,
        anomalyDetected: false,
        message: `Insufficient valid flow rate/volume data in historical readings.`,
        historicalCount: validFlowRates.length,
      };
    }

    const baselineSum = validFlowRates.reduce((acc, curr) => acc + Number(curr), 0);
    const baselineAverage = baselineSum / validFlowRates.length;

    const currentFlowRate = Number(targetReading.flow_rate_lps || 0);

    // Flag if current flow rate is at least 25% above baseline
    const threshold = baselineAverage * 1.25;
    if (currentFlowRate < threshold) {
      return {
        analyzed: true,
        anomalyDetected: false,
        message: `Flow rate (${currentFlowRate} LPS) is within normal range (Baseline: ${baselineAverage.toFixed(2)} LPS, Threshold: ${threshold.toFixed(2)} LPS).`,
        baselineAverage: Number(baselineAverage.toFixed(2)),
        currentFlowRate,
      };
    }

    // Calculate anomaly metrics
    const excessLitres = Number((currentFlowRate - baselineAverage).toFixed(2));
    const deviationPercentage = Number((((currentFlowRate - baselineAverage) / baselineAverage) * 100).toFixed(2));
    const severity = calculateSeverity(deviationPercentage);

    const anomalyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newAnomaly = {
      id: anomalyId,
      user_id: userId,
      reading_id: targetReading.id,
      title: `Excess Flow Rate Anomaly detected at ${targetReading.location_name}`,
      severity,
      status: 'detected',
      description: `Flow rate of ${currentFlowRate} LPS exceeds baseline average of ${baselineAverage.toFixed(2)} LPS by ${deviationPercentage}% (${excessLitres} excess LPS).`,
      detected_at: now,
      created_at: now,
    };

    if (supabase) {
      try {
        const { data: dbData, error } = await supabase
          .from('anomalies')
          .insert(newAnomaly)
          .select()
          .single();

        if (dbData && !error) {
          memoryAnomalies.set(anomalyId, dbData);
          return {
            analyzed: true,
            anomalyDetected: true,
            anomaly: dbData,
            metrics: {
              baselineAverage: Number(baselineAverage.toFixed(2)),
              currentFlowRate,
              excessLitres,
              deviationPercentage,
            },
          };
        }
      } catch (err) {
        // Fall through
      }
    }

    memoryAnomalies.set(anomalyId, newAnomaly);

    return {
      analyzed: true,
      anomalyDetected: true,
      anomaly: newAnomaly,
      metrics: {
        baselineAverage: Number(baselineAverage.toFixed(2)),
        currentFlowRate,
        excessLitres,
        deviationPercentage,
      },
    };
  }

  static async listAnomalies(userId, { page = 1, limit = 10, severity, status }) {
    if (supabase) {
      try {
        let query = supabase
          .from('anomalies')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (severity) query = query.eq('severity', severity);
        if (status) query = query.eq('status', status);

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.order('detected_at', { ascending: false }).range(from, to);

        const { data, count, error } = await query;
        if (data && !error && data.length > 0) {
          return { data, total: count || 0 };
        }
      } catch (err) {
        // Fallback
      }
    }

    let userAnomalies = Array.from(memoryAnomalies.values()).filter(
      (a) => a.user_id === userId
    );

    if (severity) {
      userAnomalies = userAnomalies.filter((a) => a.severity === severity);
    }
    if (status) {
      userAnomalies = userAnomalies.filter((a) => a.status === status);
    }

    userAnomalies.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at));

    const total = userAnomalies.length;
    const startIndex = (page - 1) * limit;
    const paginated = userAnomalies.slice(startIndex, startIndex + limit);

    return { data: paginated, total };
  }

  static async getAnomalyById(userId, anomalyId) {
    let anomaly = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('anomalies')
          .select('*')
          .eq('id', anomalyId)
          .eq('user_id', userId)
          .single();

        if (data && !error) anomaly = data;
      } catch (err) {
        // Fallback
      }
    }

    if (!anomaly) {
      const mem = memoryAnomalies.get(anomalyId);
      if (mem && mem.user_id === userId) {
        anomaly = mem;
      }
    }

    if (!anomaly) return null;

    // Attach reading details if available
    const reading = await ReadingStore.getReadingById(userId, anomaly.reading_id);
    return {
      ...anomaly,
      reading: reading || null,
    };
  }
}

module.exports = {
  AnomalyStore,
};
