const express = require('express');
const { z } = require('zod');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { ReadingStore } = require('../db/readingStore');

const router = express.Router();

// Apply authentication middleware to all water-reading endpoints
router.use(authenticateToken);

// Validation Schemas
const CreateReadingSchema = z.object({
  location_name: z.string().trim().min(1, 'Location name is required'),
  ph_level: z
    .number()
    .min(0, 'pH level must be at least 0.00')
    .max(14, 'pH level cannot exceed 14.00')
    .optional()
    .nullable(),
  turbidity_ntu: z
    .number()
    .min(0, 'Turbidity (NTU) must be a positive number')
    .optional()
    .nullable(),
  dissolved_oxygen_mg_l: z
    .number()
    .min(0, 'Dissolved oxygen (mg/L) must be a positive number')
    .optional()
    .nullable(),
  temperature_celsius: z.number().optional().nullable(),
  contaminant_ppm: z
    .number()
    .min(0, 'Contaminant (PPM) must be a positive number')
    .optional()
    .nullable(),
  flow_rate_lps: z
    .number()
    .min(0, 'Flow rate / volume (litres) must be a positive number')
    .optional()
    .nullable(),
  recorded_at: z
    .string()
    .datetime({ message: 'recorded_at must be a valid ISO 8601 date string' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recorded_at must be a valid YYYY-MM-DD or ISO date string'))
    .optional()
    .nullable(),
});

const UpdateReadingSchema = CreateReadingSchema.partial();

const ListReadingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  location_name: z.string().optional(),
  start_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'start_date must be a valid date' })
    .optional(),
  end_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'end_date must be a valid date' })
    .optional(),
});

/**
 * POST /api/water-readings
 * Create a new water reading (Scoped to authenticated user)
 */
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreateReadingSchema.parse(req.body);
    const reading = await ReadingStore.createReading(req.user.id, validatedData);

    return res.status(201).json({
      message: 'Water reading created successfully',
      data: reading,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/water-readings
 * List water readings with filters & pagination (Scoped to authenticated user)
 */
router.get('/', async (req, res, next) => {
  try {
    const query = ListReadingsQuerySchema.parse(req.query);
    const result = await ReadingStore.listReadings(req.user.id, query);

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
 * GET /api/water-readings/:id
 * Get single water reading by ID (User isolation enforced)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const reading = await ReadingStore.getReadingById(req.user.id, req.params.id);
    if (!reading) {
      throw new AppError('Water reading not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      data: reading,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/water-readings/:id
 * Update water reading by ID (User isolation enforced)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = UpdateReadingSchema.parse(req.body);
    const updated = await ReadingStore.updateReading(req.user.id, req.params.id, validatedData);

    if (!updated) {
      throw new AppError('Water reading not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      message: 'Water reading updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/water-readings/:id
 * Delete water reading by ID (User isolation enforced)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await ReadingStore.deleteReading(req.user.id, req.params.id);
    if (!deleted) {
      throw new AppError('Water reading not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      message: 'Water reading deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
