const { Logger } = require('../utils/Logger');

/**
 * Purchase Order Controller handling HTTP requests
 * Follows the separation of concerns principle
 */
class PurchaseOrderController {
  constructor(purchaseOrderService) {
    this.purchaseOrderService = purchaseOrderService;
    this.logger = new Logger('PurchaseOrderController');
  }

  /**
   * Get all purchase orders for authenticated user's organization
   * GET /api/purchase-orders
   */
  async getPurchaseOrders(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const filters = {
        status: req.query.status,
        supplier_id: req.query.supplier_id,
        date_from: req.query.date_from,
        date_to: req.query.date_to
      };

      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      const result = await this.purchaseOrderService.getPurchaseOrders(organizationId, filters, limit, offset);

      res.json({
        data: result.data,
        meta: {
          total: result.count,
          limit,
          offset,
          organizationId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single purchase order by ID
   * GET /api/purchase-orders/:id
   */
  async getPurchaseOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const purchaseOrder = await this.purchaseOrderService.getPurchaseOrderById(id, organizationId);

      res.json({ data: purchaseOrder });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new purchase order
   * POST /api/purchase-orders
   */
  async createPurchaseOrder(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const purchaseOrderData = {
        ...req.body,
        user_id: req.user.id,
        created_by: req.user.id
      };

      const purchaseOrder = await this.purchaseOrderService.createPurchaseOrder(purchaseOrderData, organizationId);

      res.status(201).json({
        data: purchaseOrder,
        message: 'Purchase order created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update purchase order (full edit)
   * PUT /api/purchase-orders/:id
   */
  async updatePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization context found. Please select an organization.' });
      }

      const updatedPurchaseOrder = await this.purchaseOrderService.updatePurchaseOrder(id, req.body, organizationId);

      res.json({
        data: updatedPurchaseOrder,
        message: 'Purchase order updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update purchase order status
   * PATCH /api/purchase-orders/:id/status
   */
  async updatePurchaseOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      if (!status) {
        return res.status(400).json({
          error: 'Status is required'
        });
      }

      const updatedPurchaseOrder = await this.purchaseOrderService.updatePurchaseOrderStatus(
        id,
        status,
        organizationId
      );

      res.json({
        data: updatedPurchaseOrder,
        message: `Purchase order status updated to ${status}`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Receive a purchase order with lot assignment per line
   * POST /api/purchase-orders/:id/receive
   */
  async receivePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { lines } = req.body;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization context found.' });
      }
      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'lines array is required and must not be empty' });
      }

      const updatedPO = await this.purchaseOrderService.receivePurchaseOrder(id, lines, organizationId);

      res.json({
        data: updatedPO,
        message: `Purchase order ${updatedPO.status === 'received' ? 'fully received' : 'partially received'}. Stock updated.`,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      next(error);
    }
  }

  /**
   * Duplicate purchase order as new draft
   * POST /api/purchase-orders/:id/duplicate
   */
  async duplicatePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'No organization context found.' });
      }

      const duplicated = await this.purchaseOrderService.duplicatePurchaseOrder(id, organizationId);

      res.status(201).json({
        success: true,
        data: duplicated,
        message: 'Purchase order duplicated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk Delete (permanently remove or cancel) purchase orders
   * DELETE /api/purchase-orders/bulk
   */
  async bulkDeletePurchaseOrders(req, res, next) {
    try {
      const organizationId = req.user.currentOrganizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'No organization context found.' });
      }
      
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required and must not be empty' });
      }
      
      this.logger.info('Bulk deleting purchase orders', { count: ids.length, organizationId });
      const result = await this.purchaseOrderService.bulkDeletePurchaseOrders(ids, organizationId);
      
      res.json({
        success: true,
        data: result,
        message: 'Bulk delete complete'
      });
    } catch (error) {
      this.logger.error('Error bulk deleting purchase orders', { error: error.message });
      next(error);
    }
  }

  /**
   * Delete/cancel purchase order
   * DELETE /api/purchase-orders/:id
   */
  async deletePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: 'No organization context found. Please select an organization.'
        });
      }

      const deletedPurchaseOrder = await this.purchaseOrderService.deletePurchaseOrder(id, organizationId);

      res.json({
        data: deletedPurchaseOrder,
        message: 'Purchase order cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PurchaseOrderController;
