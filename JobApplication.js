const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      maxlength: [100, 'Job role cannot exceed 100 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    applicationDate: {
      type: Date,
      required: [true, 'Application date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Applied', 'Interview', 'Rejected', 'Selected'],
        message: 'Status must be Applied, Interview, Rejected, or Selected',
      },
      default: 'Applied',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster search
jobApplicationSchema.index({ companyName: 'text', jobRole: 'text' });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
