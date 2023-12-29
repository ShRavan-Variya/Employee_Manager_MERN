const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

////////////////////////////////
// ## TOKEN AUTHENTICATION ## //
// Middleware to authenticate token
async function authenticateToken(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token.replace('Bearer ', ''), 'centric_emp_token_data', async (err, decoded) => {
    if (err) {
      console.error(err);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const user = await Employee.findOne({ emp_id: decoded.emp_id });

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized 00' });
      }

      req.employee = user;
      req.token = token;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
}

/////////////////////
// ## UNIQUE ID ## //
function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}

////////////////////
// ## REGISTER ## //
// POST: /api/employees/register
router.post('/register', async (req, res) => {
  try {
    const { emp_firstname, emp_lastname, emp_email, emp_mobile, emp_password } = req.body;

    const existingEmployee = await Employee.findOne({ emp_email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    const newEmployee = new Employee({
      emp_id: generateUniqueId()
    });
    const authTokenData = await newEmployee.generateAuthToken();

    const finalEmp = {
      _id: authTokenData._id,
      emp_id: authTokenData.emp_id,
      created_at: authTokenData.created_at,
      updated_at: authTokenData.updated_at,
      accessToken: authTokenData.accessToken,
      refreshToken: authTokenData.refreshToken,
      emp_firstname,
      emp_lastname,
      emp_email,
      emp_mobile,
      emp_password,
    };

    const employeeInstance = new Employee(finalEmp); // Create a new Employee instance
    await employeeInstance.save();

    const sanitizedUser = {
      _id: authTokenData._id,
      emp_id: authTokenData.emp_id,
      emp_firstname: emp_firstname,
      emp_lastname: emp_lastname,
      emp_email: emp_email,
      emp_mobile: emp_mobile,
      created_at: authTokenData.created_at,
      updated_at: authTokenData.updated_at,
      token: {
        accessToken: authTokenData.accessToken,
        refreshToken: authTokenData.refreshToken,
      }
    };

    res.status(201).json({ message: 'Employee registered successfully', data: sanitizedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/////////////////
// ## Login ## //
// POST: /api/employees/login
router.post('/login', async (req, res) => {
  try {
    const { emp_email, emp_password } = req.body;
    const user = await Employee.findOne({ emp_email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(emp_password, user.emp_password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const accessToken = jwt.sign({ emp_id: user.emp_id }, 'centric_emp_token_data', { expiresIn: '1h' });
    const refreshToken = jwt.sign({ emp_id: user.emp_id }, 'centric_emp_token_data', { expiresIn: '7d' });

    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    user.updated_at = new Date();
    await user.save();

    const sanitizedUser = {
      _id: user._id,
      emp_id: user.emp_id,
      emp_firstname: user.emp_firstname,
      emp_lastname: user.emp_lastname,
      emp_email: user.emp_email,
      emp_mobile: user.emp_mobile,
      created_at: user.created_at,
      updated_at: user.updated_at,
      token: {
        accessToken: accessToken,
        refreshToken: refreshToken,
      }
    };

    res.status(200).json({ message: 'Employee login successfully', data: sanitizedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

////////////////////
// ## GET USER ## //
// GET: /api/employees/emp-details
router.get('/emp-details', authenticateToken, async (req, res) => {
  try {
    const employee = req.employee; // The authenticated employee is available in req.employee
    const refreshToken = employee.refreshToken; // Assuming you have a field named refreshToken in your Employee model

    const token = req.token;
    const sanitizedEmployee = {
      _id: employee._id,
      emp_id: employee.emp_id,
      emp_firstname: employee.emp_firstname,
      emp_lastname: employee.emp_lastname,
      emp_email: employee.emp_email,
      emp_mobile: employee.emp_mobile,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      token: {
        accessToken: token,
        refreshToken: refreshToken,
      }
    };
    res.status(200).json({ message: 'Employee details got successfully', data: sanitizedEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

///////////////////////
// ## UPDATE USER ## //
// PUT: /api/employees/update-emp
router.put('/update-emp', authenticateToken, async (req, res) => {
  try {
    const employee = req.employee; // The authenticated employee is available in req.employee
    const { emp_firstname, emp_lastname, emp_email, emp_mobile } = req.body;

     // Update employee details
    employee.emp_firstname = emp_firstname || employee.emp_firstname;
    employee.emp_lastname = emp_lastname || employee.emp_lastname;
    employee.emp_email = emp_email || employee.emp_email;
    employee.emp_mobile = emp_mobile || employee.emp_mobile;
    employee.updated_at = new Date();

    await employee.save();

    res.status(200).json({ message: 'Employee details updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

////////////////////////////////
// ## SCHEDULE DELETE USER ## //
// PUT: /api/employees/schedule-deletion
router.put('/emp-schedule-delete', authenticateToken, async (req, res) => {
  try {
    const employee = req.employee; // The authenticated employee is available in req.employee
    const { scheduledDeletionDate } = req.query;

    // Update scheduled deletion date
    employee.scheduledDeletionDate = scheduledDeletionDate;
    employee.updated_at = new Date();
    await employee.save();

    res.status(200).json({ message: 'Deletion scheduled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//////////////////////////////////
// ## REMOVE SCHEDULE DELETE ## //
// PUT: /api/employees/schedule-deletion
router.put('/emp-remove-schedule', authenticateToken, async (req, res) => {
  try {
    const employee = req.employee; // The authenticated employee is available in req.employee

    // Remove scheduled deletion date
    employee.scheduledDeletionDate = '';
    employee.updated_at = new Date();
    await employee.save();

    res.status(200).json({ message: 'Deletion schedule removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
