const express = require('express');
const { z } = require('zod');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { InterventionStore } = require('../db/interventionStore');

const router = express.Router();

// Apply authentication middleware to all intervention endpoints
router.use(authenticateToken);

const CreateInterventionSchema = z.object({
  location_name: z.string().trim().min(1, 'location_name is required'),
  action_type: z.string().trim().min(1, 'action_type is required'),
  anomaly_id: z.string().uuid('anomaly_id must be a valid UUID').optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional().default('planned'),
  notes: z.string().optional().nullable(),
  start_date: z
    .string()
    .datetime({ message: 'start_date must be a valid ISO 8601 date string' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date must be a valid YYYY-MM-DD string'))
    .optional()
    .nullable(),
  completion_date: z
    .string()
    .datetime({ message: 'completion_date must be a valid ISO 8601 date string' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'completion_date must be a valid YYYY-MM-DD string'))
    .optional()
    .nullable(),
});

const UpdateInterventionSchema = CreateInterventionSchema.partial();

const ListInterventionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  location_name: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
  anomaly_id: z.string().uuid().optional(),
});

/**
 * POST /api/interventions
 * Create a new intervention action (Scoped to authenticated user)
 */
router.post('/', async (req, res, next) => {
  try {
    const validatedData = CreateInterventionSchema.parse(req.body);
    const intervention = await InterventionStore.createIntervention(req.user.id, validatedData);

    return res.status(201).json({
      message: 'Intervention created successfully',
      data: intervention,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/interventions
 * List interventions with filters & pagination (Scoped to authenticated user)
 */
router.get('/', async (req, res, next) => {
  try {
    const query = ListInterventionsQuerySchema.parse(req.query);
    const result = await InterventionStore.listInterventions(req.user.id, query);

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
 * GET /api/interventions/:id
 * Get single intervention by ID (Scoped to authenticated user)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const item = await InterventionStore.getInterventionById(req.user.id, req.params.id);
    if (!item) {
      throw new AppError('Intervention not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/interventions/:id
 * Update intervention by ID (Scoped to authenticated user)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = UpdateInterventionSchema.parse(req.body);
    const updated = await InterventionStore.updateIntervention(req.user.id, req.params.id, validatedData);

    if (!updated) {
      throw new AppError('Intervention not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      message: 'Intervention updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/interventions/:id
 * Delete intervention by ID (Scoped to authenticated user)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await InterventionStore.deleteIntervention(req.user.id, req.params.id);
    if (!deleted) {
      throw new AppError('Intervention not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json({
      message: 'Intervention deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/interventions/:id/impact
 * Calculate pre- vs post-intervention water savings impact (Scoped to authenticated user)
 */
router.get('/:id/impact', async (req, res, next) => {
  try {
    const impactResult = await InterventionStore.calculateImpact(req.user.id, req.params.id);
    if (!impactResult) {
      throw new AppError('Intervention not found', 404, 'NOT_FOUND');
    }

    return res.status(200).json(impactResult);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
