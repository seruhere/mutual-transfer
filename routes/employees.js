const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// @route   POST /api/register
// @desc    Register a new employee for mutual transfer
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, empId, designation, phone, currentDistrict, requiredDistrict } = req.body;

    // Validation
    if (!name || !empId || !designation || !phone || !currentDistrict || !requiredDistrict) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    if (currentDistrict.trim().toLowerCase() === requiredDistrict.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Current and required districts cannot be the same' });
    }

    // Check for duplicate Employee ID
    const existing = await Employee.findOne({ empId: empId.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An entry with this Employee ID already exists. Duplicate entries are not allowed.' });
    }

    const employee = new Employee({
      name: name.trim(),
      empId: empId.trim().toUpperCase(),
      designation,
      phone,
      currentDistrict: capitalize(currentDistrict.trim()),
      requiredDistrict: capitalize(requiredDistrict.trim())
    });

    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your listing will be active for 90 days.',
      data: {
        id: employee._id,
        name: employee.name,
        empId: employee.empId,
        expiresAt: employee.expiresAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

// @route   GET /api/search
// @desc    Search for mutual transfer partners
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { current, required, designation } = req.query;

    if (!current || !required) {
      return res.status(400).json({ success: false, message: 'Both current and required districts are required' });
    }

    // Build query: find people whose current = your required AND whose required = your current
    const query = {
      currentDistrict: { $regex: new RegExp('^' + required.trim() + '$', 'i') },
      requiredDistrict: { $regex: new RegExp('^' + current.trim() + '$', 'i') }
    };

    if (designation && designation !== 'Any') {
      query.designation = designation;
    }

    const matches = await Employee.find(query)
      .select('-__v')
      .sort({ registeredAt: -1 });

    // Mask phone numbers (only last 4 digits visible)
    const maskedMatches = matches.map(m => ({
      id: m._id,
      name: m.name,
      empId: m.empId,
      designation: m.designation,
      phone: m.phone,
      phoneMasked: 'XXXXXX' + m.phone.slice(-4),
      currentDistrict: m.currentDistrict,
      requiredDistrict: m.requiredDistrict,
      registeredAt: m.registeredAt,
      expiresAt: m.expiresAt,
      daysLeft: Math.max(0, Math.ceil((m.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    }));

    res.json({
      success: true,
      count: maskedMatches.length,
      data: maskedMatches
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/listings
// @desc    Get all active listings
// @access  Public
router.get('/listings', async (req, res) => {
  try {
    const listings = await Employee.find()
      .select('-__v')
      .sort({ registeredAt: -1 });

    const formatted = listings.map(item => ({
      id: item._id,
      name: item.name,
      empId: item.empId,
      designation: item.designation,
      currentDistrict: item.currentDistrict,
      requiredDistrict: item.requiredDistrict,
      registeredAt: item.registeredAt,
      daysLeft: Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    }));

    res.json({ success: true, count: formatted.length, data: formatted });

  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/stats
// @desc    Get platform statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const total = await Employee.countDocuments();

    // Count unique districts
    const currentDistricts = await Employee.distinct('currentDistrict');
    const requiredDistricts = await Employee.distinct('requiredDistrict');
    const allDistricts = new Set([...currentDistricts, ...requiredDistricts].map(d => d.toLowerCase()));

    // Count mutual matches (pairs)
    const all = await Employee.find().select('currentDistrict requiredDistrict');
    let matchCount = 0;
    const seen = new Set();

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const key = a._id < b._id ? `${a._id}|${b._id}` : `${b._id}|${a._id}`;
        if (!seen.has(key)) {
          if (a.currentDistrict.toLowerCase() === b.requiredDistrict.toLowerCase() &&
              a.requiredDistrict.toLowerCase() === b.currentDistrict.toLowerCase()) {
            matchCount++;
            seen.add(key);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        total,
        matches: matchCount,
        districts: allDistricts.size
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/listings/:id
// @desc    Delete a specific listing
// @access  Public (in production, add auth)
router.delete('/listings/:id', async (req, res) => {
  try {
    const result = await Employee.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    res.json({ success: true, message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/clear
// @desc    Clear all data (admin use)
// @access  Public (in production, add admin auth)
router.delete('/clear', async (req, res) => {
  try {
    await Employee.deleteMany({});
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = router;
