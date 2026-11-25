/**
 * Campus Lost and Found System - Item Controller
 * Handles item creation, searching, filtering, classification, and deletion.
 * Stores images permanently in MongoDB Atlas to prevent ephemeral file loss.
 * Sanitizes public responses to protect students' personal contact information.
 */

const Item = require('../models/Item');
const Claim = require('../models/Claim');
const { classifyItem } = require('../utils/classifier');

/**
 * @desc    Create a new lost or found item
 * @route   POST /api/items
 * @access  Public
 */
exports.createItem = async (req, res) => {
  try {
    const {
      title,
      type,
      category,
      description,
      location,
      date,
      contactName,
      contactEmail,
      contactPhone
    } = req.body;

    // Basic Validation
    if (!title || !type || !description || !location || !contactName || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (title, type, description, location, contact name, contact email).'
      });
    }

    // Run Auto-Classification System
    const classification = classifyItem(title, description);
    
    // Use user-provided category if selected, otherwise fallback to suggested category
    const finalCategory = category && category !== 'auto' ? category.toLowerCase() : classification.suggestedCategory;

    // Process image: store as Base64 Data URI directly in MongoDB for permanent persistence
    let imageUrl = '/uploads/default-item.png';
    if (req.file && req.file.buffer) {
      const mimeType = req.file.mimetype || 'image/jpeg';
      imageUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Persist permanently to MongoDB
    const item = await Item.create({
      title: title.trim(),
      type: type.toLowerCase(),
      category: finalCategory,
      description: description.trim(),
      location: location.trim(),
      date: date || Date.now(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: (contactPhone || '').trim(),
      imageUrl,
      autoTags: classification.autoTags
    });

    res.status(201).json({
      success: true,
      message: 'Item reported and permanently saved to database!',
      data: item
    });
  } catch (error) {
    console.error('[Create Item Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Database Error: Failed to save item permanently'
    });
  }
};

/**
 * @desc    Get all items with search, filter, and sorting
 * @route   GET /api/items
 * @access  Public
 */
exports.getItems = async (req, res) => {
  try {
    const { search, category, type, status, startDate, endDate } = req.query;

    const query = {};

    // Filter by type (lost/found)
    if (type && type !== 'all') {
      query.type = type.toLowerCase();
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category.toLowerCase();
    }

    // Filter by status (active/claimed/resolved)
    if (status && status !== 'all') {
      query.status = status.toLowerCase();
    }

    // Filter by Date Range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.date.$lte = eDate;
      }
    }

    // Keyword Search on Title, Description, Location, or AutoTags
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { autoTags: searchRegex }
      ];
    }

    // Privacy Protection: Exclude students' contact phone and email from the public catalog feed
    const items = await Item.find(query)
      .select('-contactPhone -contactEmail')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('[Get Items Error]', error);
    res.status(500).json({
      success: false,
      message: 'Database Error: Failed to fetch items'
    });
  }
};

/**
 * @desc    Get single item details
 * @route   GET /api/items/:id
 * @access  Public
 */
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in database'
      });
    }

    // Get claim count for this item
    const claimCount = await Claim.countDocuments({ itemId: item._id });

    res.status(200).json({
      success: true,
      data: item,
      claimCount
    });
  } catch (error) {
    console.error('[Get Item By ID Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Invalid Item ID'
    });
  }
};

/**
 * @desc    Real-time Classification Suggestion Helper
 * @route   POST /api/items/classify
 * @access  Public
 */
exports.classifyText = async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = classifyItem(title || '', description || '');

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Classification failed'
    });
  }
};

/**
 * @desc    Update item status (Admin)
 * @route   PATCH /api/items/:id/status
 * @access  Private (Admin)
 */
exports.updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'claimed', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.status(200).json({
      success: true,
      message: `Item status updated to ${status}`,
      data: item
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete item (Admin)
 * @route   DELETE /api/items/:id
 * @access  Private (Admin)
 */
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Delete item and associated claims
    await Item.findByIdAndDelete(req.params.id);
    await Claim.deleteMany({ itemId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Item and associated claim requests removed successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
