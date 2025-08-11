const express = require('express');
const { ServiceFactory } = require('../config/container');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, validateQuery } = require('../middleware/validation');
const { createLimiter, searchLimiter } = require('../middleware/rateLimiting');
const { requirePermission, PERMISSIONS } = require('../middleware/permissions');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { 
  createUserSchema, 
  updateUserSchema, 
  queryParamsSchema,
  changePasswordSchema
} = require('../validations/userValidation');

const router = express.Router();

const userController = ServiceFactory.createUserController();

router.use(authenticateUser);

// Get all users (admin only)
router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_READ),
  validateQuery(queryParamsSchema),
  async (req, res, next) => {
    try {
      await userController.getUsers(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Get current user profile
router.get(
  '/profile',
  async (req, res, next) => {
    try {
      await userController.getCurrentUserProfile(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Get user by ID
router.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_READ),
  async (req, res, next) => {
    try {
      await userController.getUserById(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Create new user (admin only)
router.post(
  '/',
  requirePermission(PERMISSIONS.USERS_CREATE),
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  validateRequest(createUserSchema),
  async (req, res, next) => {
    try {
      await userController.createUser(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Update user (admin or self)
router.put(
  '/:id',
  requirePermission(PERMISSIONS.USERS_UPDATE),
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  validateRequest(updateUserSchema),
  async (req, res, next) => {
    try {
      await userController.updateUser(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Update current user profile
router.put(
  '/profile/update',
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  validateRequest(updateUserSchema),
  async (req, res, next) => {
    try {
      await userController.updateCurrentUserProfile(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.put(
  '/profile/password',
  createLimiter,
  validateRequest(changePasswordSchema),
  async (req, res, next) => {
    try {
      await userController.changePassword(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Deactivate user (soft delete)
router.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_DELETE),
  async (req, res, next) => {
    try {
      await userController.deactivateUser(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;