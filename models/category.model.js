var mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      max: 50,
      require: true,
    },
    image: {
      type: String,
      require: true,
    },
    description: {
      type: String,
      max: 1000,
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", CategorySchema);