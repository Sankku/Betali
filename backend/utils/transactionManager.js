const logger = require('../config/logger');

/**
 * Transaction Manager for Supabase operations
 *
 * Since Supabase client doesn't support SQL transactions directly,
 * this implements a compensation-based transaction pattern:
 * - Track all operations
 * - On failure, rollback completed operations in reverse order
 *
 * Usage:
 * ```javascript
 * const tx = new TransactionManager();
 * try {
 *   const user = await tx.execute('createUser', () => createUser(data));
 *   const org = await tx.execute('createOrg', () => createOrg(data));
 *   await tx.commit();
 * } catch (error) {
 *   await tx.rollback();
 *   throw error;
 * }
 * ```
 */
class TransactionManager {
  constructor(context = {}) {
    this.operations = [];
    this.context = context;
    this.committed = false;
    this.rolledBack = false;
  }

  /**
   * Execute an operation and track it for potential rollback
   * @param {string} operationName - Name of the operation (for logging)
   * @param {Function} operation - Async function that performs the operation
   * @param {Function} rollbackOperation - Async function to rollback this operation
   * @returns {Promise<any>} Result of the operation
   */
  async execute(operationName, operation, rollbackOperation = null) {
    if (this.committed) {
      throw new Error('Cannot execute operation after transaction commit');
    }
    if (this.rolledBack) {
      throw new Error('Cannot execute operation after transaction rollback');
    }

    logger.debug(`Transaction: Executing ${operationName} | txId: ${this.getTransactionId()}`);

    try {
      const result = await operation();

      // Track this operation for potential rollback
      this.operations.push({
        name: operationName,
        rollback: rollbackOperation,
        result,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Transaction: ${operationName} completed | txId: ${this.getTransactionId()}`);

      return result;
    } catch (error) {
      logger.error(`Transaction: ${operationName} failed | error: ${error.message} | txId: ${this.getTransactionId()}`);
      throw error;
    }
  }

  /**
   * Commit the transaction (mark as successful)
   * @returns {Promise<void>}
   */
  async commit() {
    if (this.committed) {
      logger.warn(`Transaction already committed | txId: ${this.getTransactionId()}`);
      return;
    }
    if (this.rolledBack) {
      throw new Error('Cannot commit a rolled back transaction');
    }

    this.committed = true;
    logger.info(`Transaction committed | operations: ${this.operations.length} | txId: ${this.getTransactionId()}`);
  }

  /**
   * Rollback all completed operations in reverse order
   * @returns {Promise<void>}
   */
  async rollback() {
    if (this.rolledBack) {
      logger.warn(`Transaction already rolled back | txId: ${this.getTransactionId()}`);
      return;
    }

    this.rolledBack = true;

    logger.warn(`Transaction: Starting rollback | operations: ${this.operations.length} | txId: ${this.getTransactionId()}`);

    // Rollback operations in reverse order
    const rollbackPromises = [];

    for (let i = this.operations.length - 1; i >= 0; i--) {
      const operation = this.operations[i];

      if (operation.rollback) {
        logger.debug(`Transaction: Rolling back ${operation.name} | txId: ${this.getTransactionId()}`);

        try {
          await operation.rollback(operation.result);
          logger.debug(`Transaction: Rolled back ${operation.name} successfully | txId: ${this.getTransactionId()}`);
        } catch (rollbackError) {
          logger.error(`Transaction: Rollback failed for ${operation.name} | error: ${rollbackError.message} | txId: ${this.getTransactionId()}`);
          // Continue with other rollbacks even if one fails
        }
      } else {
        logger.warn(`Transaction: No rollback function for ${operation.name} | txId: ${this.getTransactionId()}`);
      }
    }

    logger.info(`Transaction rolled back | txId: ${this.getTransactionId()}`);
  }

  /**
   * Get transaction ID for logging
   * @returns {string}
   */
  getTransactionId() {
    if (!this._txId) {
      this._txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._txId;
  }

  /**
   * Get transaction status
   * @returns {Object}
   */
  getStatus() {
    return {
      transactionId: this.getTransactionId(),
      operations: this.operations.length,
      committed: this.committed,
      rolledBack: this.rolledBack,
      context: this.context
    };
  }
}

/**
 * Helper function to create and manage a transaction
 * @param {Function} callback - Async function that receives the transaction manager
 * @param {Object} context - Optional context for the transaction
 * @returns {Promise<any>} Result of the transaction
 */
async function withTransaction(callback, context = {}) {
  const tx = new TransactionManager(context);

  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

module.exports = {
  TransactionManager,
  withTransaction
};
