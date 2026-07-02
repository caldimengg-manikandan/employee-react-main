const auth = require('./auth');

/**
 * Reusable Role-Based Authorization Middleware
 * Can be imported directly or via auth.authorizeRoles
 */
module.exports = auth.authorizeRoles;
