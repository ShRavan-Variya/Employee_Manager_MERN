const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const schedule = require('node-schedule');
const Employee = require('./api/models/Employee');
const employeeRoutes = require('./api/routes/employeeRoutes');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/centricwave_emp');

// Schedule job to run every minute
const scheduledJob = schedule.scheduleJob('*/1 * * * *', async () => {
  try {
    const currentDate = new Date();

    // Find employees with scheduledDeletionDate in the past
    const employeesToDelete = await Employee.find({
      scheduledDeletionDate: { $lt: currentDate },
    });

    // Perform deletion
    employeesToDelete.forEach(async (employee) => {
      await Employee.findByIdAndDelete(employee._id);
    });
  } catch (error) {
    console.error('Error during scheduled deletion:', error);
  }
});

// Load employee routes
app.use('/api/employees', employeeRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
