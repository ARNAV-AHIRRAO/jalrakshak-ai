const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');
const config = require('../config/env');

const AIAnalysisResultSchema = z.object({
  risk_score: z.number().min(0).max(100),
  summary: z.string().min(1),
  probable_causes: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
});

/**
 * Deterministic fallback analysis if Gemini API is unavailable or unconfigured
 */
function getFallbackAnalysis(anomaly, reading) {
  const location = anomaly.title || reading?.location_name || 'Water Monitoring Site';
  const severity = anomaly.severity || 'medium';

  let riskScore = 50;
  if (severity === 'critical') riskScore = 90;
  else if (severity === 'high') riskScore = 75;
  else if (severity === 'medium') riskScore = 55;
  else riskScore = 30;

  return {
    risk_score: riskScore,
    summary: `[Fallback Analysis] Deterministic anomaly flagged at ${location}. ${anomaly.description || 'Water parameters exceed expected baseline thresholds.'}`,
    probable_causes: [
      'Unscheduled high-volume pipe flush or main distribution valve adjustment',
      'Undetected pipeline leak or pressure surge in local sector',
      'Metering sensor calibration drift or transient hydraulic surge',
    ],
    recommendations: [
      'Inspect physical isolation valves and flow meters for mechanical drift or leak signs.',
      'Cross-check secondary water quality metrics (pH, turbidity) to rule out contamination.',
      'Temporarily throttle distribution lines to maintain operational baseline flow rates.',
    ],
    is_fallback: true,
  };
}

/**
 * Generate AI Analysis using Gemini server-side
 */
async function generateAnomalyAnalysis(anomaly, reading) {
  const apiKey = config.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('your_gemini') || apiKey.length < 10) {
    console.warn('Gemini API key not configured or placeholder used. Using deterministic fallback analysis.');
    return getFallbackAnalysis(anomaly, reading);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are JalRakshak AI, an expert hydrologist and water management intelligence system.
Analyze the following detected water anomaly and water reading facts:

Anomaly Title: ${anomaly.title}
Severity Level: ${anomaly.severity}
Status: ${anomaly.status}
Description: ${anomaly.description}
Detected At: ${anomaly.detected_at}

Associated Water Reading Facts:
- Location: ${reading?.location_name || 'Unknown'}
- Flow Rate (Litres/sec): ${reading?.flow_rate_lps ?? 'N/A'}
- pH Level: ${reading?.ph_level ?? 'N/A'}
- Turbidity (NTU): ${reading?.turbidity_ntu ?? 'N/A'}
- Dissolved Oxygen (mg/L): ${reading?.dissolved_oxygen_mg_l ?? 'N/A'}
- Temperature (°C): ${reading?.temperature_celsius ?? 'N/A'}
- Contaminants (PPM): ${reading?.contaminant_ppm ?? 'N/A'}
- Recorded Timestamp: ${reading?.recorded_at ?? 'N/A'}

Task:
Provide probable root causes and practical water-saving recommendations in exact JSON format.
Return ONLY valid JSON matching this schema:
{
  "risk_score": <number between 0 and 100 representing overall severity/risk>,
  "summary": "<concise professional hydrological summary>",
  "probable_causes": ["<cause 1>", "<cause 2>", "<cause 3>"],
  "recommendations": ["<practical recommendation 1>", "<practical recommendation 2>", "<practical recommendation 3>"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Empty response text received from Gemini');
    }

    const parsedJson = JSON.parse(textOutput);
    const validatedResult = AIAnalysisResultSchema.parse(parsedJson);

    return {
      ...validatedResult,
      is_fallback: false,
    };
  } catch (error) {
    console.warn('Gemini API call or parsing failed, failing gracefully to fallback analysis:', error.message);
    return getFallbackAnalysis(anomaly, reading);
  }
}

module.exports = {
  generateAnomalyAnalysis,
};
