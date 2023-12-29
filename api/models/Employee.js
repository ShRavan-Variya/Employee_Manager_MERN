const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const employeeSchema = new mongoose.Schema({
  emp_id: { type: String, required: true },
  emp_firstname: { type: String, required: true },
  emp_lastname: { type: String, required: true },
  emp_email: { type: String, required: true },
  emp_mobile: { type: String, required: true },
  emp_password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  scheduledDeletionDate: { type: Date },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
});

// Hash the password before saving to the database
employeeSchema.pre('save', async function (next) {
  const employee = this;
  if (!employee.isModified('emp_password')) return next();

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(employee.emp_password, saltRounds);
  employee.emp_password = hashedPassword;

  next();
});

// Generate a JWT token
employeeSchema.methods.generateAuthToken = function () {
  const employee = this;
  const secretKey = 'centric_emp_token_data';
  const expiresInAccessToken = '1h';
  const expiresInRefreshToken = '7d';
  const accessToken = jwt.sign({ emp_id: employee.emp_id }, secretKey, { expiresIn: expiresInAccessToken });
  const refreshToken = jwt.sign({ emp_id: employee.emp_id }, secretKey, { expiresIn: expiresInRefreshToken });
  employee.accessToken = accessToken;
  employee.refreshToken = refreshToken;
  return employee;
};

module.exports = mongoose.model('Employee', employeeSchema);
