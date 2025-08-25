const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');

/**
 * Authentication routes for SaaS signup flow
 * Handles post-signup organization creation
 */
const router = express.Router();

const userController = ServiceFactory.createUserController();
const organizationController = ServiceFactory.createOrganizationController();

// Validation schemas
const completeSignupSchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    organization_name: { type: 'string', minLength: 1, maxLength: 255 }
  },
  required: ['user_id', 'email', 'name'],
  additionalProperties: false
};

/**
 * POST /api/auth/complete-signup
 * Complete the signup process by creating the user's first organization
 * This should be called immediately after Supabase Auth signup
 */
router.post(
  '/complete-signup',
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  // validateRequest(completeSignupSchema), // TODO: Fix validation schema
  async (req, res, next) => {
    try {
      const { user_id, email, name, organization_name } = req.body;
      
      console.log('🚀 Starting SaaS signup completion for user:', user_id);
      
      // 1. First create the organization
      console.log('🏢 Creating organization first to satisfy constraints...');
      const defaultOrgName = organization_name || `${name}'s Organization`;
      const orgSlug = defaultOrgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      // Create organization without owner first (to avoid FK constraint)
      const organizationService = ServiceFactory.createOrganizationService();
      const organizationData = {
        name: defaultOrgName,
        slug: orgSlug
        // Don't set owner_user_id yet - user doesn't exist
      };
      
      console.log('🏢 Creating organization:', organizationData);
      const organization = await organizationService.organizationRepository.create(organizationData);
      console.log('✅ Organization created:', organization.organization_id);
      
      // 2. Now create user WITH organization_id to satisfy constraint
      const userData = {
        user_id,
        email,
        name,
        organization_id: organization.organization_id, // Set it immediately
        is_active: true
      };
      
      let user;
      try {
        user = await userController.createUserFromAuth(userData);
        console.log('✅ User created in database:', user.user_id);
      } catch (error) {
        // User might already exist, try to get existing user
        if (error.message?.includes('already exists') || error.code === '23505') {
          console.log('ℹ️  User already exists, fetching existing user');
          user = { user_id, email, name };
        } else {
          throw error;
        }
      }
      
      // 3. Create the owner relationship
      const ownerRelationship = await organizationService.userOrganizationRepository.create({
        user_id: user_id,
        organization_id: organization.organization_id,
        role: 'super_admin', // Using existing role system for now
        permissions: ['*'] // Owner has all permissions
      });
      
      console.log('✅ Owner relationship created:', ownerRelationship.user_organization_id);
      
      // 4. User already has organization_id set, skip update
      console.log('✅ User already has organization_id set');
      
      // 5. Update organization with owner
      await organizationService.organizationRepository.update(organization.organization_id, {
        owner_user_id: user_id
      });
      console.log('✅ Organization owner updated');
      
      const result = { organization: { ...organization, owner_user_id: user_id }, ownerRelationship };
      
      // 3. Return the complete context for the frontend
      const response = {
        user: {
          user_id,
          email,
          name
        },
        organization: {
          organization_id: result.organization.organization_id,
          name: result.organization.name,
          slug: result.organization.slug,
          owner_user_id: user_id
        },
        userRole: 'owner',
        permissions: ['*'],
        ownerRelationship: result.ownerRelationship,
        message: 'Signup completed successfully! Welcome to AgroPanel.'
      };
      
      console.log('🎉 SaaS signup completion successful');
      
      res.status(201).json({
        data: response,
        meta: {
          signupCompleted: true,
          organizationCreated: true,
          userRole: 'owner'
        }
      });
      
    } catch (error) {
      console.error('❌ Signup completion failed:', error);
      next(error);
    }
  }
);

/**
 * POST /api/auth/check-user-setup
 * Check if a user has completed their setup (has organizations)
 * Used to redirect users who signed up but didn't complete setup
 */
router.post(
  '/check-user-setup',
  createLimiter,
  // validateRequest({
  //   type: 'object',
  //   properties: {
  //     user_id: { type: 'string', format: 'uuid' }
  //   },
  //   required: ['user_id'],
  //   additionalProperties: false
  // }), // TODO: Fix validation schema
  async (req, res, next) => {
    try {
      const { user_id } = req.body;
      
      // Check if user has any organizations using the service
      const organizationService = ServiceFactory.createOrganizationService();
      const userOrganizations = await organizationService.getUserOrganizations(user_id);
      
      const hasSetup = userOrganizations && userOrganizations.length > 0;
      
      res.json({
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