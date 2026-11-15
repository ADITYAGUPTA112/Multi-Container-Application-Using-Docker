const Todo = require('../models/todo.model');
const { emitTodoEvent } = require('../services/socket');
const { deleteCache, deleteCachePattern } = require('../config/redis');

/**
 * GET /todos
 * Retrieve paginated, filtered, searched and sorted todos scoped to req.user._id.
 */
const getAllTodos = async (req, res, next) => {
  try {
    const filter = {};

    // Scope to authenticated user unless user is admin
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    // Text search using MongoDB text index on title and description
    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    // Filter by completion status
    if (req.query.isCompleted !== undefined) {
      filter.isCompleted = req.query.isCompleted === 'true' || req.query.isCompleted === true;
    } else if (req.query.completed !== undefined) {
      filter.isCompleted = req.query.completed === 'true' || req.query.completed === true;
    }

    // Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // Filter by dueDate range (dueBefore, dueAfter)
    if (req.query.dueBefore || req.query.dueAfter) {
      filter.dueDate = {};
      if (req.query.dueBefore) {
        filter.dueDate.$lte = new Date(req.query.dueBefore);
      }
      if (req.query.dueAfter) {
        filter.dueDate.$gte = new Date(req.query.dueAfter);
      }
    }

    // Filter by tag if requested
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // Pagination: page (default: 1), limit (default: 20, max: 100)
    let page = parseInt(req.query.page, 10) || 1;
    if (page < 1) page = 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    // Sorting: sortBy (createdAt, dueDate, priority), sortOrder (asc/desc)
    const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'title'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const totalCount = await Todo.countDocuments(filter);
    const todos = await Todo.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.status(200).json({
      success: true,
      count: todos.length,
      totalCount,
      page,
      totalPages,
      data: todos,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /todos
 * Create a new todo item scoped to req.user._id.
 */
const createTodo = async (req, res, next) => {
  try {
    const { title, description, priority, scope, dueDate, tags } = req.body;
    const userId = req.user ? req.user._id : req.body.userId;

    const newTodo = await Todo.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      isCompleted: false,
      userId,
      priority: priority ? priority.toLowerCase() : 'medium',
      scope: scope || 'DevOps',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
    });

    // Invalidate Redis cache
    if (userId) {
      await deleteCachePattern(`todos:${userId}:*`);
      await deleteCache(`stats:${userId}`);
    }
    await deleteCachePattern('todos:*');

    // Emit Socket.IO event
    emitTodoEvent('todo:created', newTodo);

    res.status(201).json({
      success: true,
      data: newTodo,
      message: 'Todo created successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /todos/:id
 * Retrieve a single todo item by ID scoped to req.user._id (or allow admin to see all).
 */
const getTodoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };

    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const todo = await Todo.findOne(filter);

    if (!todo) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TODO_NOT_FOUND',
          message: `No todo item found with ID '${id}'.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: todo,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /todos/:id
 * Update an existing todo item scoped to req.user._id (or admin).
 */
const updateTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };

    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const { title, description, isCompleted, completed, priority, scope, dueDate, tags } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description ? description.trim() : '';
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;
    else if (completed !== undefined) updateFields.isCompleted = completed;
    if (priority !== undefined) updateFields.priority = priority.toLowerCase();
    if (scope !== undefined) updateFields.scope = scope;
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) {
      updateFields.tags = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
    }

    const updatedTodo = await Todo.findOneAndUpdate(filter, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedTodo) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TODO_NOT_FOUND',
          message: `Cannot update. No todo item found with ID '${id}'.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Invalidate Redis cache
    const userId = req.user ? req.user._id : updatedTodo.userId;
    if (userId) {
      await deleteCachePattern(`todos:${userId}:*`);
      await deleteCache(`stats:${userId}`);
    }
    await deleteCachePattern('todos:*');

    // Emit Socket.IO event
    emitTodoEvent('todo:updated', updatedTodo);

    res.status(200).json({
      success: true,
      data: updatedTodo,
      message: 'Todo updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /todos/:id
 * Delete a todo item scoped to req.user._id (or admin).
 */
const deleteTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };

    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const deletedTodo = await Todo.findOneAndDelete(filter);

    if (!deletedTodo) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TODO_NOT_FOUND',
          message: `Cannot delete. No todo item found with ID '${id}'.`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Invalidate Redis cache
    const userId = req.user ? req.user._id : deletedTodo.userId;
    if (userId) {
      await deleteCachePattern(`todos:${userId}:*`);
      await deleteCache(`stats:${userId}`);
    }
    await deleteCachePattern('todos:*');

    // Emit Socket.IO event
    emitTodoEvent('todo:deleted', { _id: deletedTodo._id });

    res.status(200).json({
      success: true,
      message: 'Todo deleted successfully',
      data: {
        _id: deletedTodo._id,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /todos/stats
 * Return statistics for req.user: total, completed, pending, overdue, byPriority counts.
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const baseFilter = {};

    if (userId && (!req.user.role || req.user.role !== 'admin')) {
      baseFilter.userId = userId;
    }

    const total = await Todo.countDocuments(baseFilter);
    const completed = await Todo.countDocuments({ ...baseFilter, isCompleted: true });
    const pending = await Todo.countDocuments({ ...baseFilter, isCompleted: false });
    const overdue = await Todo.countDocuments({
      ...baseFilter,
      isCompleted: false,
      dueDate: { $ne: null, $lt: new Date() },
    });

    const low = await Todo.countDocuments({ ...baseFilter, priority: 'low' });
    const medium = await Todo.countDocuments({ ...baseFilter, priority: 'medium' });
    const high = await Todo.countDocuments({ ...baseFilter, priority: 'high' });

    res.status(200).json({
      success: true,
      data: {
        total,
        completed,
        pending,
        overdue,
        byPriority: {
          low,
          medium,
          high,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTodos,
  createTodo,
  getTodoById,
  updateTodo,
  deleteTodo,
  getStats,
};
