const express = require("express");
const router = express.Router();
const emailTemplateController = require("../controllers/emailTemplateController");
const authMiddleware = require("../middleware/adminMiddleware");

// Routes protected by Admin authentication
router.get("/email-templates", authMiddleware, emailTemplateController.getAllTemplates);
router.put("/email-templates/:key", authMiddleware, emailTemplateController.updateTemplate);

module.exports = router;
