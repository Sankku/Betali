const { BaseRepository } = require('./BaseRepository');
const { Logger } = require('../utils/Logger');

/**
 * Repository for managing applied discounts (audit trail)
 * Tracks discount usage for reporting and analytics
 */
class AppliedDiscountRepository extends BaseRepository {
  constructor(supabaseClient) {
    super(supabaseClient, 'applied_discounts');
    this.logger = new Logger('AppliedDiscountRepository');
  }

  /**
   * Create multiple applied discount records (for audit trail)
   * @param {Array} discountRecords - Array of applied discount objects
   * @returns {Promise<Array>}
   */
  async createBulk(discountRecords) {
    try {
      if (!Array.isArray(discountRecords) || discountRecords.length === 0) {
        return [];
      }

      this.logger.info('Creating bulk applied discount records', { 
        recordCount: discountRecords.length 
      });

      const now = new Date().toISOString();
      const recordsWithTimestamp = discountRecords.map(record => ({
        ...record,
        applied_at: now
      }));

      const { data, error } = await this.client
        .from(this.table)
        .insert(recordsWithTimestamp)
        .select();

      if (error) {
        this.logger.error('Error creating bulk applied discounts', { error: error.message });
        throw error;
      }

      this.logger.info('Bulk applied discount records created', { 
        createdCount: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error creating bulk applied discount records', { 
        error: error.message 
      });
      throw new Error(`Error creating applied discount records: ${error.message}`);
    }
  }

