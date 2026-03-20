const express = require('express');
const router = express.Router();
const JobApplication = require('../models/JobApplication');

// GET /api/applications - Fetch all applications with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { jobRole: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await JobApplication.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching applications',
      error: error.message,
    });
  }
});

// GET /api/applications/:id - Fetch single application
router.get('/:id', async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching application',
      error: error.message,
    });
  }
});

// POST /api/applications - Add new application
router.post('/', async (req, res) => {
  try {
    const { companyName, jobRole, location, salary, applicationDate, status, notes } = req.body;

    const application = await JobApplication.create({
      companyName,
      jobRole,
      location,
      salary,
      applicationDate,
      status,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Application added successfully',
      data: application,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error creating application',
      error: error.message,
    });
  }
});

// PUT /api/applications/:id - Update application
router.put('/:id', async (req, res) => {
  try {
    const application = await JobApplication.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error updating application',
      error: error.message,
    });
  }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await JobApplication.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting application',
      error: error.message,
    });
  }
});

// GET /api/applications/stats/summary - Dashboard stats
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await JobApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await JobApplication.countDocuments();
    const summary = { total, Applied: 0, Interview: 0, Rejected: 0, Selected: 0 };
    stats.forEach((s) => (summary[s._id] = s.count));

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats',
      error: error.message,
    });
  }
});

module.exports = router;
