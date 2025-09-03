const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { completeSignupSchema } = require('../validations/authValidation');

/**
 * Authentication routes for SaaS signup flow
 * Handles post-signup organization creation
 */
const router = express.Router();

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
      
      console.log('🚀 Starting simplified SaaS signup for user:', user_id);
      
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
        console.log('✅ User created successfully:', user.user_id);
      } catch (error) {
        // Handle duplicate user scenario
        if (error.message?.includes('already exists') || error.code === '23505') {
          console.log('ℹ️ User already exists, continuing with existing user');
          const userService = ServiceFactory.createUserService();
          user = await userService.findById(user_id);
          
          // If user already has organization, they're already set up
          if (user.organization_id) {
            console.log('✅ User already has organization, signup complete');
            return res.status(200).json({
              success: true,
              message: 'User already registered and set up',
              data: {
                user: {
                  user_id: user.user_id,
                  email: user.email,
                  name: user.name,
                  organization_id: user.organization_id
                }
              }
            });
          }
        } else {
          console.error('❌ Failed to create user:', error.message);
          throw error;
        }
      }
      
      // Step 2: Create organization
      const defaultOrgName = organization_name || `${name}'s Organization`;
      const baseSlug = defaultOrgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40)
        .trim();
      
      // Make slug unique by adding timestamp
      const orgSlug = `${baseSlug}-${Date.now()}`;
      
      const organizationService = ServiceFactory.createOrganizationService();
      const organizationData = {
        name: defaultOrgName,
        slug: orgSlug,
        owner_user_id: user_id
      };
      
      console.log('🏢 Creating organization:', defaultOrgName);
      const organization = await organizationService.organizationRepository.create(organizationData);
      console.log('✅ Organization created:', organization.organization_id);
      
      // Step 3: Update user with organization_id
      const userService = ServiceFactory.createUserService();
      await userService.updateUser(user_id, {
        organization_id: organization.organization_id
      });
      console.log('✅ User updated with organization_id');
      
      // Step 4: Create user-organization relationship (owner = super_admin in current schema)
      const relationshipData = {
        user_id: user_id,
        organization_id: organization.organization_id,
        role: 'super_admin', // Using super_admin as owner role in current schema
        permissions: [],
        is_active: true,
        joined_at: new Date().toISOString()
      };
      
      const userOrgRelationship = await organizationService.userOrganizationRepository.create(relationshipData);
      console.log('✅ Owner relationship created:', userOrgRelationship.user_organization_id);
      
      // Success response
      const response = {
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
        },
        message: 'Signup completed successfully! Welcome to Betali.'
      };
      
      console.log('🎉 Signup completed successfully');
      
      res.status(201).json({
        success: true,
        data: response,
        meta: {
          signupCompleted: true,
          organizationCreated: true,
          userRole: 'super_admin' // Owner role mapped to super_admin in current schema
        }
      });
      
    } catch (error) {
      console.error('❌ Signup failed:', error.message);
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
      
      const user = await userService.getUserById(user_id);
      
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
        data: {
          signupCompleted: status === 'complete',
          user: {
            user_id: user.user_id,
            email: user.email,
            name: user.name,
            organization_id: user.organization_id,
            is_active: user.is_active
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to check signup status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check signup status'
      });
    }
  }
);

/**
 * POST /api/auth/check-user-setup
 * Legacy endpoint - check if user has organizations
 */
router.post(
  '/check-user-setup',
  createLimiter,
  async (req, res, next) => {
    try {
      const { user_id } = req.body;
      
      const organizationService = ServiceFactory.createOrganizationService();
      const userOrganizations = await organizationService.getUserOrganizations(user_id);
      
      const hasSetup = userOrganizations && userOrganizations.length > 0;
      
      res.json({
        success: true,
        data: {
          user_id,
          hasCompletedSetup: hasSetup,
          organizationCount: userOrganizations?.length || 0,
          organizations: hasSetup ? userOrganizations : []
        }
      });
      
    } catch (error) {
      console.error('❌ User setup check failed:', error);
      next(error);
    }
  }
);

module.exports = router;