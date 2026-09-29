const express = require('express');
const { z } = require('zod');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { AnomalyStore } = require('../db/anomalyStore');
const { AiAnalysisStore } = require('../db/aiAnalysisStore');
const { generateAnomalyAnalysis } = require('../services/geminiService');

const router = express.Router();

// Apply authentication middleware to all AI routes
router.use(authenticateToken);

const AnalyzeAnomalyParamsSchema = z.object({
  anomalyId: z.string().uuid('anomalyId must be a valid UUID'),
});

const AnalyzeAnomalyBodySchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});

/**
 * POST /api/ai/analyze-anomaly/:anomalyId
 * Perform server-side Gemini AI analysis for a specific anomaly (Scoped to authenticated user)
 */
router.post('/analyze-anomaly/:anomalyId', async (req, res, next) => {
  try {
    const { anomalyId } = AnalyzeAnomalyParamsSchema.parse(req.params);
    const { forceRefresh } = AnalyzeAnomalyBodySchema.parse(req.body || {});

    // Ensure anomaly belongs to the authenticated user
    const anomaly = await AnomalyStore.getAnomalyById(req.user.id, anomalyId);
    if (!anomaly) {
      throw new AppError('Anomaly not found or access denied', 404, 'NOT_FOUND');
    }

    // Check for existing cached analysis unless forceRefresh is true
    if (!forceRefresh) {
      const existingAnalysis = await AiAnalysisStore.findByAnomalyId(req.user.id, anomalyId);
      if (existingAnalysis) {
        return res.status(200).json({
          message: 'Retrieved existing AI analysis',
          cached: true,
          data: existingAnalysis,
        });
      }
    }

    // Run Gemini analysis server-side with user's reading facts
    const aiResult = await generateAnomalyAnalysis(anomaly, anomaly.reading);

    // Save analysis to database / store
    const storedRecord = await AiAnalysisStore.createAnalysis(req.user.id, {
      reading_id: anomaly.reading_id,
      anomaly_id: anomaly.id,
      risk_score: aiResult.risk_score,
      summary: aiResult.summary,
      recommendations: aiResult.recommendations,
      raw_model_output: {
        probable_causes: aiResult.probable_causes,
        is_fallback: aiResult.is_fallback,
      },
    });

    return res.status(200).json({
      message: 'AI analysis generated successfully',
      cached: false,
      data: storedRecord,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/analyses/:anomalyId
 * Get stored AI analysis for an anomaly (Scoped to authenticated user)
 */
router.get('/analyses/:anomalyId', async (req, res, next) => {
  try {
    const { anomalyId } = AnalyzeAnomalyParamsSchema.parse(req.params);

    const anomaly = await AnomalyStore.getAnomalyById(req.user.id, anomalyId);
    if (!anomaly) {
      throw new AppError('Anomaly not found or access denied', 404, 'NOT_FOUND');
    }

    const analysis = await AiAnalysisStore.findByAnomalyId(req.user.id, anomalyId);
    if (!analysis) {
      throw new AppError('No AI analysis found for this anomaly', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