  /**
   * Get applied discounts for an order
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>}
   */
  async getOrderDiscounts(orderId, organizationId) {
    try {
      this.logger.info('Getting order applied discounts', { orderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .select(`
          *,
          discount_rules!applied_discounts_discount_rule_id_fkey(
            discount_rule_id,
            name,
            type,
            value
          )
        `)
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .order('applied_at', { ascending: true });

      if (error) {
        this.logger.error('Error getting order discounts', { error: error.message });
        throw error;
      }

      this.logger.info('Order applied discounts retrieved', { 
        orderId,
        discountCount: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      this.logger.error('Error getting order applied discounts', { 
        error: error.message,
        orderId 
      });
      throw new Error(`Error getting order discounts: ${error.message}`);
    }
  }

  /**
   * Get discount usage statistics for a specific discount rule
   * @param {string} discountRuleId - Discount rule ID
   * @param {string} organizationId - Organization ID
   * @param {Object} dateRange - Optional date range filter
   * @returns {Promise<Object>}
   */
  async getDiscountRuleUsage(discountRuleId, organizationId, dateRange = {}) {
    try {
      this.logger.info('Getting discount rule usage', { discountRuleId, organizationId });

      let query = this.client
        .from(this.table)
        .select('discount_amount, applied_at, order_id')
        .eq('discount_rule_id', discountRuleId)
        .eq('organization_id', organizationId);

      // Apply date range filter if provided
      if (dateRange.start_date) {
        query = query.gte('applied_at', dateRange.start_date);
      }
      if (dateRange.end_date) {
        query = query.lte('applied_at', dateRange.end_date);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting discount rule usage', { error: error.message });
        throw error;
      }

      // Calculate usage statistics
      const usage = data || [];
      const stats = {
        total_uses: usage.length,
        total_discount_amount: usage.reduce((sum, record) => sum + record.discount_amount, 0),
        average_discount: usage.length > 0 ? usage.reduce((sum, record) => sum + record.discount_amount, 0) / usage.length : 0,
        unique_orders: new Set(usage.map(record => record.order_id)).size,
        first_used: usage.length > 0 ? Math.min(...usage.map(record => new Date(record.applied_at))) : null,
        last_used: usage.length > 0 ? Math.max(...usage.map(record => new Date(record.applied_at))) : null
      };

      this.logger.info('Discount rule usage calculated', { 
        discountRuleId,
        totalUses: stats.total_uses 
      });

      return stats;
    } catch (error) {
      this.logger.error('Error getting discount rule usage', { 
        error: error.message,
        discountRuleId 
      });
      throw new Error(`Error getting discount rule usage: ${error.message}`);
    }
  }

  /**
   * Get organization discount usage summary
   * @param {string} organizationId - Organization ID
   * @param {Object} dateRange - Optional date range filter
   * @returns {Promise<Object>}
   */
  async getOrganizationDiscountSummary(organizationId, dateRange = {}) {
    try {
      this.logger.info('Getting organization discount summary', { organizationId });

      let query = this.client
        .from(this.table)
        .select(`
          discount_amount,
          applied_at,
          order_id,
          discount_rule_id,
          discount_rules!applied_discounts_discount_rule_id_fkey(name, type)
        `)
        .eq('organization_id', organizationId);

      // Apply date range filter if provided
      if (dateRange.start_date) {
        query = query.gte('applied_at', dateRange.start_date);
      }
      if (dateRange.end_date) {
        query = query.lte('applied_at', dateRange.end_date);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting organization discount summary', { error: error.message });
        throw error;
      }

      const discounts = data || [];

      // Calculate summary statistics
      const summary = {
        total_discounts_applied: discounts.length,
        total_discount_amount: discounts.reduce((sum, d) => sum + d.discount_amount, 0),
        unique_orders_with_discounts: new Set(discounts.map(d => d.order_id)).size,
        unique_discount_rules_used: new Set(discounts.map(d => d.discount_rule_id)).size,
        by_discount_type: {},
        by_discount_rule: {},
        average_discount_per_order: 0
      };

      // Group by discount type
      discounts.forEach(discount => {
        const type = discount.discount_rules?.type || 'unknown';
        if (!summary.by_discount_type[type]) {
          summary.by_discount_type[type] = {
            count: 0,
            total_amount: 0
          };
        }
        summary.by_discount_type[type].count++;
        summary.by_discount_type[type].total_amount += discount.discount_amount;
      });

      // Group by discount rule
      discounts.forEach(discount => {
        const ruleName = discount.discount_rules?.name || 'Unknown Rule';
        if (!summary.by_discount_rule[ruleName]) {
          summary.by_discount_rule[ruleName] = {
            count: 0,
            total_amount: 0
          };
        }
        summary.by_discount_rule[ruleName].count++;
        summary.by_discount_rule[ruleName].total_amount += discount.discount_amount;
      });

      // Calculate average discount per order
      if (summary.unique_orders_with_discounts > 0) {
        summary.average_discount_per_order = summary.total_discount_amount / summary.unique_orders_with_discounts;
      }

      this.logger.info('Organization discount summary calculated', { 
        organizationId,
        totalDiscounts: summary.total_discounts_applied 
      });

      return summary;
    } catch (error) {
      this.logger.error('Error getting organization discount summary', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting organization discount summary: ${error.message}`);
    }
  }

  /**
   * Get top performing discount rules
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getTopDiscountRules(organizationId, options = {}) {
    try {
      this.logger.info('Getting top discount rules', { organizationId });

      const limit = options.limit || 10;
      const dateRange = options.dateRange || {};

      let query = this.client
        .from(this.table)
        .select(`
          discount_rule_id,
          discount_amount,
          applied_at,
          discount_rules!applied_discounts_discount_rule_id_fkey(name, type, value)
        `)
        .eq('organization_id', organizationId);

      // Apply date range filter if provided
      if (dateRange.start_date) {
        query = query.gte('applied_at', dateRange.start_date);
      }
      if (dateRange.end_date) {
        query = query.lte('applied_at', dateRange.end_date);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error getting top discount rules', { error: error.message });
        throw error;
      }

      const discounts = data || [];

      // Group and calculate metrics by discount rule
      const ruleMetrics = {};
      discounts.forEach(discount => {
        const ruleId = discount.discount_rule_id;
        if (!ruleMetrics[ruleId]) {
          ruleMetrics[ruleId] = {
            discount_rule_id: ruleId,
            rule_name: discount.discount_rules?.name || 'Unknown',
            rule_type: discount.discount_rules?.type || 'unknown',
            usage_count: 0,
            total_discount_amount: 0,
            average_discount: 0
          };
        }
        ruleMetrics[ruleId].usage_count++;
        ruleMetrics[ruleId].total_discount_amount += discount.discount_amount;
      });

      // Calculate averages and sort by usage count
      const topRules = Object.values(ruleMetrics)
        .map(rule => ({
          ...rule,
          average_discount: rule.total_discount_amount / rule.usage_count,
          total_discount_amount: parseFloat(rule.total_discount_amount.toFixed(2))
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);

      this.logger.info('Top discount rules calculated', { 
        organizationId,
        ruleCount: topRules.length 
      });

      return topRules;
    } catch (error) {
      this.logger.error('Error getting top discount rules', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting top discount rules: ${error.message}`);
    }
  }

  /**
   * Delete applied discounts for an order (used when order is cancelled)
   * @param {string} orderId - Order ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<number>}
   */
  async deleteOrderDiscounts(orderId, organizationId) {
    try {
      this.logger.info('Deleting order applied discounts', { orderId, organizationId });

      const { data, error } = await this.client
        .from(this.table)
        .delete()
        .eq('order_id', orderId)
        .eq('organization_id', organizationId)
        .select();

      if (error) {
        this.logger.error('Error deleting order discounts', { error: error.message });
        throw error;
      }

      const deletedCount = data?.length || 0;

      this.logger.info('Order applied discounts deleted', { 
        orderId,
        deletedCount 
      });

      return deletedCount;
    } catch (error) {
      this.logger.error('Error deleting order applied discounts', { 
        error: error.message,
        orderId 
      });
      throw new Error(`Error deleting order discounts: ${error.message}`);
    }
  }

  /**
   * Get discount usage timeline
   * @param {string} organizationId - Organization ID
   * @param {Object} dateRange - Date range filter
   * @param {string} groupBy - Group by period ('day', 'week', 'month')
   * @returns {Promise<Array>}
   */
  async getDiscountUsageTimeline(organizationId, dateRange, groupBy = 'day') {
    try {
      this.logger.info('Getting discount usage timeline', { organizationId, groupBy });

      // This would require more complex SQL aggregation
      // For now, return a simplified version
      let query = this.client
        .from(this.table)
        .select('discount_amount, applied_at')
        .eq('organization_id', organizationId);

      if (dateRange.start_date) {
        query = query.gte('applied_at', dateRange.start_date);
      }
      if (dateRange.end_date) {
        query = query.lte('applied_at', dateRange.end_date);
      }

      const { data, error } = await query.order('applied_at');

      if (error) {
        this.logger.error('Error getting discount timeline', { error: error.message });
        throw error;
      }

      // Simple grouping by day (could be enhanced for week/month)
      const timeline = {};
      (data || []).forEach(record => {
        const date = new Date(record.applied_at).toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = {
            date,
            discount_count: 0,
            total_discount_amount: 0
          };
        }
        timeline[date].discount_count++;
        timeline[date].total_discount_amount += record.discount_amount;
      });

      const result = Object.values(timeline).map(entry => ({
        ...entry,
        total_discount_amount: parseFloat(entry.total_discount_amount.toFixed(2))
      }));

      this.logger.info('Discount usage timeline calculated', { 
        organizationId,
        periodCount: result.length 
      });

      return result;
    } catch (error) {
      this.logger.error('Error getting discount usage timeline', { 
        error: error.message,
        organizationId 
      });
      throw new Error(`Error getting discount timeline: ${error.message}`);
    }
  }
}

module.exports = AppliedDiscountRepository;