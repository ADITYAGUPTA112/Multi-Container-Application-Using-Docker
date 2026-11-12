const mongoose = require('mongoose');

/**
 * Middleware to validate MongoDB ObjectId in route parameters (:id).
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID_FORMAT',
        message: `The provided ID '${id}' is not a valid 24-character hexadecimal identifier.`,
        timestamp: new Date().toISOString(),
      },
    });
  }
  next();
};

/**
 * Middleware to validate POST /todos request body.
 */
const validateCreateTodo = (req, res, next) => {
  const { title, description } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Field 'title' is required and must not be empty.",
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Field 'title' cannot exceed 200 characters.",
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (description && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Field 'description' must be text under 2000 characters.",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

/**
 * Middleware to validate PUT /todos/:id request body.
 */
const validateUpdateTodo = (req, res, next) => {
  const { title, description, isCompleted } = req.body;

  if (title === undefined && description === undefined && isCompleted === undefined) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "At least one field ('title', 'description', 'isCompleted') must be provided for update.",
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Field 'title' must be a non-empty string.",
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Field 'title' cannot exceed 200 characters.",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 2000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Field 'description' must be text under 2000 characters.",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  if (isCompleted !== undefined && typeof isCompleted !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Field 'isCompleted' must be a boolean (true or false).",
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
};

module.exports = {
  validateObjectId,
  validateCreateTodo,
  validateUpdateTodo,
};
