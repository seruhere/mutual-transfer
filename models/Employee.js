const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  empId: {
    type: String,
    required: [true, 'Employee ID is required'],
    trim: true,
    uppercase: true,
    unique: true,
    index: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    enum: {
      values: ['GDS', 'Departmental'],
      message: 'Designation must be either GDS or Departmental'
    }
  },
  phone: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  currentDistrict: {
    type: String,
    required: [true, 'Current district is required'],
    trim: true
  },
  requiredDistrict: {
    type: String,
    required: [true, 'Required district is required'],
    trim: true
  },
  registeredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// TTL index for auto-deletion after 90 days
employeeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text search index for districts
employeeSchema.index({ currentDistrict: 'text', requiredDistrict: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);