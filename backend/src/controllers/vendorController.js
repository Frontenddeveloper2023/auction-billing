const Vendor = require("../models/vendor");
const MainVendor = require("../models/main-vendor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const ExcelJS = require("exceljs");
const Session = require("../models/session");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { cleanupExpiredSessions } = require("./sessionController");
const { getTemplateSubject } = require("./emailTemplateController");

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

const generateBranchId = () => {
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `BRC-${randomDigits}`;
};

// Auth functions (login, signup, forgotPassword, etc.) are removed as Vendor model no longer handles password/auth directly.
// These are now managed as branches under MainVendor.

// ─── BRANCH VENDOR EMAIL OTP LOGIN ─────────────────────────────────────────

// 1. Send OTP for Branch Vendor Login
exports.sendLoginOtp = async (req, res) => {
  try {
    const { email, branchId } = req.body;
    if (!email || !branchId) {
      return res.status(400).json({ status: false, message: "Main vendor email and Branch ID are required" });
    }

    const mainVendor = await MainVendor.findOne({ email: email.trim().toLowerCase() });
    if (!mainVendor) {
      return res.status(404).json({
        status: false,
        message: "Main vendor account not found",
      });
    }

    if (mainVendor.status !== "Active") {
      return res.status(403).json({
        status: false,
        message: "Main vendor account is inactive",
      });
    }

    if (
      mainVendor.planEndDate &&
      new Date() > new Date(mainVendor.planEndDate)
    ) {
      return res.status(403).json({
        status: false,
        message: "Main vendor subscription has expired",
        planExpired: true,
      });
    }

    const vendorBranch = await Vendor.findOne({
      branchId: branchId.trim(),
      mainVendorId: mainVendor._id,
    });

    if (!vendorBranch) {
      return res.status(404).json({
        status: false,
        message: "Vendor branch not found or does not belong to this Main Vendor.",
      });
    }

    if (vendorBranch.status !== "Active") {
      return res.status(403).json({
        status: false,
        message: "Your branch account is not active. Please contact support.",
      });
    }

    // Determine target email: branch's own email if provided, else main vendor's email
    const targetEmail = vendorBranch.email || mainVendor.email;

    // Generate 6-digit OTP valid for 5 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    vendorBranch.otp = otp;
    vendorBranch.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await vendorBranch.save();

    const emailSubject = await getTemplateSubject(
      "branch_vendor_login_otp",
      "Your Login Verification Code"
    );

    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Branch Login Verification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <tr>
                <td align="center" style="background:#F39C12; padding:25px; color:#ffffff;">
                  <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                  <p style="margin:5px 0 0; font-size:14px;">Branch Portal Login Verification</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px; color:#333333;">
                  <h2 style="margin-top:0; color:#1e293b;">Hello ${vendorBranch.name},</h2>
                  <p>Your one-time login verification code (OTP) for Branch <strong>${vendorBranch.branchId}</strong> is:</p>
                  <div style="text-align:center; margin:30px 0;">
                    <span style="font-size:34px; font-weight:bold; letter-spacing:8px; color:#F39C12; padding:14px 28px; background:#fffaf0; border-radius:8px; border:2px dashed #F39C12; display:inline-block;">
                      ${otp}
                    </span>
                  </div>
                  <p style="color:#64748b; font-size:14px;">This code is valid for <strong>5 minutes</strong>. Do not share this OTP with anyone.</p>
                  <br/>
                  <p>Regards,<br/>${process.env.COMPANY_NAME || "AuctionBilling"} Security Team</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="background:#f1f1f1; padding:20px; font-size:12px; color:#777;">
                  <p style="margin:0;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || "AuctionBilling"}. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await sendEmail(targetEmail, emailSubject, emailContent);

    const maskedEmail = targetEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c);

    res.status(200).json({
      status: true,
      message: `OTP sent to ${maskedEmail}`,
      email: targetEmail,
    });
  } catch (error) {
    console.error("Branch Vendor sendLoginOtp error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// 2. Verify OTP for Branch Vendor Login
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, branchId, otp } = req.body;
    if (!email || !branchId || !otp) {
      return res.status(400).json({ status: false, message: "Email, Branch ID, and OTP are required" });
    }

    const mainVendor = await MainVendor.findOne({ email: email.trim().toLowerCase() });
    if (!mainVendor) {
      return res.status(404).json({ status: false, message: "Main vendor account not found" });
    }

    if (mainVendor.status !== "Active") {
      return res.status(403).json({ status: false, message: "Main vendor account inactive" });
    }

    if (
      mainVendor.planEndDate &&
      new Date() > new Date(mainVendor.planEndDate)
    ) {
      return res.status(403).json({
        status: false,
        message: "Main vendor subscription expired",
        planExpired: true,
      });
    }

    const vendorBranch = await Vendor.findOne({
      branchId: branchId.trim(),
      mainVendorId: mainVendor._id,
    }).populate("mainVendorId", "name email");

    if (!vendorBranch) {
      return res.status(404).json({ status: false, message: "Vendor branch not found" });
    }

    if (vendorBranch.status !== "Active") {
      return res.status(403).json({ status: false, message: "Your branch account is not active." });
    }

    if (!vendorBranch.otp || vendorBranch.otp !== otp.trim()) {
      return res.status(400).json({ status: false, message: "Invalid OTP code" });
    }



    if (!vendorBranch.otpExpires || new Date() > new Date(vendorBranch.otpExpires)) {
      return res.status(400).json({ status: false, message: "OTP has expired. Please request a new one." });
    }

    // Clear OTP
    vendorBranch.otp = null;
    vendorBranch.otpExpires = null;
    await vendorBranch.save();

    await cleanupExpiredSessions("Vendor");
    // ─── Check for existing active session ───────────────────────────────────
    const existingSession = await Session.findOne({
      userId: vendorBranch._id,
      userType: "Vendor",
      isActive: true,
    });

    if (existingSession) {
      return res.status(409).json({
        status: false,
        alreadyLogged: true,
        message: "This branch account is already logged in on another device.",
        loggedInSince: existingSession.createdAt,
        lastActivity: existingSession.lastActivity,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const sessionId = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(
      {
        id: vendorBranch._id,
        role: "vendor",
        mainVendorId: mainVendor._id,
        sessionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Create new session
    await Session.create({
      sessionId,
      userId: vendorBranch._id,
      userType: "Vendor",
      token,
      lastActivity: new Date(),
      isActive: true,
    });

    const vendorData = vendorBranch.toObject();

    res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      sessionId, // Returning sessionId to frontend for tracking
      user: {
        ...vendorData,
        role: "vendor",
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.login = exports.verifyLoginOtp;

exports.createVendor = async (req, res) => {
  try {
    let {
      name,
      email,
      phone,
      address,
      city,
      state,
      status,
      branchId,
      mainVendorId,
    } = req.body;

    const vendorNameExists = await Vendor.findOne({ name });
    if (vendorNameExists) {
      return res.status(400).json({
        status: false,
        message: "Name is already in use",
      });
    }

    if (email) {
      const vendorEmailExists = await Vendor.findOne({ email });
      if (vendorEmailExists) {
        return res.status(400).json({
          status: false,
          message: "Email is already in use",
        });
      }
    }

    const finalBranchId = branchId || generateBranchId();

    const newVendor = new Vendor({
      name,
      email,
      phone,
      address,
      city,
      state,
      branchId: finalBranchId,
      mainVendorId,
      status: status || "Active",
      createdBy: req.user?.id,
      updatedBy: req.user?.id,
    });

    await newVendor.save();

    res.status(201).json({
      status: true,
      message: "Vendor (Branch) created successfully",
      vendor: newVendor,
    });
  } catch (error) {
    console.error("Create vendor error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { mainVendorId } = req.query;
    let query = {};
    if (mainVendorId) {
      query.mainVendorId = mainVendorId;
    }

    const vendors = await Vendor.find(query).populate("mainVendorId", "name");
    const vendorIds = vendors.map((v) => v._id);

    res.status(200).json({ status: true, vendors });
  } catch (error) {
    console.error("Get vendors error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).populate("mainVendorId", "name");
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Vendor not found" });
    }

    res.status(200).json({
      status: true,
      vendor,
    });
  } catch (error) {
    console.error("Get vendor by id error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      email,
      phone,
      address,
      city,
      state,
      status,
      branchId,
      mainVendorId,
    } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Vendor not found" });
    }

    if (name && name !== vendor.name) {
      const nameExists = await Vendor.findOne({ name });
      if (nameExists) {
        return res
          .status(400)
          .json({ status: false, message: "Name is already in use" });
      }
    }

    if (email && email !== vendor.email) {
      const emailExists = await Vendor.findOne({ email });
      if (emailExists) {
        return res
          .status(400)
          .json({ status: false, message: "Email is already in use" });
      }
    }

    if (name) vendor.name = name;
    if (email) vendor.email = email;
    if (phone) vendor.phone = phone;
    if (address) vendor.address = address;
    if (city) vendor.city = city;
    if (state) vendor.state = state;
    if (status) vendor.status = status;
    if (branchId !== undefined) vendor.branchId = branchId;
    if (mainVendorId !== undefined) vendor.mainVendorId = mainVendorId;

    vendor.updatedBy = req.user?.id;
    await vendor.save();

    // Invalidate sessions if status was changed to Inactive
    if (status && status !== "Active") {
      await Session.updateMany(
        { userId: id, userType: "Vendor", isActive: true },
        { isActive: false },
      );
    }

    res
      .status(200)
      .json({ status: true, message: "Vendor updated successfully", vendor });
  } catch (error) {
    console.error("Update vendor error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findByIdAndDelete(id);

    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Vendor not found" });
    }

    // Invalidate all sessions for this Vendor branch
    await Session.updateMany(
      { userId: id, userType: "Vendor", isActive: true },
      { isActive: false },
    );

    res
      .status(200)
      .json({ status: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete vendor error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Auth-related logic removed. Individual Branch accounts are managed under Main Vendor.

exports.exportVendors = async (req, res) => {
  try {
    const { state, city, status, from, to, search } = req.body;

    let query = {};

    if (state) query.state = state;
    if (city) query.city = city;
    if (status) query.status = status;

    if (from || to) {
      query.joinedDate = {};
      if (from) query.joinedDate.$gte = new Date(from);
      if (to) {
        let toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.joinedDate.$lte = toDate;
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vendors");

    worksheet.columns = [
      { header: "Vendor Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Address", key: "address", width: 30 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Joined Date", key: "joinedDate", width: 20 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    vendors.forEach((vendor) => {
      worksheet.addRow({
        name: vendor.name,
        email: vendor.email || "N/A",
        phone: vendor.phone || "N/A",
        address: vendor.address || "N/A",
        city: vendor.city || "N/A",
        state: vendor.state || "N/A",
        status: vendor.status,
        joinedDate: vendor.joinedDate
          ? new Date(vendor.joinedDate).toLocaleDateString()
          : "N/A",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=vendors_report_${Date.now()}.xlsx`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Export vendors error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};
