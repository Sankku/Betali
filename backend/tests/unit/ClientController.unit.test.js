/**
 * ClientController Unit Tests
 * Tests HTTP layer in isolation with mocked clientService dependency.
 */

const ClientController = require('../../controllers/ClientController');

// Mock Logger so constructor does not blow up
jest.mock('../../utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express-style req object.
 * organizationId defaults to 'org-123' so tests can override only what they need.
 */
function buildReq({
  user = { id: 'user-abc', currentOrganizationId: 'org-123' },
  params = {},
  query = {},
  body = {}
} = {}) {
  return { user, params, query, body };
}

/**
 * Build a minimal Express-style res mock that records calls.
 */
function buildRes() {
  const res = {
    _statusCode: 200,
    _json: undefined,
    status: jest.fn().mockImplementation(function (code) {
      res._statusCode = code;
      return res; // chainable
    }),
    json: jest.fn().mockImplementation(function (payload) {
      res._json = payload;
      return res;
    })
  };
  return res;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ClientController Unit Tests', () => {
  let controller;
  let mockClientService;

  beforeEach(() => {
    mockClientService = {
      getOrganizationClients: jest.fn(),
      getClientById: jest.fn(),
      getClientByCuit: jest.fn(),
      createClient: jest.fn(),
      updateClient: jest.fn(),
      deleteClient: jest.fn(),
      searchClients: jest.fn(),
      getClientsByBranch: jest.fn(),
      getClientStats: jest.fn(),
      repository: {
        findByEmail: jest.fn()
      }
    };

    controller = new ClientController(mockClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getClients
  // -------------------------------------------------------------------------

  describe('getClients', () => {
    test('should return paginated client list with 200 and pass organizationId', async () => {
      const clients = [
        { client_id: 'c-1', name: 'Acme Corp' },
        { client_id: 'c-2', name: 'Widgets Inc' }
      ];

      mockClientService.getOrganizationClients.mockResolvedValue(clients);

      const req = buildReq({ query: { page: '2', limit: '5' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClients(req, res, next);

      expect(mockClientService.getOrganizationClients).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ page: 2, limit: 5, offset: 5 })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: clients,
          meta: expect.objectContaining({
            total: 2,
            organizationId: 'org-123'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should use default pagination when query params are absent', async () => {
      mockClientService.getOrganizationClients.mockResolvedValue([]);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getClients(req, res, next);

      expect(mockClientService.getOrganizationClients).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ page: 1, limit: 10, offset: 0 })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({ user: { id: 'user-abc', currentOrganizationId: null } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClients(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('organization') })
      );
      expect(mockClientService.getOrganizationClients).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws', async () => {
      const error = new Error('DB failure');
      mockClientService.getOrganizationClients.mockRejectedValue(error);

      const req = buildReq();
      const res = buildRes();
      const next = jest.fn();

      await controller.getClients(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getClientById
  // -------------------------------------------------------------------------

  describe('getClientById', () => {
    test('should return client with 200 when found', async () => {
      const client = { client_id: 'c-1', name: 'Acme Corp', organization_id: 'org-123' };
      mockClientService.getClientById.mockResolvedValue(client);

      const req = buildReq({ params: { id: 'c-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientById(req, res, next);

      expect(mockClientService.getClientById).toHaveBeenCalledWith('c-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ data: client });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next(error) when client is not found (service throws)', async () => {
      const notFoundError = new Error('Client not found');
      notFoundError.statusCode = 404;
      mockClientService.getClientById.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientById(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'c-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.getClientById).not.toHaveBeenCalled();
    });

    test('should call next(error) when service throws an unexpected error', async () => {
      const error = new Error('Unexpected failure');
      mockClientService.getClientById.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'c-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // createClient
  // -------------------------------------------------------------------------

  describe('createClient', () => {
    const validBody = {
      name: 'New Client',
      cuit: '20-12345678-9',
      email: 'newclient@example.com'
    };

    test('should create client and respond 201 with created data', async () => {
      const created = { client_id: 'c-99', ...validBody, organization_id: 'org-123', user_id: 'user-abc' };
      mockClientService.createClient.mockResolvedValue(created);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createClient(req, res, next);

      expect(mockClientService.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Client',
          cuit: '20-12345678-9',
          email: 'newclient@example.com',
          organization_id: 'org-123',
          user_id: 'user-abc'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
      expect(next).not.toHaveBeenCalled();
    });

    test('should correctly attach organization_id and user_id from req.user', async () => {
      const created = { client_id: 'c-100', name: 'Brand New', organization_id: 'org-456', user_id: 'user-xyz' };
      mockClientService.createClient.mockResolvedValue(created);

      const req = buildReq({
        body: { name: 'Brand New' },
        user: { id: 'user-xyz', currentOrganizationId: 'org-456' }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.createClient(req, res, next);

      expect(mockClientService.createClient).toHaveBeenCalledWith(
        expect.objectContaining({ organization_id: 'org-456', user_id: 'user-xyz' })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        body: validBody,
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.createClient(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.createClient).not.toHaveBeenCalled();
    });

    test('should call next(error) on validation/service error', async () => {
      const validationError = new Error('CUIT already registered');
      validationError.statusCode = 400;
      mockClientService.createClient.mockRejectedValue(validationError);

      const req = buildReq({ body: validBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.createClient(req, res, next);

      expect(next).toHaveBeenCalledWith(validationError);
    });
  });

  // -------------------------------------------------------------------------
  // updateClient
  // -------------------------------------------------------------------------

  describe('updateClient', () => {
    const updateBody = { name: 'Updated Name', email: 'updated@example.com' };

    test('should update client and respond 200', async () => {
      const updated = { client_id: 'c-1', ...updateBody, organization_id: 'org-123' };
      mockClientService.updateClient.mockResolvedValue(updated);

      const req = buildReq({ params: { id: 'c-1' }, body: { ...updateBody } });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateClient(req, res, next);

      expect(mockClientService.updateClient).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({ name: 'Updated Name', email: 'updated@example.com' }),
        'org-123'
      );
      expect(res.json).toHaveBeenCalledWith({ data: updated });
      expect(next).not.toHaveBeenCalled();
    });

    test('should strip organization_id and user_id from the update payload', async () => {
      const updated = { client_id: 'c-1', name: 'Safe Name' };
      mockClientService.updateClient.mockResolvedValue(updated);

      const req = buildReq({
        params: { id: 'c-1' },
        body: { name: 'Safe Name', organization_id: 'attacker-org', user_id: 'attacker-user' }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateClient(req, res, next);

      const [, calledPayload] = mockClientService.updateClient.mock.calls[0];
      expect(calledPayload).not.toHaveProperty('organization_id');
      expect(calledPayload).not.toHaveProperty('user_id');
    });

    test('should call next(error) when client is not found (service throws)', async () => {
      const notFoundError = new Error('Client not found');
      notFoundError.statusCode = 404;
      mockClientService.updateClient.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateClient(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'c-1' },
        body: updateBody,
        user: { id: 'user-abc', currentOrganizationId: '' }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateClient(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.updateClient).not.toHaveBeenCalled();
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Unexpected DB error');
      mockClientService.updateClient.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'c-1' }, body: updateBody });
      const res = buildRes();
      const next = jest.fn();

      await controller.updateClient(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // deleteClient
  // -------------------------------------------------------------------------

  describe('deleteClient', () => {
    test('should delete client and respond 200 with success message', async () => {
      mockClientService.deleteClient.mockResolvedValue(undefined);

      const req = buildReq({ params: { id: 'c-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteClient(req, res, next);

      expect(mockClientService.deleteClient).toHaveBeenCalledWith('c-1', 'org-123');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Client deleted successfully'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should include a timestamp in the delete response', async () => {
      mockClientService.deleteClient.mockResolvedValue(undefined);

      const req = buildReq({ params: { id: 'c-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteClient(req, res, next);

      const payload = res.json.mock.calls[0][0];
      expect(payload).toHaveProperty('timestamp');
      expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');
    });

    test('should call next(error) when client is not found (service throws)', async () => {
      const notFoundError = new Error('Client not found');
      notFoundError.statusCode = 404;
      mockClientService.deleteClient.mockRejectedValue(notFoundError);

      const req = buildReq({ params: { id: 'nonexistent' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteClient(req, res, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { id: 'c-1' },
        user: { id: 'user-abc', currentOrganizationId: undefined }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteClient(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.deleteClient).not.toHaveBeenCalled();
    });

    test('should call next(error) on unexpected service error', async () => {
      const error = new Error('Constraint violation');
      mockClientService.deleteClient.mockRejectedValue(error);

      const req = buildReq({ params: { id: 'c-1' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.deleteClient(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // getClientByCuit
  // -------------------------------------------------------------------------

  describe('getClientByCuit', () => {
    test('should return client with 200 when found', async () => {
      const client = { client_id: 'c-1', cuit: '20-12345678-9' };
      mockClientService.getClientByCuit.mockResolvedValue(client);

      const req = buildReq({ params: { cuit: '20-12345678-9' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientByCuit(req, res, next);

      expect(mockClientService.getClientByCuit).toHaveBeenCalledWith('20-12345678-9', 'org-123');
      expect(res.json).toHaveBeenCalledWith({ data: client });
    });

    test('should return 404 when no client found for given CUIT', async () => {
      mockClientService.getClientByCuit.mockResolvedValue(null);

      const req = buildReq({ params: { cuit: '99-00000000-0' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientByCuit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Client not found' })
      );
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        params: { cuit: '20-12345678-9' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientByCuit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.getClientByCuit).not.toHaveBeenCalled();
    });

    test('should call next(error) on service error', async () => {
      const error = new Error('Service error');
      mockClientService.getClientByCuit.mockRejectedValue(error);

      const req = buildReq({ params: { cuit: '20-12345678-9' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.getClientByCuit(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // searchClients
  // -------------------------------------------------------------------------

  describe('searchClients', () => {
    test('should return matching clients with meta when query is provided', async () => {
      const clients = [{ client_id: 'c-1', name: 'Acme' }];
      mockClientService.searchClients.mockResolvedValue(clients);

      const req = buildReq({ query: { q: 'Acme', page: '1', limit: '10' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.searchClients(req, res, next);

      expect(mockClientService.searchClients).toHaveBeenCalledWith(
        'org-123',
        'Acme',
        expect.objectContaining({ page: 1, limit: 10 })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: clients,
          meta: expect.objectContaining({ query: 'Acme', total: 1 })
        })
      );
    });

    test('should return 400 when search query is missing', async () => {
      const req = buildReq({ query: {} });
      const res = buildRes();
      const next = jest.fn();

      await controller.searchClients(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.searchClients).not.toHaveBeenCalled();
    });

    test('should return 400 when search query is blank whitespace', async () => {
      const req = buildReq({ query: { q: '   ' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.searchClients(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockClientService.searchClients).not.toHaveBeenCalled();
    });

    test('should return 400 when organizationId is missing', async () => {
      const req = buildReq({
        query: { q: 'Acme' },
        user: { id: 'user-abc', currentOrganizationId: null }
      });
      const res = buildRes();
      const next = jest.fn();

      await controller.searchClients(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should call next(error) on service error', async () => {
      const error = new Error('Search failed');
      mockClientService.searchClients.mockRejectedValue(error);

      const req = buildReq({ query: { q: 'Acme' } });
      const res = buildRes();
      const next = jest.fn();

      await controller.searchClients(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // -------------------------------------------------------------------------
  // buildQueryOptions (private, tested indirectly)
  // -------------------------------------------------------------------------

  describe('buildQueryOptions (via getClients)', () => {
    test('should compute correct offset for page 3 with limit 20', async () => {
      mockClientService.getOrganizationClients.mockResolvedValue([]);

      const req = buildReq({ query: { page: '3', limit: '20' } });
      const res = buildRes();

      await controller.getClients(req, res, jest.fn());

      expect(mockClientService.getOrganizationClients).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ page: 3, limit: 20, offset: 40 })
      );
    });

    test('should pass search and branch_id from query', async () => {
      mockClientService.getOrganizationClients.mockResolvedValue([]);

      const req = buildReq({ query: { search: 'test', branch_id: 'br-1' } });
      const res = buildRes();

      await controller.getClients(req, res, jest.fn());

      expect(mockClientService.getOrganizationClients).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ search: 'test', branch_id: 'br-1' })
      );
    });
  });
});
