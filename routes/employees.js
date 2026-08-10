const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Debug: log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.body || req.query);
  next();
});

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API routes loaded' });
});

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('REGISTER body:', req.body);
    const { name, empId, designation, phone, currentDistrict, requiredDistrict } = req.body;

    if (!name || !empId || !designation || !phone || !currentDistrict || !requiredDistrict) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    if (currentDistrict.trim().toLowerCase() === requiredDistrict.trim().toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Districts cannot be same' });
    }

    const existing = await Employee.findOne({ empId: empId.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Employee ID already exists' });
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
    console.log('REGISTER success:', employee.empId);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: { id: employee._id, name: employee.name, empId: employee.empId }
    });

  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search
router.get('/search', async (req, res) => {
  try {
    console.log('SEARCH query:', req.query);
    const { current, required, designation } = req.query;

    if (!current || !required) {
      return res.status(400).json({ success: false, message: 'Both districts required' });
    }

    const query = {
      currentDistrict: { $regex: new RegExp('^' + required.trim() + '$', 'i') },
      requiredDistrict: { $regex: new RegExp('^' + current.trim() + '$', 'i') }
    };

    if (designation && designation !== 'Any') {
      query.designation = designation;
    }

    console.log('SEARCH query built:', JSON.stringify(query));
    const matches = await Employee.find(query).sort({ registeredAt: -1 });
    console.log('SEARCH found:', matches.length, 'matches');

    const maskedMatches = matches.map(m => ({
      id: m._id,
      name: m.name,
      empId: m.empId,
      designation: m.designation,
      phone: m.phone,
      phoneMasked: 'XXXXXX' + m.phone.slice(-4),
      currentDistrict: m.currentDistrict,
      requiredDistrict: m.requiredDistrict,
      daysLeft: Math.max(0, Math.ceil((m.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    }));

    res.json({ success: true, count: maskedMatches.length, data: maskedMatches });

  } catch (error) {
    console.error('SEARCH ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Listings
router.get('/listings', async (req, res) => {
  try {
    console.log('LISTINGS requested');
    const listings = await Employee.find().sort({ registeredAt: -1 });
    console.log('LISTINGS found:', listings.length);

    const formatted = listings.map(item => ({
      id: item._id,
      name: item.name,
      empId: item.empId,
      designation: item.designation,
      currentDistrict: item.currentDistrict,
      requiredDistrict: item.requiredDistrict,
      daysLeft: Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    }));

    res.json({ success: true, count: formatted.length, data: formatted });

  } catch (error) {
    console.error('LISTINGS ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    console.log('STATS requested');
    const total = await Employee.countDocuments();
    console.log('STATS total:', total);

    const currentDistricts = await Employee.distinct('currentDistrict');
    const requiredDistricts = await Employee.distinct('requiredDistrict');
    const allDistricts = new Set([...currentDistricts, ...requiredDistricts].map(d => d.toLowerCase()));

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

    console.log('STATS response:', { total, matches: matchCount, districts: allDistricts.size });
    res.json({ success: true, data: { total, matches: matchCount, districts: allDistricts.size } });

  } catch (error) {
    console.error('STATS ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear all
router.delete('/clear', async (req, res) => {
  try {
    console.log('CLEAR requested');
    await Employee.deleteMany({});
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    console.error('CLEAR ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = router;
