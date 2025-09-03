const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { completeSignupSchema } = require('../validations/authValidation');
const { Logger } = require('../utils/Logger');

/**
 * Simplified SaaS signup flow - much more reliable
 */
const router = express.Router();
const logger = new Logger('AuthRoutes');

const userController = ServiceFactory.createUserController();
const organizationController = ServiceFactory.createOrganizationController();

/**
 * POST /api/auth/complete-signup
 * Simplified signup: Create user first, then organization, then link them
 */
router.post(
  '/complete-signup',
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  validateRequest(completeSignupSchema),
  async (req, res, next) => {
    try {
      const { user_id, email, name, organization_name } = req.body;
      
      logger.info('🚀 Starting simplified SaaS signup', { user_id, email });
      
      // Step 1: Create user WITHOUT organization_id (constraint now allows this temporarily)
      const userData = {
        user_id,
        email,
        name,
        organization_id: null, // Explicitly null - allowed by new constraint
        is_active: true
      };
      
      let user;
      try {
        user = await userController.createUserFromAuth(userData);
        logger.info('✅ User created successfully', { user_id: user.user_id });
      } catch (error) {
        // Handle duplicate user scenario
        if (error.message?.includes('already exists') || error.code === '23505') {
          logger.info('ℹ️ User already exists, continuing with existing user', { user_id });
          // Get existing user data
          const userService = ServiceFactory.createUserService();
          user = await userService.findById(user_id);
          
          // If user already has organization, they're already set up
          if (user.organization_id) {
            logger.info('✅ User already has organization, signup complete', { 
              user_id, 
              organization_id: user.organization_id 
            });
            
            return res.status(200).json({
              success: true,
              message: 'User already registered and set up',
              user: {
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                organization_id: user.organization_id
              }
            });
          }
        } else {
          logger.error('❌ Failed to create user', { error: error.message, user_id });
          throw error;
        }
      }
      
      // Step 2: Create organization
      const defaultOrgName = organization_name || `${name}'s Organization`;
      const orgSlug = defaultOrgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50) // Limit length
        .trim();
      
      const organizationService = ServiceFactory.createOrganizationService();
      const organizationData = {
        name: defaultOrgName,
        slug: orgSlug,
        owner_user_id: user_id // Set owner immediately
      };
      
      logger.info('🏢 Creating organization', { name: defaultOrgName, slug: orgSlug });
      const organization = await organizationService.organizationRepository.create(organizationData);
      logger.info('✅ Organization created', { organization_id: organization.organization_id });
      
      // Step 3: Update user with organization_id
      const userService = ServiceFactory.createUserService();
      await userService.update(user_id, {
        organization_id: organization.organization_id
      });
      logger.info('✅ User updated with organization_id', { 
        user_id, 
        organization_id: organization.organization_id 
      });
      
      // Step 4: Create user-organization relationship (owner)
      const relationshipData = {
        user_id: user_id,
        organization_id: organization.organization_id,
        role: 'owner', // Use the new role system
        permissions: [], // Will be populated based on role
        is_active: true,
        joined_at: new Date().toISOString()
      };
      
      const userOrgRelationship = await organizationService.userOrganizationRepository.create(relationshipData);
      logger.info('✅ Owner relationship created', { 
        user_organization_id: userOrgRelationship.user_organization_id 
      });
      
      // Success response with all necessary data
      const response = {
        success: true,
        message: 'Signup completed successfully',
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          organization_id: organization.organization_id
        },
        organization: {
          organization_id: organization.organization_id,
          name: organization.name,
          slug: organization.slug,
          owner_user_id: user_id
        },
        relationship: {
          role: relationshipData.role,
          permissions: relationshipData.permissions,
          joined_at: relationshipData.joined_at
        }
      };
      
      logger.info('🎉 Signup completed successfully', { 
        user_id, 
        organization_id: organization.organization_id 
      });
      
      res.status(201).json(response);
      
    } catch (error) {
      logger.error('❌ Signup failed', { 
        error: error.message, 
        stack: error.stack,
        body: req.body 
      });
      
      // Return user-friendly error
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/auth/signup-status/:user_id
 * Check signup status for a user
 */
router.get(
  '/signup-status/:user_id',
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const userService = ServiceFactory.createUserService();
      
      const user = await userService.findById(user_id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          status: 'not_found',
          message: 'User not found'
        });
      }
      
      const status = user.organization_id ? 'complete' : 'pending';
      
      res.json({
        success: true,
        status,
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          organization_id: user.organization_id,
          is_active: user.is_active
        }
      });
      
    } catch (error) {
      logger.error('❌ Failed to check signup status', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to check signup status'
      });
    }
  }
);

module.exports = router;