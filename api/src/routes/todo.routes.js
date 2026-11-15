const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todo.controller');
const { authenticate } = require('../middleware/auth');
const {
  validateObjectId,
  validateCreateTodo,
  validateUpdateTodo,
} = require('../middleware/validator');

// GET /todos/stats - Retrieve todo stats for authenticated user (MUST be before /:id)
router.get('/stats', authenticate, todoController.getStats);

// GET /todos - Retrieve all todos (paginated, filtered, searched, sorted)
router.get('/', authenticate, todoController.getAllTodos);

// POST /todos - Create a new todo
router.post('/', authenticate, validateCreateTodo, todoController.createTodo);

// GET /todos/:id - Retrieve single todo by ID
router.get('/:id', authenticate, validateObjectId, todoController.getTodoById);

// PUT /todos/:id - Update todo by ID
router.put('/:id', authenticate, validateObjectId, validateUpdateTodo, todoController.updateTodo);

// DELETE /todos/:id - Delete todo by ID
router.delete('/:id', authenticate, validateObjectId, todoController.deleteTodo);

module.exports = router;
