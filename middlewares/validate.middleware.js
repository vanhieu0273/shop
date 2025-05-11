const { validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format error messages
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));

    return res.status(400).json({
      msg: 'Dữ liệu không hợp lệ',
      errors: formattedErrors
    });
  };
};

module.exports = {
  validate
}; 