const Todo = require('../models/todo.model');

/**
 * GET /todos
 * Retrieve all todos, sorted by createdAt descending.
 */
const getAllTodos = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.completed !== undefined) {
      filter.isCompleted = req.query.completed === 'true';
    }

    const todos = await Todo.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: todos.length,
      data: todos,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /todos
 * Create a new todo item.
 */
const createTodo = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    const newTodo = await Todo.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      isCompleted: false,
    });

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
 * Retrieve a single todo item by ID.
 */
const getTodoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findById(id);

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
 * Update an existing todo item by ID.
 */
const updateTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, isCompleted } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description ? description.trim() : '';
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;

    const updatedTodo = await Todo.findByIdAndUpdate(id, updateFields, {
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
 * Delete a todo item by ID.
 */
const deleteTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);

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

module.exports = {
  getAllTodos,
  createTodo,
  getTodoById,
  updateTodo,
  deleteTodo,
};
