const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

/**
 * Enterprise-grade Role-Based Authorization Middleware
 * Must be executed after `auth` middleware.
 * Usage: authorizeRoles('admin', 'hr', 'finance')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied: User role is not assigned."
      });
    }

    const userRole = String(req.user.role).toLowerCase();
    const normalizedAllowed = allowedRoles.map(role => String(role).toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user.role}' does not have permission for this action.`
      });
    }

    next();
  };
};

// Attach utilities directly to auth function object for flexible importing
auth.auth = auth;
auth.authorizeRoles = authorizeRoles;
auth.authorize = authorizeRoles;

module.exports = auth;

