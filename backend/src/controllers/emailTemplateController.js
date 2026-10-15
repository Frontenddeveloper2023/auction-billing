const EmailTemplate = require("../models/emailTemplate");

// Default templates seed list for all system emails
const DEFAULT_TEMPLATES = [
  {
    templateKey: "main_vendor_account_created",
    templateName: "Main Vendor Account Created",
    subject: "Your Account for AUCTION BILLING is created.",
    description: "Sent to Main Vendor with login credentials upon account creation.",
  },
  {
    templateKey: "main_vendor_plan_updated",
    templateName: "Main Vendor Plan Updated",
    subject: "Your Subscription Plan Has Been Updated",
    description: "Sent to Main Vendor when their subscription plan is updated or renewed.",
  },
  {
    templateKey: "main_vendor_account_activated",
    templateName: "Main Vendor Account Activated",
    subject: "Your Account Has Been Activated",
    description: "Sent to Main Vendor when their account status changes to Active.",
  },
  {
    templateKey: "main_vendor_account_deleted",
    templateName: "Main Vendor Account Deleted",
    subject: "Your Account Has Been Deleted",
    description: "Sent to Main Vendor when their account is deleted by admin.",
  },
  {
    templateKey: "main_vendor_signup_received",
    templateName: "Main Vendor Registration Received",
    subject: "Your Subscription Request Has Been Received",
    description: "Sent to new Main Vendor acknowledging their registration request.",
  },
  {
    templateKey: "main_vendor_reset_otp",
    templateName: "Main Vendor Password Reset OTP",
    subject: "Password Reset OTP",
    description: "Sent to Main Vendor requesting a password reset OTP.",
  },
  {
    templateKey: "sub_admin_account_created",
    templateName: "Sub Admin Account Created",
    subject: "Sub Admin Account Created",
    description: "Sent to new Sub Admin with login credentials.",
  },
  {
    templateKey: "sub_admin_account_updated",
    templateName: "Sub Admin Account Updated",
    subject: "Sub Admin Account Updated",
    description: "Sent to Sub Admin when their account or permissions are updated.",
  },
  {
    templateKey: "sub_admin_account_deleted",
    templateName: "Sub Admin Account Deleted",
    subject: "Account Deleted",
    description: "Sent to Sub Admin when their account is deleted.",
  },
  {
    templateKey: "admin_email_update_otp",
    templateName: "Admin Update Email OTP",
    subject: "Update Email OTP",
    description: "Sent to Admin when requesting to update their email address.",
  },
  {
    templateKey: "admin_password_reset_otp",
    templateName: "Admin Password Reset OTP",
    subject: "Admin Password Reset OTP",
    description: "Sent to Admin requesting a password reset OTP.",
  },
  {
    templateKey: "admin_login_otp",
    templateName: "Admin Login OTP",
    subject: "Your Login Verification Code",
    description: "Email sent to Super Admin / Sub-Admin containing OTP for secure login.",
  },
  {
    templateKey: "main_vendor_login_otp",
    templateName: "Main Vendor Login OTP",
    subject: "Your Login Verification Code",
    description: "Email sent to Main Vendor containing OTP for secure login.",
  },
  {
    templateKey: "branch_vendor_login_otp",
    templateName: "Branch Vendor Login OTP",
    subject: "Your Login Verification Code",
    description: "Email sent to Branch Vendor containing OTP for secure login.",
  },
  {
    templateKey: "subscription_expiry_reminder",
    templateName: "Subscription Expiry Reminder",
    subject: "Subscription Expiry Reminder",
    description: "Sent to vendors 2 days before subscription expires.",
  },
  {
    templateKey: "subscription_expired",
    templateName: "Subscription Expired",
    subject: "Subscription Expired",
    description: "Sent to vendors when subscription has expired.",
  },
];

// Helper function to seed defaults if not in DB
const ensureDefaults = async () => {
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await EmailTemplate.findOne({ templateKey: t.templateKey });
    if (!exists) {
      await EmailTemplate.create(t);
    }
  }
};

// GET all templates
exports.getAllTemplates = async (req, res) => {
  try {
    await ensureDefaults();
    const templates = await EmailTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: true,
      templates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// UPDATE template subject by key
exports.updateTemplate = async (req, res) => {
  try {
    const { key } = req.params;
    const { subject } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ status: false, message: "Subject is required" });
    }

    let template = await EmailTemplate.findOne({ templateKey: key });
    if (!template) {
      // create if not existing
      template = await EmailTemplate.create({
        templateKey: key,
        templateName: "Main Vendor Account Created",
        subject: subject.trim(),
        description: "Email sent to the Main Vendor upon account creation.",
      });
    } else {
      template.subject = subject.trim();
      await template.save();
    }

    res.status(200).json({
      status: true,
      message: "Template updated successfully",
      template,
    });
  } catch (error) {
    console.error("Update template error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Helper function used by controllers to get subject with fallback
exports.getTemplateSubject = async (templateKey, fallbackSubject) => {
  try {
    const t = await EmailTemplate.findOne({ templateKey });
    if (t && t.subject) {
      return t.subject;
    }
    return fallbackSubject;
  } catch (err) {
    console.error("Error reading template subject:", err);
    return fallbackSubject;
  }
};
