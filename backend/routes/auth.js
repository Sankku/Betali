const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { completeSignupSchema } = require('../validations/authValidation');
const { DatabaseConfig } = require('../config/database');

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
      const { user_id, email, name, organization_name, password } = req.body;
      
      console.log('🚀 Starting enhanced SaaS signup for user:', user_id);
      
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();
      
      // Step 1: Ensure user exists in Supabase Auth
      let authUser = null;
      let accessToken = null;
      let refreshToken = null;
      
      try {
        // First, try to get user from Supabase Auth
        const { data: existingAuth, error: getError } = await supabase.auth.admin.getUserById(user_id);
        
        if (!getError && existingAuth.user) {
          console.log('✅ User already exists in Supabase Auth');
          authUser = existingAuth.user;
          
          // Generate access token for existing user - use recovery token method
          const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email
          });
          
          if (!sessionError && sessionData) {
            accessToken = sessionData.properties?.access_token;
            refreshToken = sessionData.properties?.refresh_token;
            
            // If properties don't have tokens, try to sign in the user
            if (!accessToken) {
              // Create a temporary session using the generated URL
              const url = sessionData.properties?.action_link;
              if (url) {
                const urlParams = new URL(url);
                const code = urlParams.searchParams.get('code');
                if (code) {
                  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                  if (!exchangeError && exchangeData.session) {
                    accessToken = exchangeData.session.access_token;
                    refreshToken = exchangeData.session.refresh_token;
                  }
                }
              }
            }
          }
        }
      } catch (authCheckError) {
        console.log('ℹ️ User not found in Supabase Auth, will create new one');
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
          console.error('❌ Failed to create user in Supabase Auth:', createAuthError.message);
          throw createAuthError;
        }
        
        authUser = newAuthUser.user;
        console.log('✅ User created in Supabase Auth:', authUser.id);
        
        // Generate session for new user
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email
        });
        
        if (!sessionError && sessionData) {
          accessToken = sessionData.properties?.access_token;
          refreshToken = sessionData.properties?.refresh_token;
        }
      }
      
      // Step 2: Create user in public.users table
      const userData = {
        user_id: authUser.id, // Use Supabase Auth ID
        email,
        name,
        organization_id: null,
        is_active: true
      };
      
      let user;
      try {
        user = await userController.createUserFromAuth(userData);
        console.log('✅ User created in database successfully:', user.user_id);
      } catch (error) {
        // Handle duplicate user scenario
        if (error.message?.includes('already exists') || error.code === '23505') {
          console.log('ℹ️ User already exists in database, continuing with existing user');
          const userService = ServiceFactory.createUserService();
          user = await userService.findById(authUser.id);
          
          // If user already has organization, they're already set up
          if (user && user.organization_id) {
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
                },
                tokens: {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  token_type: 'bearer'
                }
              }
            });
          }
        } else {
          console.error('❌ Failed to create user in database:', error.message);
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
      
      console.log('🏢 Creating organization:', defaultOrgName);
      const organization = await organizationService.organizationRepository.create(organizationData);
      console.log('✅ Organization created:', organization.organization_id);
      
      // Step 4: Update user with organization_id
      const userService = ServiceFactory.createUserService();
      await userService.updateUser(authUser.id, {
        organization_id: organization.organization_id
      });
      console.log('✅ User updated with organization_id');
      
      // Step 5: Create user-organization relationship (owner = super_admin in current schema)
      const relationshipData = {
        user_id: authUser.id,
        organization_id: organization.organization_id,
        role: 'super_admin',
        permissions: [],
        is_active: true,
        joined_at: new Date().toISOString()
      };
      
      const userOrgRelationship = await organizationService.userOrganizationRepository.create(relationshipData);
      console.log('✅ Owner relationship created:', userOrgRelationship.user_organization_id);
      
      // Step 6: Generate final session tokens if not available
      if (!accessToken) {
        try {
          // For testing purposes, create a simple JWT-like token
          // In production, this should use proper Supabase token generation
          const crypto = require('crypto');
          const tokenPayload = {
            sub: authUser.id,
            email: authUser.email,
            user_metadata: {
              name: user?.name || name
            },
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
          };
          
          // Create a base64 encoded token (for testing - NOT production ready)
          accessToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
          refreshToken = crypto.randomBytes(32).toString('hex');
          
          console.log('🔧 Generated temporary tokens for testing purposes');
        } catch (sessionGenError) {
          console.warn('⚠️ Could not generate session tokens:', sessionGenError.message);
        }
      }
      
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
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: 3600
        },
        message: 'Signup completed successfully! Welcome to Betali.'
      };
      
      console.log('🎉 Enhanced signup completed successfully with tokens');
      
      res.status(201).json({
        success: true,
        data: response,
        meta: {
          signupCompleted: true,
          organizationCreated: true,
          userRole: 'super_admin',
          tokensProvided: !!accessToken
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
      
      console.log('🔐 Login attempt for:', email);
      
      const dbConfig = new DatabaseConfig();
      const supabase = dbConfig.getClient();
      
      // Use Supabase Auth to authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError || !authData.user) {
        console.log('❌ Login failed:', authError?.message || 'No user returned');
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }
      
      const user = authData.user;
      const session = authData.session;
      
      console.log('✅ Authentication successful for:', user.email);
      
      // Get user profile from database
      const userService = ServiceFactory.createUserService();
      let userProfile;
      try {
        userProfile = await userService.getUserById(user.id);
      } catch (error) {
        console.warn('⚠️ User profile not found in database, using auth data');
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
        console.warn('⚠️ Could not fetch user organizations:', error.message);
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
      
      console.log('🎉 Login completed successfully');
      
      res.status(200).json({
        success: true,
        data: response,
        meta: {
          organizationCount: userOrganizations.length,
          hasOrganizations: userOrganizations.length > 0
        }
      });
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
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
      console.error('❌ User setup check failed:', error);
      next(error);
    }
  }
);

module.exports = router;