const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todo.controller');
const {
  validateObjectId,
  validateCreateTodo,
  validateUpdateTodo,
} = require('../middleware/validator');

// GET /todos - Retrieve all todos
router.get('/', todoController.getAllTodos);

// POST /todos - Create a new todo
router.post('/', validateCreateTodo, todoController.createTodo);

// GET /todos/:id - Retrieve single todo by ID
router.get('/:id', validateObjectId, todoController.getTodoById);

// PUT /todos/:id - Update todo by ID
router.put('/:id', validateObjectId, validateUpdateTodo, todoController.updateTodo);

// DELETE /todos/:id - Delete todo by ID
router.delete('/:id', validateObjectId, todoController.deleteTodo);

module.exports = router;
