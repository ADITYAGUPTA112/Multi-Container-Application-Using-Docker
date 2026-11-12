const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Field 'title' is required"],
      trim: true,
      minlength: [1, "Field 'title' must contain at least 1 character"],
      maxlength: [200, "Field 'title' cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, "Field 'description' cannot exceed 2000 characters"],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for query performance
todoSchema.index({ createdAt: -1 });
todoSchema.index({ isCompleted: 1 });

const Todo = mongoose.model('Todo', todoSchema);

module.exports = Todo;
