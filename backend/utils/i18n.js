const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const { Logger } = require('./Logger');

const logger = new Logger('i18n');

/**
 * Internationalization utility for error messages and responses
 * Supports multiple languages with fallback to English
 */

class I18n {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize i18next with configuration
   */
  async init() {
    try {
      await i18next
        .use(Backend)
        .init({
          lng: 'en', // Default language
          fallbackLng: 'en',
          debug: process.env.NODE_ENV === 'development',
          
          backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}.json'),
          },
          
          interpolation: {
            escapeValue: false, // Not needed for server-side
          },
          
          // Load languages
          preload: ['en', 'es'],
          
          // Namespace configuration
          ns: ['translation'],
          defaultNS: 'translation',
          
          // Key separator
          keySeparator: '.',
          nsSeparator: false,
          
          // Return objects for missing keys
          returnObjects: false,
          returnEmptyString: false,
          
          // Logging
          saveMissing: process.env.NODE_ENV === 'development',
          missingKeyHandler: (lng, ns, key) => {
            logger.warn('Missing translation key', { language: lng, key });
          }
        });

      this.initialized = true;
      logger.info('i18n initialized successfully', {
        defaultLanguage: i18next.language,
        loadedLanguages: i18next.languages
      });
    } catch (error) {
      logger.error('Failed to initialize i18n', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user's preferred language from request
   * @param {Object} req - Express request object
   * @returns {string} - Language code
   */
  getLanguage(req) {
    // Check query parameter first
    if (req.query.lang && this.isLanguageSupported(req.query.lang)) {
      return req.query.lang;
    }
    
    // Check user profile language
    if (req.user?.profile?.language && this.isLanguageSupported(req.user.profile.language)) {
      return req.user.profile.language;
    }
    
    // Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase())
        .map(lang => lang.split('-')[0]); // Get base language (en from en-US)
      
      for (const lang of languages) {
        if (this.isLanguageSupported(lang)) {
          return lang;
        }
      }
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Check if language is supported
   * @param {string} language - Language code
   * @returns {boolean} - Is supported
   */
  isLanguageSupported(language) {
    return ['en', 'es'].includes(language.toLowerCase());
  }

  /**
   * Translate a key with interpolation
   * @param {string} key - Translation key
   * @param {Object} options - Translation options
   * @param {string} language - Target language
   * @returns {string} - Translated text
   */
  t(key, options = {}, language = 'en') {
    if (!this.initialized) {
      logger.warn('i18n not initialized, returning key', { key });
      return key;
    }

    try {
      return i18next.t(key, { ...options, lng: language });
    } catch (error) {
      logger.error('Translation error', { key, language, error: error.message });
      return key;
    }
  }

  /**
   * Create error response with internationalization
   * @param {string} key - Error key
   * @param {Object} interpolation - Values for interpolation
   * @param {string} language - Target language
   * @param {number} statusCode - HTTP status code
   * @returns {Object} - Error response object
   */
  createErrorResponse(key, interpolation = {}, language = 'en', statusCode = 400) {
    const message = this.t(key, interpolation, language);
    
    return {
      error: message,
      code: key.replace(/\./g, '_').toUpperCase(),
      timestamp: new Date().toISOString(),
      language
    };
  }

  /**
   * Create success response with internationalization
   * @param {string} key - Success key
   * @param {Object} interpolation - Values for interpolation
   * @param {string} language - Target language
   * @returns {Object} - Success response object
   */
  createSuccessResponse(key, interpolation = {}, language = 'en') {
    const message = this.t(key, interpolation, language);
    
    return {
      message,
      timestamp: new Date().toISOString(),
      language
    };
  }

  /**
   * Translate field name
   * @param {string} fieldName - Field name
   * @param {string} language - Target language
   * @returns {string} - Translated field name
   */
  translateField(fieldName, language = 'en') {
    const key = `fields.${fieldName}`;
    const translated = this.t(key, {}, language);
    
    // If translation not found, return formatted field name
    if (translated === key) {
      return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return translated;
  }

  /**
   * Translate resource name
   * @param {string} resourceName - Resource name
   * @param {string} language - Target language
   * @param {boolean} plural - Return plural form
   * @returns {string} - Translated resource name
   */
  translateResource(resourceName, language = 'en', plural = false) {
    const key = plural ? `resources.${resourceName}s` : `resources.${resourceName}`;
    const translated = this.t(key, {}, language);
    
    // If translation not found, return formatted resource name
    if (translated === key) {
      let formatted = resourceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (plural && !formatted.endsWith('s')) {
        formatted += 's';
      }
      return formatted;
    }
    
    return translated;
  }

  /**
   * Express middleware for setting up i18n in requests
   */
  middleware() {
    return (req, res, next) => {
      const language = this.getLanguage(req);
      
      // Add i18n functions to request object
      req.language = language;
      req.t = (key, options = {}) => this.t(key, options, language);
      req.createErrorResponse = (key, interpolation = {}, statusCode = 400) => 
        this.createErrorResponse(key, interpolation, language, statusCode);
      req.createSuccessResponse = (key, interpolation = {}) => 
        this.createSuccessResponse(key, interpolation, language);
      req.translateField = (fieldName) => this.translateField(fieldName, language);
      req.translateResource = (resourceName, plural = false) => 
        this.translateResource(resourceName, language, plural);
      
      next();
    };
  }
}

// Create singleton instance
const i18nInstance = new I18n();

module.exports = {
  I18n,
  i18n: i18nInstance
};