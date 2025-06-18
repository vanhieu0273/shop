var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var mongoose = require('mongoose');

require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var categoryRouter = require('./routes/category');
var sizeRouter = require('./routes/size');
var colorRouter = require('./routes/color');
var productRoutes = require('./routes/product');
var paymentRoutes = require('./routes/payment');
var expenseRoutes = require('./routes/expense');
var statisticsRoutes = require('./routes/statistics');

var app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Don't exit the process, let the application continue
  }
};

// Connect to MongoDB
connectDB();

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/category', categoryRouter);
app.use('/size', sizeRouter);
app.use('/color', colorRouter);
app.use('/products', productRoutes);
app.use('/payment', paymentRoutes);
app.use('/expense', expenseRoutes)
app.use('/statistics', statisticsRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Export the Express app
module.exports = app;
