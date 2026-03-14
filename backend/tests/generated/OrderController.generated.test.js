class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
    this.createOrder = this.createOrder.bind(this);
    this.getOrder = this.getOrder.bind(this);
    // Add other methods as needed
  }

  async createOrder(req, res, next) {
    try {
      const orderData = req.body;
      const organizationId = req.user.currentOrganization;
      const userId = req.user.id;

      const order = await this.orderService.createOrder(orderData, organizationId, userId);

      res.json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch(error) {
      next(error);
    }
  }

  async getOrder(req, res, next) {
    try {
      const { id } = req.params;
      const organizationId = req.user.currentOrganization;

      const order = await this.orderService.getOrderById(id, organizationId);

      if(!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch(error) {
      next(error);
    }
  }

  // Add other methods as needed
}

module.exports = OrderController;