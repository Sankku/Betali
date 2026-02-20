const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { completeSignupSchema } = require('../validations/authValidation');
const { DatabaseConfig } = require('../config/database');
const logger = require('../config/logger');
const emailService = require('../services/EmailService');

/**
 * Authentication routes for SaaS signup flow
 * Handles post-signup organization creation
 */
const router = express.Router();

const userController = ServiceFactory.createUserController();
const organizationController = ServiceFactory.createOrganizationController();

/**
 * POST /api/auth/complete-signup
 * Complete user signup with organization creation
 *
 * Flow:
 * 1. Create/verify user in Supabase Auth
 * 2. Create user in database (organization_id = NULL initially)
 * 3. Create organization
 * 4. Update user with organization_id
 * 5. Create user-organization relationship (owner role)
 * 6. Generate and return session tokens
 */
router.post(
  '/complete-signup',
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.user),
  validateRequest(completeSignupSchema),
  async (req, res) => {
    const { user_id, email, name, organization_name, password } = req.body;

    logger.auth.signup(user_id, email);

    try {
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();

      // Step 1: Ensure user exists in Supabase Auth
      let authUser = null;
      let session = null;

      try {
        // Check if user already exists
        const { data: existingAuth, error: getError } = await supabase.auth.admin.getUserById(user_id);

        if (!getError && existingAuth.user) {
          logger.debug(`User exists in Supabase Auth | userId: ${user_id}`);
          authUser = existingAuth.user;

          // Try to generate session tokens via signInWithPassword
          if (password) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password
            });

            if (!signInError && signInData.session) {
              session = signInData.session;
              logger.debug(`Session generated via signInWithPassword | userId: ${user_id}`);
            }
          }
        }
      } catch (authCheckError) {
        logger.debug(`User not found in Supabase Auth, will create | userId: ${user_id}`);
      }

      // Create user in Supabase Auth if not exists
      if (!authUser) {
        const defaultPassword = password || `TempPass${Date.now()}!`;
        const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            name,
            user_id
          }
        });

        if (createAuthError) {
          logger.error(`Failed to create user in Supabase Auth | userId: ${user_id} | error: ${createAuthError.message}`);
          throw new Error(`Authentication setup failed: ${createAuthError.message}`);
        }

        authUser = newAuthUser.user;
        logger.db.created('auth_user', authUser.id);

        // Generate session for new user
        if (password) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: defaultPassword
          });

          if (!signInError && signInData.session) {
            session = signInData.session;
            logger.debug(`Session generated for new user | userId: ${authUser.id}`);
          }
        }
      }

      // If no session tokens, user might need to verify their email
      if (!session || !session.access_token) {
        logger.warn(`No session tokens available | userId: ${authUser.id}. Proceeding to create organization (requires login/email verification).`);
      }

      // Step 2: Create user in public.users table
      const userData = {
        user_id: authUser.id,
        email,
        name,
        organization_id: null, // Will be set after organization creation
        is_active: true
      };

      let user;
      try {
        user = await userController.createUserFromAuth(userData);
        logger.db.created('user', user.user_id);
      } catch (error) {
        // Handle duplicate user scenario
        if (error.message?.includes('already exists') || error.code === '23505') {
          logger.debug(`User already exists in database | userId: ${authUser.id}`);
          const userService = ServiceFactory.createUserService();
          user = await userService.findById(authUser.id);

          // If user already has organization, they're already set up
          if (user && user.organization_id) {
            logger.info(`User already has organization | userId: ${user.user_id} | orgId: ${user.organization_id}`);
            return res.status(200).json({
              success: true,
              message: 'User already registered and set up',
              data: {
                user: {
                  user_id: user.user_id,
                  email: user.email,
                  name: user.name,
                  organization_id: user.organization_id
                },
                tokens: session ? {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  token_type: session.token_type,
                  expires_in: session.expires_in
                } : null
              }
            });
          }
        } else {
          logger.error(`Failed to create user in database | userId: ${authUser.id} | error: ${error.message}`);
          throw error;
        }
      }

      // Step 3: Create organization
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
        owner_user_id: authUser.id
      };

      logger.debug(`Creating organization | name: ${defaultOrgName} | ownerId: ${authUser.id}`);
      const organization = await organizationService.organizationRepository.create(organizationData);
      logger.org.created(organization.organization_id, organization.name);

      // Step 4: Update user with organization_id
      const userService = ServiceFactory.createUserService();
      await userService.updateUser(authUser.id, {
        organization_id: organization.organization_id
      });
      logger.db.updated('user', authUser.id);

      // Step 5: Create user-organization relationship
      const relationshipData = {
        user_id: authUser.id,
        organization_id: organization.organization_id,
        role: 'super_admin',
        permissions: [],
        is_active: true,
        joined_at: new Date().toISOString()
      };

      const userOrgRelationship = await organizationService.userOrganizationRepository.create(relationshipData);
      logger.org.userAdded(organization.organization_id, authUser.id, 'super_admin');

      // Success response
      const response = {
        user: {
          user_id: authUser.id,
          email: user?.email || email,
          name: user?.name || name,
          organization_id: organization.organization_id
        },
        organization: {
          organization_id: organization.organization_id,
          name: organization.name,
          slug: organization.slug,
          owner_user_id: authUser.id
        },
        relationship: {
          role: relationshipData.role,
          permissions: relationshipData.permissions,
          joined_at: relationshipData.joined_at
        },
        tokens: session ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: session.token_type,
          expires_in: session.expires_in,
          expires_at: session.expires_at
        } : null,
        message: session ? 'Signup completed successfully! Welcome to Betali.' : 'Signup completed. Please verify your email to log in.'
      };

      logger.auth.signupSuccess(authUser.id, organization.organization_id);

      // Send welcome email — fire-and-forget (don't block the response if it fails)
      emailService.sendWelcomeEmail({ to: email, userName: name }).catch(err =>
        logger.error(`Welcome email failed for ${email}: ${err.message}`)
      );

      res.status(201).json({
        success: true,
        data: response,
        meta: {
          signupCompleted: true,
          organizationCreated: true,
          userRole: 'super_admin',
          tokensProvided: !!session
        }
      });

    } catch (error) {
      logger.auth.signupFailed(user_id, error.message);

      // Categorize errors
      const isAuthError = error.message?.includes('Authentication') || error.message?.includes('Supabase');
      const isDBError = error.code?.startsWith('23'); // PostgreSQL error codes
      const isDuplicateEmail = error.message?.includes('already been registered');

      let statusCode = 500;
      let errorMessage = error.message || 'Registration failed. Please try again.';

      // Provide specific error messages
      if (isDuplicateEmail) {
        statusCode = 409;
        errorMessage = error.message; // Use the specific Supabase message
      } else if (isAuthError) {
        statusCode = 401;
        errorMessage = error.message; // Use the specific auth error message
      } else if (isDBError) {
        statusCode = 409;
        errorMessage = 'User or organization already exists.';
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
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
      logger.error(`Failed to check signup status | error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to check signup status'
      });
    }
  }
);

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post(
  '/login',
  createLimiter,
  sanitizeMiddleware(SANITIZATION_RULES.auth),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      logger.auth.login(email);

      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();

      // Use Supabase Auth to authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        logger.auth.loginFailed(email, authError?.message || 'No user returned');
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      const user = authData.user;
      const session = authData.session;

      logger.auth.loginSuccess(user.id);

      // Get user profile from database
      const userService = ServiceFactory.createUserService();
      let userProfile;
      try {
        userProfile = await userService.getUserById(user.id);
      } catch (error) {
        logger.warn(`User profile not found in database | userId: ${user.id}`);
        userProfile = {
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0]
        };
      }

      // Get user organizations
      const organizationService = ServiceFactory.createOrganizationService();
      let userOrganizations = [];
      try {
        userOrganizations = await organizationService.getUserOrganizations(user.id);
      } catch (error) {
        logger.warn(`Could not fetch user organizations | userId: ${user.id} | error: ${error.message}`);
      }

      const response = {
        user: {
          user_id: userProfile.user_id,
          email: userProfile.email,
          name: userProfile.name,
          organization_id: userProfile.organization_id
        },
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          token_type: session.token_type,
          expires_in: session.expires_in,
          expires_at: session.expires_at
        },
        organizations: userOrganizations,
        message: 'Login successful! Welcome back.'
      };

      res.status(200).json({
        success: true,
        data: response,
        meta: {
          organizationCount: userOrganizations.length,
          hasOrganizations: userOrganizations.length > 0
        }
      });

    } catch (error) {
      logger.error(`Login failed | error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      logger.error(`User setup check failed | error: ${error.message}`);
      next(error);
    }
  }
);

module.exports = router;
