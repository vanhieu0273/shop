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
    },
    description: {
      type: String,
      max: 1000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", CategorySchema);