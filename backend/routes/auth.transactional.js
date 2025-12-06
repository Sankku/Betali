const express = require('express');
const { ServiceFactory } = require('../config/container');
const { validateRequest } = require('../middleware/validation');
const { createLimiter } = require('../middleware/rateLimiting');
const { sanitizeMiddleware, SANITIZATION_RULES } = require('../middleware/sanitization');
const { completeSignupSchema } = require('../validations/authValidation');
const { DatabaseConfig } = require('../config/database');
const logger = require('../config/logger');
const { withTransaction } = require('../utils/transactionManager');

/**
 * Authentication routes with transactional signup
 */
const router = express.Router();

const userController = ServiceFactory.createUserController();
const organizationController = ServiceFactory.createOrganizationController();

/**
 * POST /api/auth/complete-signup
 * Complete user signup with organization creation (ATOMIC)
 *
 * This endpoint uses a transaction manager to ensure atomicity:
 * - If ANY step fails, ALL completed steps are rolled back
 * - User won't be left in a partial state
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
      // Use transaction manager for atomic signup
      const result = await withTransaction(async (tx) => {
        const dbConfig = new DatabaseConfig();
        const supabase = dbConfig.getClient();

        // Step 1: Ensure user exists in Supabase Auth
        const authUser = await tx.execute(
          'createAuthUser',
          async () => {
            try {
              // Check if user already exists
              const { data: existingAuth, error: getError } = await supabase.auth.admin.getUserById(user_id);

              if (!getError && existingAuth.user) {
                logger.debug(`User exists in Supabase Auth | userId: ${user_id}`);
                return { user: existingAuth.user, created: false };
              }
            } catch (authCheckError) {
              logger.debug(`User not found in Supabase Auth, will create | userId: ${user_id}`);
            }

            // Create user in Supabase Auth
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

            logger.db.created('auth_user', newAuthUser.user.id);
            return { user: newAuthUser.user, created: true };
          },
          // Rollback: Delete auth user if it was created
          async (result) => {
            if (result.created) {
              try {
                await supabase.auth.admin.deleteUser(result.user.id);
                logger.debug(`Rolled back auth user creation | userId: ${result.user.id}`);
              } catch (error) {
                logger.error(`Failed to rollback auth user | userId: ${result.user.id} | error: ${error.message}`);
              }
            }
          }
        );

        // Step 2: Generate session tokens
        const session = await tx.execute(
          'generateSession',
          async () => {
            if (!password) {
              throw new Error('Password is required for session generation');
            }

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password: authUser.created ? password : password
            });

            if (signInError || !signInData.session) {
              throw new Error('Failed to generate authentication tokens');
            }

            logger.debug(`Session generated | userId: ${authUser.user.id}`);
            return signInData.session;
          },
          null // No rollback needed - session will expire
        );

        // Step 3: Create user in public.users table
        const user = await tx.execute(
          'createUser',
          async () => {
            const userData = {
              user_id: authUser.user.id,
              email,
              name,
              organization_id: null, // Will be set after organization creation
              is_active: true
            };

            try {
              const createdUser = await userController.createUserFromAuth(userData);
              logger.db.created('user', createdUser.user_id);
              return createdUser;
            } catch (error) {
              // Handle duplicate user scenario
              if (error.message?.includes('already exists') || error.code === '23505') {
                logger.debug(`User already exists in database | userId: ${authUser.user.id}`);
                const userService = ServiceFactory.createUserService();
                const existingUser = await userService.findById(authUser.user.id);

                // If user already has organization, they're already set up
                if (existingUser && existingUser.organization_id) {
                  // Return early - user is already set up
                  throw new Error('USER_ALREADY_SETUP');
                }

                return existingUser;
              }
              throw error;
            }
          },
          // Rollback: Delete user from database
          async (user) => {
            try {
              const dbConfig = new DatabaseConfig();
              const supabase = dbConfig.getClient();
              await supabase.from('users').delete().eq('user_id', user.user_id);
              logger.debug(`Rolled back user creation | userId: ${user.user_id}`);
            } catch (error) {
              logger.error(`Failed to rollback user | userId: ${user.user_id} | error: ${error.message}`);
            }
          }
        );

        // Step 4: Create organization
        const organization = await tx.execute(
          'createOrganization',
          async () => {
            const defaultOrgName = organization_name || `${name}'s Organization`;
            const baseSlug = defaultOrgName
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 40)
              .trim();

            const orgSlug = `${baseSlug}-${Date.now()}`;

            const organizationService = ServiceFactory.createOrganizationService();
            const organizationData = {
              name: defaultOrgName,
              slug: orgSlug,
              owner_user_id: authUser.user.id
            };

            logger.debug(`Creating organization | name: ${defaultOrgName} | ownerId: ${authUser.user.id}`);
            const org = await organizationService.organizationRepository.create(organizationData);
            logger.org.created(org.organization_id, org.name);

            return org;
          },
          // Rollback: Delete organization
          async (org) => {
            try {
              const organizationService = ServiceFactory.createOrganizationService();
              await organizationService.organizationRepository.delete(org.organization_id);
              logger.debug(`Rolled back organization creation | orgId: ${org.organization_id}`);
            } catch (error) {
              logger.error(`Failed to rollback organization | orgId: ${org.organization_id} | error: ${error.message}`);
            }
          }
        );

        // Step 5: Update user with organization_id
        await tx.execute(
          'updateUserOrganization',
          async () => {
            const userService = ServiceFactory.createUserService();
            await userService.updateUser(authUser.user.id, {
              organization_id: organization.organization_id
            });
            logger.db.updated('user', authUser.user.id);
            return { userId: authUser.user.id, orgId: organization.organization_id };
          },
          // Rollback: Remove organization_id from user
          async (update) => {
            try {
              const userService = ServiceFactory.createUserService();
              await userService.updateUser(update.userId, {
                organization_id: null
              });
              logger.debug(`Rolled back user organization assignment | userId: ${update.userId}`);
            } catch (error) {
              logger.error(`Failed to rollback user update | userId: ${update.userId} | error: ${error.message}`);
            }
          }
        );

        // Step 6: Create user-organization relationship
        const relationship = await tx.execute(
          'createRelationship',
          async () => {
            const relationshipData = {
              user_id: authUser.user.id,
              organization_id: organization.organization_id,
              role: 'super_admin',
              permissions: [],
              is_active: true,
              joined_at: new Date().toISOString()
            };

            const organizationService = ServiceFactory.createOrganizationService();
            const userOrgRelationship = await organizationService.userOrganizationRepository.create(relationshipData);
            logger.org.userAdded(organization.organization_id, authUser.user.id, 'super_admin');

            return userOrgRelationship;
          },
          // Rollback: Delete relationship
          async (relationship) => {
            try {
              const dbConfig = new DatabaseConfig();
              const supabase = dbConfig.getClient();
              await supabase
                .from('user_organizations')
                .delete()
                .eq('user_organization_id', relationship.user_organization_id);
              logger.debug(`Rolled back relationship creation | relationshipId: ${relationship.user_organization_id}`);
            } catch (error) {
              logger.error(`Failed to rollback relationship | relationshipId: ${relationship.user_organization_id} | error: ${error.message}`);
            }
          }
        );

        // All operations succeeded - return results
        return {
          authUser: authUser.user,
          user,
          organization,
          relationship,
          session
        };
      }, { userId: user_id, email });

      // Transaction committed successfully
      const response = {
        user: {
          user_id: result.authUser.id,
          email: result.user?.email || email,
          name: result.user?.name || name,
          organization_id: result.organization.organization_id
        },
        organization: {
          organization_id: result.organization.organization_id,
          name: result.organization.name,
          slug: result.organization.slug,
          owner_user_id: result.authUser.id
        },
        relationship: {
          role: 'super_admin',
          permissions: [],
          joined_at: result.relationship.joined_at
        },
        tokens: {
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
          token_type: result.session.token_type,
          expires_in: result.session.expires_in,
          expires_at: result.session.expires_at
        },
        message: 'Signup completed successfully! Welcome to Betali.'
      };

      logger.auth.signupSuccess(result.authUser.id, result.organization.organization_id);

      res.status(201).json({
        success: true,
        data: response,
        meta: {
          signupCompleted: true,
          organizationCreated: true,
          userRole: 'super_admin',
          tokensProvided: true,
          transactional: true
        }
      });

    } catch (error) {
      logger.auth.signupFailed(user_id, error.message);

      // Handle special case of user already setup
      if (error.message === 'USER_ALREADY_SETUP') {
        return res.status(200).json({
          success: true,
          message: 'User already registered and set up',
          meta: {
            alreadySetup: true
          }
        });
      }

      // Categorize errors
      const isAuthError = error.message?.includes('Authentication') || error.message?.includes('Supabase');
      const isDBError = error.code?.startsWith('23');

      let statusCode = 500;
      let errorMessage = 'Registration failed. Please try again.';

      if (isAuthError) {
        statusCode = 401;
        errorMessage = 'Authentication setup failed. Please check your credentials.';
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

// ... rest of the endpoints (signup-status, login, check-user-setup) remain the same
// Copy from auth.js

module.exports = router;
