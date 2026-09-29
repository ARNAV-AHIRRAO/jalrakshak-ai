const express = require('express');
const { z } = require('zod');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { AnomalyStore } = require('../db/anomalyStore');
const { ReadingStore } = require('../db/readingStore');

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

const AnalyzeRequestSchema = z
  .object({
    reading_id: z.string().uuid('reading_id must be a valid UUID').optional(),
    location_name: z.string().trim().min(1, 'location_name cannot be empty').optional(),
  })
  .refine((data) => data.reading_id || data.location_name, {
    message: 'Either reading_id or location_name must be provided for analysis',
  });

const ListAnomaliesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['detected', 'investigating', 'resolved', 'ignored']).optional(),
});

/**
 * POST /api/anomalies/analyze
 * Perform deterministic anomaly analysis for a reading or location
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const validatedData = AnalyzeRequestSchema.parse(req.body);
    let targetReading = null;

    if (validatedData.reading_id) {
      targetReading = await ReadingStore.getReadingById(req.user.id, validatedData.reading_id);
      if (!targetReading) {
        throw new AppError('Water reading not found', 404, 'NOT_FOUND');
      }
    } else if (validatedData.location_name) {
      const { data: readings } = await ReadingStore.listReadings(req.user.id, {
        location_name: validatedData.location_name,
        limit: 1,
      });

      if (!readings || readings.length === 0) {
        throw new AppError(
          `No water readings found for location "${validatedData.location_name}"`,
          404,
          'NOT_FOUND'
        );
      }
      targetReading = readings[0];
    }

    const result = await AnomalyStore.analyzeReading(req.user.id, targetReading);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anomalies
 * List detected anomalies (Scoped to authenticated user)
 */
router.get('/', async (req, res, next) => {
  try {
    const query = ListAnomaliesQuerySchema.parse(req.query);
    const result = await AnomalyStore.listAnomalies(req.user.id, query);

    const totalPages = Math.ceil(result.total / query.limit) || 1;

    return res.status(200).json({
      data: result.data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anomalies/:id
 * Get single anomaly detail by ID (Scoped to authenticated user)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const anomaly = await AnomalyStore.getAnomalyById(req.user.id, req.params.id);
    if (!anomaly) {
      throw new AppError('Anomaly not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      data: anomaly,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
