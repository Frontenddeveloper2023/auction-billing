const MainVendor = require("../models/main-vendor");
const mongoose = require("mongoose");
const Plan = require("../models/subscriptions");
const bcrypt = require("bcryptjs");
const UserSubscription = require("../models/userSubscription");
const Session = require("../models/session");
const crypto = require("crypto");
const ExcelJS = require("exceljs");
const Notification = require("../models/notification");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor");
const Seller = require("../models/seller");
const Buyer = require("../models/buyer");
const Transaction = require("../models/transaction");
const { cleanupExpiredSessions } = require("./sessionController");
const { getTemplateSubject } = require("./emailTemplateController");
const {
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreeOrderPayments,
} = require("../utils/cashfree");

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

exports.getMainVendors = async (req, res) => {
  try {
    const mainVendors = await MainVendor.find()
      .populate("plan", "name planId price durationType durationValue branchCount")
      .populate("requestedPlan", "name planId price")
      .populate("queuedPlan", "name planId price durationType durationValue branchCount")
      .sort({ createdAt: -1, joinedDate: -1, _id: -1 });

    const now = new Date();
    // Auto-promote queued plans whose current plan has expired
    for (const vendor of mainVendors) {
      if (
        vendor.queuedPlan &&
        vendor.queuedPlanStartDate &&
        now >= new Date(vendor.queuedPlanStartDate)
      ) {
        vendor.plan = vendor.queuedPlan._id || vendor.queuedPlan;
        vendor.planEndDate = vendor.queuedPlanEndDate || vendor.planEndDate;
        vendor.queuedPlan = null;
        vendor.queuedPlanStartDate = null;
        vendor.queuedPlanEndDate = null;
        vendor.upgradeType = null;
        await vendor.save();
      }
    }

    const mainVendorIds = mainVendors.map((v) => v._id);

    const allSubscriptions = await UserSubscription.find({
      userId: { $in: mainVendorIds },
    }).sort({ createdAt: -1 });

    const mainVendorsWithSub = mainVendors.map((vendor) => {
      const vendorSubs = allSubscriptions.filter(
        (s) => s.userId.toString() === vendor._id.toString()
      );

      // Find current active subscription matching vendor's current plan
      let activeSub =
        vendorSubs.find(
          (s) =>
            vendor.plan &&
            s.subscriptionId &&
            s.subscriptionId.toString() === (vendor.plan._id || vendor.plan).toString() &&
            (!vendor.queuedPlanStartDate || new Date(s.startDate) < new Date(vendor.queuedPlanStartDate))
        ) ||
        vendorSubs.find((s) => new Date(s.startDate) <= now) ||
        vendorSubs[0];

      let computedStartDate =
        vendor.planStartDate ||
        activeSub?.startDate ||
        vendor.joinedDate ||
        vendor.createdAt;

      // Ensure planStartDate is not erroneously identical to planEndDate
      if (
        vendor.planEndDate &&
        computedStartDate &&
        new Date(computedStartDate).getTime() >= new Date(vendor.planEndDate).getTime()
      ) {
        computedStartDate = vendor.joinedDate || vendor.createdAt || new Date(new Date(vendor.planEndDate).getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (activeSub) {
        activeSub = {
          ...activeSub.toObject(),
          startDate: computedStartDate,
          endDate: vendor.planEndDate || activeSub.endDate,
        };
      }

      return {
        ...vendor.toObject(),
        planStartDate: computedStartDate,
        activeSubscription: activeSub || null,
      };
    });

    res.status(200).json({ status: true, mainVendors: mainVendorsWithSub });
  } catch (error) {
    console.error("Get main vendors error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.createMainVendor = async (req, res) => {
  try {
    let {
      name,
      email,
      phone,
      address,
      city,
      state,
      plan,
      status,
      isTrial,
      trialDays,
    } = req.body;

    const emailExists = await MainVendor.findOne({ email });
    if (emailExists) {
      return res
        .status(400)
        .json({ status: false, message: "Email is already in use" });
    }

    const isTrialSelected =
      isTrial === true ||
      isTrial === "true" ||
      isTrial === 1 ||
      isTrial === "1";

    const plainPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const clientBaseUrl = (
      process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system"
    ).replace(/\/$/, "");

    // ----------------------------------------------------
    // CASE A: FREE TRIAL (Custom Days >= 1)
    // ----------------------------------------------------
    if (isTrialSelected) {
      const parsedDays = parseInt(trialDays, 10);
      if (isNaN(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({
          status: false,
          message: "Free trial days must be a positive number (minimum 1 day).",
        });
      }

      let planEndDate = new Date();
      planEndDate.setDate(planEndDate.getDate() + parsedDays);
      planEndDate.setHours(23, 59, 59, 999);

      const newMainVendor = new MainVendor({
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        city,
        state,
        plan: plan || undefined,
        isTrial: true,
        trialDays: parsedDays,
        planEndDate,
        status: "Active",
        paymentStatus: "Paid",
        joinedDate: new Date(),
      });

      await newMainVendor.save();

      await UserSubscription.create({
        userId: newMainVendor._id,
        subscriptionId: plan || undefined,
        priceAtPurchase: 0,
        branchCount: 999,
        featuresAtPurchase: { trial: true, trialDays: parsedDays },
        startDate: new Date(),
        endDate: planEndDate,
      });

      // Send Free Trial Email with Direct Login Button
      try {
        const loginUrl = `${clientBaseUrl}/`;
        const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Your Free Trial Account Has Been Created</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                  <tr>
                    <td align="center" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:30px 20px; color:#ffffff;">
                      <h1 style="margin:0; font-size:24px; font-weight:700;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                      <p style="margin:6px 0 0; font-size:15px; opacity:0.95;">Free Trial Account Activated</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 30px; color:#334155;">
                      <h2 style="margin-top:0; color:#0f172a; font-size:20px;">Hello ${name},</h2>
                      <p style="font-size:15px; line-height:1.6;">
                        Your vendor account has been created by the Admin with a <strong>${parsedDays}-Day Free Trial</strong>.
                      </p>
                      
                      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px 20px; margin:24px 0;">
                        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">
                          <tr>
                            <td width="35%" style="color:#64748b;"><strong>Registered Email:</strong></td>
                            <td style="color:#0f172a;">${email}</td>
                          </tr>
                          <tr>
                            <td style="color:#64748b;"><strong>Account Type:</strong></td>
                            <td style="color:#10b981; font-weight:700;">Free Trial (${parsedDays} Days)</td>
                          </tr>
                          <tr>
                            <td style="color:#64748b;"><strong>Trial Valid Till:</strong></td>
                            <td style="color:#0f172a; font-weight:600;">${planEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                          </tr>
                        </table>
                      </div>

                      <p style="font-size:14px; color:#64748b; line-height:1.5;">
                        You can sign in directly to your vendor dashboard using your email address and a one-time password (OTP).
                      </p>

                      <div style="text-align:center; margin:30px 0;">
                        <a href="${loginUrl}" 
                           style="background:#10b981; color:#ffffff; padding:14px 32px; text-decoration:none; border-radius:8px; font-size:15px; font-weight:700; display:inline-block; box-shadow:0 4px 10px rgba(16,185,129,0.35);">
                          Login to Your Account
                        </a>
                      </div>

                      <p style="margin:20px 0 0; font-size:13px; color:#94a3b8; text-align:center;">
                        If the button doesn't open, copy this link to your browser: <br/>
                        <a href="${loginUrl}" style="color:#10b981;">${loginUrl}</a>
                      </p>

                      <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0 20px;" />
                      <p style="margin:0; font-size:14px; color:#475569;">Regards,<br/><strong>${process.env.COMPANY_NAME || "AuctionBilling"} Team</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="background:#f8fafc; padding:18px; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
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

        await sendEmail(
          email,
          `Welcome to ${process.env.COMPANY_NAME || "AuctionBilling"} - ${parsedDays} Days Free Trial`,
          emailContent
        );
      } catch (emailErr) {
        console.error("Free trial welcome email error:", emailErr);
      }

      return res.status(201).json({
        status: true,
        message: `Vendor created successfully with ${parsedDays} days free trial! Welcome email sent.`,
        vendor: newMainVendor,
      });
    }

    // ----------------------------------------------------
    // CASE B: PAID SUBSCRIPTION PLAN
    // ----------------------------------------------------
    if (!plan) {
      return res.status(400).json({
        status: false,
        message: "Please choose a subscription plan or enable Free Trial.",
      });
    }

    const planExists = await Plan.findById(plan);
    if (!planExists) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid subscription plan." });
    }

    // Create vendor with status Pending awaiting payment
    const newMainVendor = new MainVendor({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      city,
      state,
      plan: planExists._id,
      isTrial: false,
      trialDays: 0,
      status: "Pending", // Awaiting payment
      paymentStatus: "Pending",
      joinedDate: new Date(),
    });

    await newMainVendor.save();

    // Direct Checkout Link for Vendor to Pay
    const payLink = `${clientBaseUrl}/pay-subscription?vendorId=${newMainVendor._id}`;

    // Send Email to Vendor with Direct "Pay Now" Button
    try {
      const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Account Created - Complete Your Subscription Payment</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg, #F39C12 0%, #d97706 100%); padding:30px 20px; color:#ffffff;">
                    <h1 style="margin:0; font-size:24px; font-weight:700;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                    <p style="margin:6px 0 0; font-size:15px; opacity:0.95;">Account Created by Admin</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px; color:#334155;">
                    <h2 style="margin-top:0; color:#0f172a; font-size:20px;">Hello ${name},</h2>
                    <p style="font-size:15px; line-height:1.6;">
                      Your vendor account has been created by the Admin for the <strong>${planExists.name}</strong> plan.
                    </p>
                    <p style="font-size:14px; color:#64748b; margin-top:4px;">
                      Please complete your subscription payment to activate your account and start using the platform.
                    </p>
                    
                    <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:18px 20px; margin:24px 0;">
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">
                        <tr>
                          <td width="35%" style="color:#78350f;"><strong>Vendor Name:</strong></td>
                          <td style="color:#0f172a;">${name}</td>
                        </tr>
                        <tr>
                          <td style="color:#78350f;"><strong>Selected Plan:</strong></td>
                          <td style="color:#0f172a; font-weight:700;">${planExists.name}</td>
                        </tr>
                        <tr>
                          <td style="color:#78350f;"><strong>Amount Payable:</strong></td>
                          <td style="color:#d97706; font-size:18px; font-weight:800;">₹${planExists.price}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align:center; margin:32px 0;">
                      <a href="${payLink}" 
                         style="background:#F39C12; color:#ffffff; padding:15px 36px; text-decoration:none; border-radius:8px; font-size:16px; font-weight:700; display:inline-block; box-shadow:0 4px 12px rgba(243,156,18,0.4);">
                        Pay Now ₹${planExists.price}
                      </a>
                    </div>

                    <p style="margin:20px 0 0; font-size:13px; color:#94a3b8; text-align:center;">
                      If button doesn't open, copy this link to your browser: <br/>
                      <a href="${payLink}" style="color:#F39C12;">${payLink}</a>
                    </p>

                    <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0 20px;" />
                    <p style="margin:0; font-size:14px; color:#475569;">Regards,<br/><strong>${process.env.COMPANY_NAME || "AuctionBilling"} Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background:#f8fafc; padding:18px; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
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

      await sendEmail(
        email,
        `Complete Your Subscription Payment - ${planExists.name} Plan`,
        emailContent
      );
    } catch (emailErr) {
      console.error("Paid plan email error:", emailErr);
    }

    res.status(201).json({
      status: true,
      message: `Vendor account created for ${planExists.name}! Payment link sent to ${email}.`,
      vendor: newMainVendor,
    });
  } catch (error) {
    console.error("Create main vendor error:", error);
    res.status(500).json({ status: false, message: error.message || "Internal server error" });
  }
};

exports.updateMainVendor = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = req.body;

    // Remove protected fields
    delete updateData.password;
    delete updateData.role;

    // Safe handle for ObjectId fields (avoid empty string errors)
    if (
      updateData.requestedPlan === "" ||
      updateData.requestedPlan === "null"
    ) {
      updateData.requestedPlan = null;
    }
    if (updateData.plan === "" || updateData.plan === "null") {
      delete updateData.plan;
    }

    // Capture the vendor before update to check for plan changes
    const vendorBeforeUpdate = await MainVendor.findById(id);
    if (!vendorBeforeUpdate) {
      return res
        .status(404)
        .json({ status: false, message: "Main vendor not found" });
    }

    // Notify Admin if requestedPlan is being set (upgrade/renewal request)
    if (
      updateData.requestedPlan &&
      updateData.requestedPlan.toString() !==
        vendorBeforeUpdate.requestedPlan?.toString()
    ) {
      const requestedPlanExists = await Plan.findById(updateData.requestedPlan);
      if (requestedPlanExists) {
        try {
          await Notification.create({
            userId: id,
            userModel: "MainVendor",
            senderName: vendorBeforeUpdate.name,
            title: "Plan Renewal/Upgrade Request",
            message: `Main Vendor ${vendorBeforeUpdate.name} has requested for ${requestedPlanExists.name} plan.`,
            type: "plan_upgrade",
            recipient: "admin",
          });
        } catch (e) {
          console.error("Admin notification error:", e);
        }
      }
    }

    const wasPendingAndNowActive =
      updateData.status &&
      updateData.status === "Active" &&
      vendorBeforeUpdate.status === "Pending";

    let planToActivate = null;
    let newPlanEndDate = null;

    // Case 1: Plan Update/Upgrade Approval OR Renewal
    // We allow it if plan is provided (even if same ID) to handle renewals
    if (
      updateData.plan &&
      updateData.plan !== "null" &&
      updateData.plan !== ""
    ) {
      const newPlan = await Plan.findById(updateData.plan);
      if (newPlan) {
        // Recalculate planEndDate
        let planEndDate = new Date();
        if (
          vendorBeforeUpdate.upgradeType === "after_current" &&
          vendorBeforeUpdate.planEndDate > new Date()
        ) {
          planEndDate = new Date(vendorBeforeUpdate.planEndDate);
        }

        if (newPlan.durationType === "year") {
          planEndDate.setFullYear(
            planEndDate.getFullYear() + (newPlan.durationValue || 1),
          );
        } else {
          planEndDate.setDate(
            planEndDate.getDate() + 30 * (newPlan.durationValue || 1),
          );
        }

        updateData.planEndDate = planEndDate;
        planToActivate = newPlan;
        newPlanEndDate = planEndDate;

        // Clear request fields when admin sets a plan
        updateData.requestedPlan = null;
        updateData.upgradeType = null;
      }
    }
    // Case 2: Activation from Pending (First time approval)
    else if (wasPendingAndNowActive) {
      updateData.joinedDate = new Date();
      const currentPlan = await Plan.findById(vendorBeforeUpdate.plan);
      if (currentPlan) {
        let planEndDate = new Date();
        if (currentPlan.durationType === "year") {
          planEndDate.setFullYear(
            planEndDate.getFullYear() + (currentPlan.durationValue || 1),
          );
        } else {
          planEndDate.setDate(
            planEndDate.getDate() + 30 * (currentPlan.durationValue || 1),
          );
        }
        updateData.planEndDate = planEndDate;
        planToActivate = currentPlan;
        newPlanEndDate = planEndDate;
      }
    }

    const updatedVendor = await MainVendor.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    }).populate("plan");

    console.log(
      `Update Main Vendor ${id}: status changed from ${vendorBeforeUpdate.status} to ${updateData.status || vendorBeforeUpdate.status}. Activation detected: ${wasPendingAndNowActive}. Plan to activate: ${planToActivate ? planToActivate.name || planToActivate._id : "none"}`,
    );

    // Create UserSubscription entry if plan changed or account activated
    if (planToActivate) {
      try {
        await UserSubscription.create({
          userId: id,
          subscriptionId: planToActivate._id,
          priceAtPurchase: planToActivate.price,
          branchCount: planToActivate.branchCount || 0,
          featuresAtPurchase: planToActivate.features || {},
          startDate: new Date(),
          endDate: newPlanEndDate,
        });
        console.log(
          `UserSubscription stored successfully for Main Vendor ${id}`,
        );
      } catch (subErr) {
        console.error(
          `Failed to store UserSubscription for Main Vendor ${id}:`,
          subErr,
        );
        // We don't necessarily want to fail the whole update if only the sub record failed,
        // but it's important to know.
      }
    }

    // send notification/email if there was a plan change or status activation
    try {
      const vendorObj = updatedVendor.toObject();
      let notifyTitle = null;
      let notifyMessage = null;
      let emailSubject = null;
      let emailHtml = null;

      if (planToActivate && !wasPendingAndNowActive) {
        notifyTitle = "Subscription Plan Updated";
        notifyMessage = `Your subscription has been changed to ${planToActivate.name}.`;
        emailSubject = await getTemplateSubject(
          "main_vendor_plan_updated",
          "Your Subscription Plan Has Been Updated"
        );
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Subscription Updated</title>
          </head>
          <body style="margin:0; padding:0; background-color:#F39C12; font-family:Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
                    <tr>
                      <td align="center" style="background:#F39C12; padding:25px; color:#ffffff;">
                        <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                        <p style="margin:5px 0 0; font-size:14px;">Subscription Plan Updated</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px; color:#333333;">
                        <h2 style="margin-top:0;">Hello ${vendorObj.name},</h2>
                        <p>Your subscription plan has been successfully updated or renewed.</p>
                        <p>Below are the details of your active subscription:</p>
                        
                        <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:20px;">
                          <tr>
                            <td><strong>Updated Plan:</strong></td>
                            <td>${planToActivate.name}</td>
                          </tr>
                          <tr>
                            <td><strong>Price:</strong></td>
                            <td>${planToActivate.price || "N/A"}</td>
                          </tr>
                          <tr>
                            <td><strong>Valid Till:</strong></td>
                            <td>${newPlanEndDate.toLocaleDateString()}</td>
                          </tr>
                        </table>
                        
                        <p>Thank you for continuing with ${process.env.COMPANY_NAME || "AuctionBilling"}! You can manage your auctions and view your billing history via the link below.</p>

                        <div style="text-align:center; margin:30px 0;">
                          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}" style="background:#F39C12; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">Go to Dashboard</a>
                        </div>
                        <br/>
                        <p>Regards,<br/>${process.env.COMPANY_NAME || "AuctionBilling"} Team</p>
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
      }

      // Activation from pending?
      if (wasPendingAndNowActive) {
        notifyTitle = "Account Activated";
        notifyMessage = "Your account status has been changed to Active.";
        emailSubject = await getTemplateSubject(
          "main_vendor_account_activated",
          "Your Account Has Been Activated"
        );

        const planName = planToActivate
          ? planToActivate.name
          : updatedVendor.plan?.name || "Standard Plan";
        const expiryStr = newPlanEndDate
          ? newPlanEndDate.toLocaleDateString()
          : updatedVendor.planEndDate
            ? new Date(updatedVendor.planEndDate).toLocaleDateString()
            : "N/A";

        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Account Activated</title>
          </head>
          <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
                    <tr>
                      <td align="center" style="background:#F39C12; padding:25px; color:#ffffff;">
                        <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                        <p style="margin:5px 0 0; font-size:14px;">Account Activated</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px; color:#333333;">
                        <h2 style="margin-top:0;">Hello ${vendorObj.name},</h2>
                        <p>Great news! Your Main Vendor account has been reviewed and successfully activated.</p>
                        <p>You can now log in to your dashboard and start managing your auctions.</p>
                        
                        <div style="text-align:center; margin:30px 0;">
                          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}" style="background:#F39C12; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold;">Login to Your Account</a>
                        </div>

                        <p>Details of your assigned plan:</p>
                        <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:20px;">
                          <tr>
                            <td><strong>Current Plan:</strong></td>
                            <td>${planName}</td>
                          </tr>
                          <tr>
                            <td><strong>Valid Till:</strong></td>
                            <td>${expiryStr}</td>
                          </tr>
                        </table>
                        
                        <p>If you have any questions, feel free to reply to this email.</p>
                        <br/>
                        <p>Regards,<br/>${process.env.COMPANY_NAME || "AuctionBilling"} Team</p>
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
      }

      if (notifyTitle && notifyMessage) {
        await new Notification({
          userId: id,
          userModel: "MainVendor",
          title: notifyTitle,
          message: notifyMessage,
          type: "plan_upgrade",
          recipient: "main-vendor",
        }).save();
      }
      if (emailSubject && emailHtml) {
        await sendEmail(vendorObj.email, emailSubject, emailHtml);
      }
    } catch (notifyErr) {
      console.error("Post-update notification/email error:", notifyErr);
    }

    // Invalidate existing sessions if status was changed to Inactive
    if (updateData.status && updateData.status !== "Active") {
      await Session.updateMany(
        { userId: id, userType: "MainVendor", isActive: true },
        { isActive: false },
      );
    }

    res.status(200).json({
      status: true,
      message: "Main vendor updated",
      mainVendor: updatedVendor,
    });
  } catch (error) {
    console.error("Update main vendor error:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.deleteMainVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await MainVendor.findById(id);
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Main vendor not found" });
    }

    await MainVendor.findByIdAndDelete(id);

    // Invalidate all sessions for this MainVendor
    await Session.updateMany(
      {
        userId: id,
        userType: "MainVendor",
        isActive: true,
      },
      { isActive: false },
    );

    // optional email informing deletion
    try {
      const deleteEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Account Deleted</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
                  <tr>
                    <td align="center" style="background:#e74c3c; padding:25px; color:#ffffff;">
                      <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                      <p style="margin:5px 0 0; font-size:14px;">Account Deletion Notice</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px; color:#333333;">
                      <h2 style="margin-top:0;">Hello ${vendor.name},</h2>
                      <p>This is to inform you that your Main Vendor account has been deleted by the administrator.</p>
                      
                      <p>If you believe this was done in error or if you have questions regarding this action, please contact our support team immediately.</p>
                      
                      <p>Thank you for the time you spent with us.</p>
                      <br/>
                      <p>Regards,<br/>${process.env.COMPANY_NAME || "AuctionBilling"} Team</p>
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
      const delSubject = await getTemplateSubject(
        "main_vendor_account_deleted",
        "Your Account Has Been Deleted"
      );
      await sendEmail(
        vendor.email,
        delSubject,
        deleteEmail,
      );
    } catch (emailErr) {
      console.error("Deletion email error:", emailErr);
    }

    res.status(200).json({ status: true, message: "Main vendor deleted" });
  } catch (error) {
    console.error("Delete main vendor error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.exportMainVendors = async (req, res) => {
  try {
    const mainVendors = await MainVendor.find().populate("plan");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Main Vendors");

    worksheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Plan", key: "plan", width: 15 },
      { header: "Status", key: "status", width: 10 },
    ];

    mainVendors.forEach((v) => {
      worksheet.addRow({
        name: v.name,
        email: v.email,
        phone: v.phone,
        plan: v.plan?.name || "N/A",
        status: v.status,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=main_vendors.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getMainVendorPurchases = async (req, res) => {
  try {
    // Fetch all subscriptions and populate userId from MainVendor model.
    // This allows us to filter for subscriptions that actually belong to MainVendors.
    const purchases = await UserSubscription.find()
      .populate({
        path: "userId",
        model: "MainVendor",
        select: "name status",
      })
      .populate("subscriptionId", "name")
      .sort({ createdAt: -1 });

    // Filter to only include those where userId was successfully populated from MainVendor
    const filteredPurchases = purchases.filter((sub) => sub.userId !== null);

    const formattedPurchases = filteredPurchases.map((sub) => {
      const currentDate = new Date();
      const isExpired = new Date(sub.endDate) < currentDate;
      const currentSubStatus = isExpired
        ? "Expired"
        : sub.userId?.status || "Active";

      return {
        id: sub._id,
        mainVendorId: sub.userId?._id,
        mainVendorName: sub.userId?.name || "Unknown Main Vendor",
        plan: sub.subscriptionId?.name || "Unknown Plan",
        price: sub.priceAtPurchase || 0,
        branchCount: sub.branchCount || 0,
        status: currentSubStatus,
        paymentStatus: "Paid",
        startDate: sub.startDate,
        expiryDate: sub.endDate,
        transactionId: `TXN_${sub._id.toString().slice(-6).toUpperCase()}`,
      };
    });

    res.status(200).json({ status: true, purchases: formattedPurchases });
  } catch (error) {
    console.error("Get all purchases error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getMainVendorPurchasesById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchases = await UserSubscription.find({ userId: id })
      .populate("subscriptionId", "name")
      .sort({ createdAt: -1 });

    const formattedPurchases = purchases.map((sub) => {
      return {
        id: sub._id,
        plan: sub.subscriptionId?.name || "Unknown Plan",
        amount: sub.priceAtPurchase || 0,
        branchCount: sub.branchCount || 0,
        status: "Paid", // Assuming all entries in UserSubscription are paid
        date: sub.startDate,
        expiryDate: sub.endDate,
        description: `${sub.subscriptionId?.name || "Subscription"} Plan`,
      };
    });

    res.status(200).json({ status: true, purchases: formattedPurchases });
  } catch (error) {
    console.error("Get vendor purchases error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.exportMainVendorPurchases = async (req, res) => {
  try {
    const { from, to, search } = req.body;

    let query = {};
    if (from && to) {
      query.startDate = {
        $gte: new Date(new Date(from).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      };
    } else if (from) {
      query.startDate = { $gte: new Date(new Date(from).setHours(0, 0, 0, 0)) };
    } else if (to) {
      query.startDate = { $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
    }

    const purchases = await UserSubscription.find(query)
      .populate({
        path: "userId",
        model: "MainVendor",
        select: "name email phone",
      })
      .populate("subscriptionId", "name")
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Purchase History");

    worksheet.columns = [
      { header: "Main Vendor Name", key: "vendorName", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Plan", key: "plan", width: 15 },
      { header: "Price", key: "price", width: 15 },
      { header: "Branch Count", key: "branchCount", width: 15 },
      { header: "Status", key: "status", width: 10 },
      { header: "Purchase Date", key: "startDate", width: 20 },
      { header: "Expiry Date", key: "endDate", width: 20 },
      { header: "Transaction ID", key: "transactionId", width: 25 },
    ];

    purchases.forEach((sub) => {
      // Only include if userId is a valid MainVendor
      if (sub.userId) {
        let matchesSearch = true;
        if (search) {
          const s = search.toLowerCase();
          matchesSearch =
            sub.userId.name?.toLowerCase().includes(s) ||
            sub.subscriptionId?.name?.toLowerCase().includes(s) ||
            sub.userId.email?.toLowerCase().includes(s);
        }

        if (matchesSearch) {
          worksheet.addRow({
            vendorName: sub.userId.name || "N/A",
            email: sub.userId.email || "N/A",
            phone: sub.userId.phone || "N/A",
            plan: sub.subscriptionId?.name || "N/A",
            price: sub.priceAtPurchase || 0,
            branchCount: sub.branchCount || 0,
            status: new Date(sub.endDate) < new Date() ? "Expired" : "Active",
            startDate: sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "N/A",
            endDate: sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "N/A",
            transactionId: `TXN_${sub._id.toString().slice(-6).toUpperCase()}`,
          });
        }
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=purchase_history.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Purchase history export error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// --- AUTH METHODS ---

// ─── MAIN VENDOR EMAIL OTP LOGIN ───────────────────────────────────────────

// 1. Send OTP for Main Vendor Login
exports.sendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    const mainVendor = await MainVendor.findOne({ email: email.trim().toLowerCase() }).populate("plan");
    if (!mainVendor) {
      return res.status(404).json({
        status: false,
        message: "Account not found. Please contact admin.",
      });
    }

    if (mainVendor.status !== "Active") {
      return res.status(403).json({
        status: false,
        message: "Your account is not active. Please contact support.",
      });
    }

    // Generate 6-digit OTP valid for 5 minutes
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    mainVendor.otp = otp;
    mainVendor.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await mainVendor.save();

    const emailSubject = await getTemplateSubject(
      "main_vendor_login_otp",
      "Your Login Verification Code"
    );

    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Login Verification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <tr>
                <td align="center" style="background:#F39C12; padding:25px; color:#ffffff;">
                  <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                  <p style="margin:5px 0 0; font-size:14px;">Main Vendor Portal Login</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px; color:#333333;">
                  <h2 style="margin-top:0; color:#1e293b;">Hello ${mainVendor.name},</h2>
                  <p>Your one-time login verification code (OTP) is:</p>
                  <div style="text-align:center; margin:30px 0;">
                    <span style="font-size:34px; font-weight:bold; letter-spacing:8px; color:#F39C12; padding:14px 28px; background:#fffaf0; border-radius:8px; border:2px dashed #F39C12; display:inline-block;">
                      ${otp}
                    </span>
                  </div>
                  <p style="color:#64748b; font-size:14px;">This code is valid for <strong>5 minutes</strong>. Do not share this OTP with anyone for security purposes.</p>
                  <p style="color:#64748b; font-size:14px;">If you did not request this OTP, please contact support immediately.</p>
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

    await sendEmail(mainVendor.email, emailSubject, emailContent);

    // Masked email for display
    const maskedEmail = mainVendor.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c);

    res.status(200).json({
      status: true,
      message: `OTP sent to ${maskedEmail}`,
      email: mainVendor.email,
    });
  } catch (error) {
    console.error("Main Vendor sendLoginOtp error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// 2. Verify OTP for Main Vendor Login
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: false, message: "Email and OTP are required" });
    }

    const mainVendor = await MainVendor.findOne({ email: email.trim().toLowerCase() }).populate("plan");
    if (!mainVendor) {
      return res.status(404).json({
        status: false,
        message: "Account not found",
      });
    }

    if (mainVendor.status !== "Active") {
      return res.status(403).json({
        status: false,
        message: "Your account is not active. Please contact support.",
      });
    }

    if (!mainVendor.otp || mainVendor.otp !== otp.trim()) {
      return res.status(400).json({ status: false, message: "Invalid OTP code" });
    }

    if (!mainVendor.otpExpires || new Date() > new Date(mainVendor.otpExpires)) {
      return res.status(400).json({ status: false, message: "OTP has expired. Please request a new one." });
    }

    // Clear OTP
    mainVendor.otp = null;
    mainVendor.otpExpires = null;
    await mainVendor.save();

    await cleanupExpiredSessions("MainVendor");

    // ─── Check for existing active session ───────────────────────────────────
    const existingSession = await Session.findOne({
      userId:   mainVendor._id,
      userType: 'MainVendor',
      isActive: true
    });

    if (existingSession) {
      return res.status(409).json({
        status:        false,
        alreadyLogged: true,
        message:       "This account is already logged in on another device.",
        loggedInSince: existingSession.createdAt,
        lastActivity:  existingSession.lastActivity
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const sessionId = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(
      { id: mainVendor._id, role: "main-vendor", sessionId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Create new session
    await Session.create({
      sessionId,
      userId: mainVendor._id,
      userType: 'MainVendor',
      token,
      lastActivity: new Date(),
      isActive: true
    });

    const vendorData = mainVendor.toObject();
    delete vendorData.password;
    delete vendorData.otp;
    delete vendorData.otpExpires;

    const activeSubscription = await UserSubscription.findOne({
      userId: mainVendor._id,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ startDate: -1 });

    res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      sessionId, // Returning sessionId to frontend for tracking
      user: {
        ...vendorData,
        role: "main-vendor",
        activeSubscription,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.login = exports.verifyLoginOtp;

exports.forceLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const mainVendor = await MainVendor.findOne({ email }).populate("plan");
    if (!mainVendor) {
      return res.status(404).json({
        status: false,
        message: "Account not found.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, mainVendor.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: false, message: "Invalid email or password" });
    }

    // Invalidate existing sessions
    await Session.updateMany(
      { userId: mainVendor._id, userType: 'MainVendor', isActive: true },
      { isActive: false }
    );

    const sessionId = crypto.randomBytes(16).toString("hex");
    const token = jwt.sign(
      { id: mainVendor._id, role: "main-vendor", sessionId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Create new session
    await Session.create({
      sessionId,
      userId: mainVendor._id,
      userType: 'MainVendor',
      token,
      lastActivity: new Date(),
      isActive: true
    });

    const vendorData = mainVendor.toObject();
    delete vendorData.password;
    delete vendorData.otp;
    delete vendorData.otpExpires;

    const activeSubscription = await UserSubscription.findOne({
      userId: mainVendor._id,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ startDate: -1 });

    res.status(200).json({
      status: true,
      message: "Force login successful",
      token,
      sessionId,
      user: {
        ...vendorData,
        role: "main-vendor",
        activeSubscription,
      },
    });
  } catch (error) {
    console.error("Main Vendor force login error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, address, city, state, plan } =
      req.body;

    if (!plan) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid subscription plan." });
    }

    const planExists = await Plan.findById(plan);
    if (!planExists) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid subscription plan." });
    }

    const emailExists = await MainVendor.findOne({ email });
    if (emailExists) {
      return res
        .status(400)
        .json({ status: false, message: "Email is already in use" });
    }

    const rawPassword = password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newMainVendor = new MainVendor({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      city,
      state,
      plan,
      status: "Pending",
    });

    await newMainVendor.save();

    // Notify Admin
    try {
      await Notification.create({
        userId: newMainVendor._id,
        userModel: "MainVendor",
        senderName: name,
        title: "New Main Vendor Signup Request",
        message: `New Main Vendor ${name} (${email}) has requested access.`,
        type: "new_registration",
        recipient: "admin",
      });
    } catch (e) {
      console.error("Notification error:", e);
    }

    // send acknowledgement email to user using vendor-style template
    try {
      const emailContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Subscription Request Received</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" 
                 style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
            <tr>
              <td align="center" style="background:#f39c12; padding:25px; color:#ffffff;">
                <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                <p style="margin:5px 0 0; font-size:14px;">Subscription Request</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px; color:#333333;">
                <h2 style="margin-top:0;">Hello ${name},</h2>
                <p>Thank you for choosing ${process.env.COMPANY_NAME || "AuctionBilling"}! Your subscription request has been received and is currently being processed.</p>
                <p>Our administrator will review your application and activate your account soon.</p>
                
                <h3 style="margin-top:20px; margin-bottom:10px;">Request Details:</h3>
                <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:20px;">
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>${email}</td>
                  </tr>
                  <tr>
                    <td><strong>Assigned Plan:</strong></td>
                    <td>${planExists.name || "Default Plan"}</td>
                  </tr>
                  <tr>
                    <td><strong>Location:</strong></td>
                    <td>${city}, ${state}</td>
                  </tr>
                </table>
                
                <p>We'll notify you once your account is active.</p>
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
      const ackSubject = await getTemplateSubject(
        "main_vendor_signup_received",
        "Your Subscription Request Has Been Received"
      );
      await sendEmail(
        email,
        ackSubject,
        emailContent,
      );
    } catch (emailErr) {
      console.error("Signup acknowledgement email error:", emailErr);
    }

    res.status(201).json({
      status: true,
      message: "Registration request submitted. Please wait for admin review.",
    });
  } catch (error) {
    console.error("Main Vendor signup error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Step 1: Create Cashfree payment order for selected plan
 */
exports.createPaymentOrder = async (req, res) => {
  try {
    const { name, email, phone, planId } = req.body;

    if (!email || !planId) {
      return res.status(400).json({
        status: false,
        message: "Email and Plan are required",
      });
    }

    const emailExists = await MainVendor.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        status: false,
        message: "Email is already registered",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: "Subscription plan not found",
      });
    }

    // Cashfree order amount must be at least 1 INR
    const orderAmount = Number(plan.price) || 0;
    if (orderAmount <= 0) {
      return res.status(400).json({
        status: false,
        message: "This plan cannot be purchased online (free/zero amount).",
      });
    }

    // Unique order ID (max 45 chars alphanumeric/underscore)
    const orderId = `VEND_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const orderData = await createCashfreeOrder({
      orderId,
      orderAmount,
      customerPhone: phone || "9999999999",
      customerEmail: email,
      customerName: name || "Vendor",
      customerNote: `Subscription: ${plan.name}`,
    });

    res.status(200).json({
      status: true,
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id,
      orderAmount,
      planName: plan.name,
      environment: (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase(),
    });
  } catch (error) {
    console.error("Create Cashfree payment order error:", error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate payment. Please verify Cashfree configuration.",
    });
  }
};

/**
 * Step 2: Verify Cashfree payment, then register vendor with status Pending
 */
exports.verifyAndSignup = async (req, res) => {
  try {
    const { orderId, name, email, password, phone, address, city, state, plan } =
      req.body;

    if (!orderId) {
      return res.status(400).json({
        status: false,
        message: "Cashfree Order ID is required for verification.",
      });
    }

    const existingVendor = await MainVendor.findOne({ email });
    if (existingVendor) {
      // If this vendor was already saved for this specific Cashfree order, return success
      if (existingVendor.cashfreeOrderId === orderId) {
        return res.status(200).json({
          status: true,
          message: "Payment verified and registration submitted successfully! Your account is pending admin approval.",
          vendor: {
            id: existingVendor._id,
            name: existingVendor.name,
            email: existingVendor.email,
            status: existingVendor.status,
            paymentStatus: existingVendor.paymentStatus,
          },
        });
      }
      return res.status(400).json({
        status: false,
        message: "Email is already registered.",
      });
    }

    const planExists = await Plan.findById(plan);
    if (!planExists) {
      return res.status(400).json({
        status: false,
        message: "Selected plan does not exist.",
      });
    }

    // Verify order with Cashfree API
    let cfOrder;
    try {
      cfOrder = await getCashfreeOrder(orderId);
    } catch (cfErr) {
      console.error("Cashfree order fetch error:", cfErr.response?.data || cfErr.message);
      return res.status(400).json({
        status: false,
        message: "Unable to verify payment with Cashfree. Please contact support.",
      });
    }

    if (cfOrder.order_status !== "PAID") {
      return res.status(400).json({
        status: false,
        message: `Payment is not completed. Current status: ${cfOrder.order_status}`,
      });
    }

    // Get payment ID if available
    let paymentId = "";
    try {
      const payments = await getCashfreeOrderPayments(orderId);
      if (Array.isArray(payments) && payments.length > 0) {
        const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS") || payments[0];
        paymentId = successfulPayment.cf_payment_id ? String(successfulPayment.cf_payment_id) : "";
      }
    } catch (payErr) {
      console.warn("Could not fetch detailed payment list:", payErr.message);
    }

    const rawPassword = password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newMainVendor = new MainVendor({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      city,
      state,
      plan,
      status: "Pending",
      paymentStatus: "Paid",
      cashfreeOrderId: orderId,
      cashfreePaymentId: paymentId,
      paidAmount: Number(cfOrder.order_amount) || planExists.price,
      paidAt: new Date(),
    });

    await newMainVendor.save();

    // Admin Notification
    try {
      await Notification.create({
        userId: newMainVendor._id,
        userModel: "MainVendor",
        senderName: name,
        title: "New Paid Vendor Registration (Pending Approval)",
        message: `Vendor ${name} (${email}) completed payment ₹${cfOrder.order_amount} for plan ${planExists.name}. Waiting for approval.`,
        type: "new_registration",
        recipient: "admin",
      });
    } catch (e) {
      console.error("Admin notification error:", e);
    }

    // Send acknowledgement email to Vendor
    try {
      const emailContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Payment Successful - Subscription Request Received</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" 
                 style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
            <tr>
              <td align="center" style="background:#27ae60; padding:25px; color:#ffffff;">
                <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                <p style="margin:5px 0 0; font-size:14px;">Payment Received • Pending Admin Approval</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px; color:#333333;">
                <h2 style="margin-top:0;">Hello ${name},</h2>
                <p>We have successfully received your payment of <strong>₹${cfOrder.order_amount}</strong> for the <strong>${planExists.name}</strong> plan.</p>
                <p>Your application is currently under admin review. Once approved, your account will be activated and you will receive a login notification email.</p>
                
                <h3 style="margin-top:20px; margin-bottom:10px;">Payment Summary:</h3>
                <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:20px;">
                  <tr>
                    <td><strong>Order ID:</strong></td>
                    <td>${orderId}</td>
                  </tr>
                  <tr>
                    <td><strong>Transaction / Payment ID:</strong></td>
                    <td>${paymentId || "N/A"}</td>
                  </tr>
                  <tr>
                    <td><strong>Plan Name:</strong></td>
                    <td>${planExists.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount Paid:</strong></td>
                    <td>₹${cfOrder.order_amount}</td>
                  </tr>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td style="color:#e67e22; font-weight:bold;">Pending Admin Approval</td>
                  </tr>
                </table>
                
                <p>Thank you for choosing ${process.env.COMPANY_NAME || "AuctionBilling"}!</p>
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

      const ackSubject = await getTemplateSubject(
        "main_vendor_signup_received",
        "Payment Successful - Account Pending Admin Approval"
      );
      await sendEmail(email, ackSubject, emailContent);
    } catch (emailErr) {
      console.error("Signup email error:", emailErr);
    }

    res.status(201).json({
      status: true,
      message:
        "Payment verified and registration submitted successfully! Your account is pending admin approval.",
      vendor: {
        id: newMainVendor._id,
        name: newMainVendor.name,
        email: newMainVendor.email,
        status: newMainVendor.status,
        paymentStatus: newMainVendor.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Verify and signup error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Public: Get vendor details & plan info for email pay-now link
 */
exports.getVendorPaymentDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await MainVendor.findById(vendorId).populate("plan");

    if (!vendor) {
      return res.status(404).json({ status: false, message: "Vendor account not found." });
    }

    if (vendor.paymentStatus === "Paid" && vendor.status === "Active") {
      return res.status(200).json({
        status: true,
        alreadyPaid: true,
        message: "Your subscription is already paid and active. You can log in directly.",
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          planName: vendor.plan?.name || "Active Plan",
          planPrice: vendor.plan?.price || vendor.paidAmount || 0,
          paidAmount: vendor.paidAmount || vendor.plan?.price || 0,
          planEndDate: vendor.planEndDate,
          durationType: vendor.plan?.durationType || "month",
          durationValue: vendor.plan?.durationValue || 1,
        },
      });
    }

    if (!vendor.plan) {
      return res.status(400).json({ status: false, message: "No subscription plan assigned to this account." });
    }

    res.status(200).json({
      status: true,
      alreadyPaid: false,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        planId: vendor.plan._id,
        planName: vendor.plan.name,
        planPrice: vendor.plan.price,
        durationType: vendor.plan.durationType,
        durationValue: vendor.plan.durationValue,
      },
    });
  } catch (error) {
    console.error("getVendorPaymentDetails error:", error);
    res.status(500).json({ status: false, message: "Error fetching payment details." });
  }
};

/**
 * Public: Create Cashfree order for direct vendor checkout from email pay button
 */
exports.createVendorCheckoutOrder = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const vendor = await MainVendor.findById(vendorId).populate("plan");

    if (!vendor || !vendor.plan) {
      return res.status(404).json({ status: false, message: "Vendor or plan not found." });
    }

    const orderAmount = Number(vendor.plan.price) || 0;
    if (orderAmount <= 0) {
      return res.status(400).json({ status: false, message: "Plan price must be greater than zero." });
    }

    const orderId = `PAY_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const clientBaseUrl = (
      process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system"
    ).replace(/\/$/, "");

    const returnUrl = `${clientBaseUrl}/pay-subscription?vendorId=${vendor._id}&order_id={order_id}`;

    const orderData = await createCashfreeOrder({
      orderId,
      orderAmount,
      customerPhone: vendor.phone || "9999999999",
      customerEmail: vendor.email,
      customerName: vendor.name || "Vendor",
      customerNote: `Subscription Payment: ${vendor.plan.name}`,
      returnUrl,
    });

    res.status(200).json({
      status: true,
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id,
      orderAmount,
      planName: vendor.plan.name,
      environment: (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase(),
    });
  } catch (error) {
    console.error("createVendorCheckoutOrder error:", error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message: error.response?.data?.message || error.message || "Failed to initiate payment.",
    });
  }
};

/**
 * Public: Verify Cashfree payment, activate vendor, set plan end date, send confirmation email
 */
exports.verifyVendorCheckoutPayment = async (req, res) => {
  try {
    const { vendorId, orderId } = req.body;

    if (!vendorId || !orderId) {
      return res.status(400).json({ status: false, message: "Vendor ID and Order ID are required." });
    }

    const vendor = await MainVendor.findById(vendorId).populate("plan");
    if (!vendor) {
      return res.status(404).json({ status: false, message: "Vendor account not found." });
    }

    // Check if already processed
    if (vendor.paymentStatus === "Paid" && vendor.status === "Active" && vendor.cashfreeOrderId === orderId) {
      return res.status(200).json({
        status: true,
        message: "Payment already verified and account active!",
        vendor: { id: vendor._id, name: vendor.name, email: vendor.email },
      });
    }

    // Verify order with Cashfree
    const cfOrder = await getCashfreeOrder(orderId);
    if (cfOrder.order_status !== "PAID") {
      return res.status(400).json({
        status: false,
        message: `Payment not completed. Current status: ${cfOrder.order_status}`,
      });
    }

    // Get payment ID
    let paymentId = "";
    try {
      const payments = await getCashfreeOrderPayments(orderId);
      if (Array.isArray(payments) && payments.length > 0) {
        const successful = payments.find((p) => p.payment_status === "SUCCESS") || payments[0];
        paymentId = successful.cf_payment_id ? String(successful.cf_payment_id) : "";
      }
    } catch (payErr) {
      console.warn("Could not fetch detailed payment list:", payErr.message);
    }

    // Calculate plan end date
    const plan = vendor.plan;
    let planEndDate = new Date();
    if (plan.durationType === "year") {
      planEndDate.setFullYear(planEndDate.getFullYear() + (plan.durationValue || 1));
    } else {
      planEndDate = addDays(planEndDate, 30 * (plan.durationValue || 1));
    }

    // Activate vendor
    vendor.status = "Active";
    vendor.paymentStatus = "Paid";
    vendor.planEndDate = planEndDate;
    vendor.cashfreeOrderId = orderId;
    vendor.cashfreePaymentId = paymentId;
    vendor.paidAmount = Number(cfOrder.order_amount) || plan.price;
    vendor.paidAt = new Date();
    await vendor.save();

    // Create UserSubscription entry
    await UserSubscription.create({
      userId: vendor._id,
      subscriptionId: plan._id,
      priceAtPurchase: plan.price,
      branchCount: plan.branchCount || 0,
      featuresAtPurchase: plan.features || {},
      startDate: new Date(),
      endDate: planEndDate,
    });

    const clientBaseUrl = (
      process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system"
    ).replace(/\/$/, "");
    const loginUrl = `${clientBaseUrl}/`;

    // Send Confirmation Email with Login Button
    try {
      const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Successful - Account Activated</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:30px 20px; color:#ffffff;">
                    <h1 style="margin:0; font-size:24px; font-weight:700;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                    <p style="margin:6px 0 0; font-size:15px; opacity:0.95;">Payment Confirmed • Account Activated</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 30px; color:#334155;">
                    <h2 style="margin-top:0; color:#0f172a; font-size:20px;">Hello ${vendor.name},</h2>
                    <p style="font-size:15px; line-height:1.6;">
                      Thank you! We have received your payment of <strong>₹${cfOrder.order_amount}</strong> for the <strong>${plan.name}</strong> plan.
                    </p>
                    <p style="font-size:14px; color:#059669; font-weight:600;">
                      Your account is now fully active and ready to use!
                    </p>
                    
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:18px 20px; margin:24px 0;">
                      <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">
                        <tr>
                          <td width="35%" style="color:#166534;"><strong>Plan Name:</strong></td>
                          <td style="color:#0f172a; font-weight:700;">${plan.name}</td>
                        </tr>
                        <tr>
                          <td style="color:#166534;"><strong>Amount Paid:</strong></td>
                          <td style="color:#059669; font-weight:700;">₹${cfOrder.order_amount}</td>
                        </tr>
                        <tr>
                          <td style="color:#166534;"><strong>Plan Valid Till:</strong></td>
                          <td style="color:#0f172a; font-weight:600;">${planEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                        </tr>
                        <tr>
                          <td style="color:#166534;"><strong>Transaction ID:</strong></td>
                          <td style="color:#0f172a;">${paymentId || orderId}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align:center; margin:30px 0;">
                      <a href="${loginUrl}" 
                         style="background:#10b981; color:#ffffff; padding:14px 34px; text-decoration:none; border-radius:8px; font-size:16px; font-weight:700; display:inline-block; box-shadow:0 4px 10px rgba(16,185,129,0.35);">
                        Login to Your Account
                      </a>
                    </div>

                    <hr style="border:none; border-top:1px solid #e2e8f0; margin:28px 0 20px;" />
                    <p style="margin:0; font-size:14px; color:#475569;">Regards,<br/><strong>${process.env.COMPANY_NAME || "AuctionBilling"} Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background:#f8fafc; padding:18px; font-size:12px; color:#94a3b8; border-top:1px solid #f1f5f9;">
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

      await sendEmail(
        vendor.email,
        `Payment Received - Account Activated (${plan.name})`,
        emailContent
      );
    } catch (emailErr) {
      console.error("Activation email error:", emailErr);
    }

    res.status(200).json({
      status: true,
      message: "Payment verified successfully and account activated!",
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        planName: plan.name,
        planPrice: plan.price,
        paidAmount: vendor.paidAmount || Number(cfOrder.order_amount) || plan.price,
        cashfreeOrderId: orderId,
        cashfreePaymentId: paymentId,
        planEndDate,
      },
    });
  } catch (error) {
    console.error("verifyVendorCheckoutPayment error:", error);
    res.status(500).json({ status: false, message: error.message || "Payment verification error." });
  }
};

/**
 * Step 1: Create Cashfree payment order for Plan Upgrade/Renewal
 */
exports.createUpgradePaymentOrder = async (req, res) => {
  try {
    const mainVendorId = req.user?.id;
    const { planId, upgradeType } = req.body;

    if (!planId) {
      return res.status(400).json({
        status: false,
        message: "Plan ID is required.",
      });
    }

    const vendor = await MainVendor.findById(mainVendorId);
    if (!vendor) {
      return res.status(404).json({
        status: false,
        message: "Vendor account not found.",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: "Selected subscription plan not found.",
      });
    }

    const orderAmount = Number(plan.price) || 0;
    if (orderAmount <= 0) {
      return res.status(400).json({
        status: false,
        message: "This plan amount is invalid for online payment.",
      });
    }

    const orderId = `UPG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const returnUrl = `${(process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system").replace(/\/$/, "")}/mainvendor/subscription?order_id={order_id}`;

    const orderData = await createCashfreeOrder({
      orderId,
      orderAmount,
      customerPhone: vendor.phone || "9999999999",
      customerEmail: vendor.email,
      customerName: vendor.name,
      customerNote: `Upgrade: ${plan.name} (${upgradeType === "from_today" ? "Start Today" : "After Current"})`,
      returnUrl,
    });

    res.status(200).json({
      status: true,
      orderId: orderData.order_id,
      paymentSessionId: orderData.payment_session_id,
      orderAmount,
      planName: plan.name,
      environment: (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase(),
    });
  } catch (error) {
    console.error("Create upgrade payment order error:", error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate upgrade payment.",
    });
  }
};

/**
 * Step 2: Verify Cashfree payment, immediately activate upgraded/renewed plan, and send email
 */
exports.verifyAndUpgradePlan = async (req, res) => {
  try {
    const mainVendorId = req.user?.id;
    const { orderId, planId, upgradeType } = req.body;

    if (!orderId || !planId) {
      return res.status(400).json({
        status: false,
        message: "Order ID and Plan ID are required.",
      });
    }

    const vendor = await MainVendor.findById(mainVendorId);
    if (!vendor) {
      return res.status(404).json({
        status: false,
        message: "Vendor account not found.",
      });
    }

    const newPlan = await Plan.findById(planId);
    if (!newPlan) {
      return res.status(404).json({
        status: false,
        message: "Selected plan does not exist.",
      });
    }

    // Idempotent: If already processed this upgrade order, return success
    if (vendor.cashfreeOrderId === orderId && vendor.paymentStatus === "Paid") {
      return res.status(200).json({
        status: true,
        message: `Plan upgraded to ${newPlan.name} successfully! Valid till ${new Date(vendor.planEndDate).toLocaleDateString()}.`,
        plan: newPlan,
        planEndDate: vendor.planEndDate,
      });
    }

    // Verify order with Cashfree
    let cfOrder;
    try {
      cfOrder = await getCashfreeOrder(orderId);
    } catch (cfErr) {
      console.error("Cashfree order verification error:", cfErr.response?.data || cfErr.message);
      return res.status(400).json({
        status: false,
        message: "Unable to verify payment with Cashfree. Please contact support.",
      });
    }

    if (cfOrder.order_status !== "PAID") {
      return res.status(400).json({
        status: false,
        message: `Payment not completed. Current status: ${cfOrder.order_status}`,
      });
    }

    // Fetch payment ID if available
    let paymentId = "";
    try {
      const payments = await getCashfreeOrderPayments(orderId);
      if (Array.isArray(payments) && payments.length > 0) {
        const successfulPayment =
          payments.find((p) => p.payment_status === "SUCCESS") || payments[0];
        paymentId = successfulPayment.cf_payment_id
          ? String(successfulPayment.cf_payment_id)
          : "";
      }
    } catch (payErr) {
      console.warn("Could not fetch detailed payment list:", payErr.message);
    }

    // Calculate new planEndDate based on user's choice: "from_today" vs "after_current"
    const now = new Date();
    const hasActiveUnexpiredPlan = vendor.planEndDate && new Date(vendor.planEndDate) > now;
    let newPlanStartDate = now;
    let newPlanEndDate = new Date();

    if (upgradeType === "after_current" && hasActiveUnexpiredPlan) {
      newPlanStartDate = new Date(vendor.planEndDate);
      newPlanEndDate = new Date(vendor.planEndDate);
    }

    if (newPlan.durationType === "year") {
      newPlanEndDate.setFullYear(
        newPlanEndDate.getFullYear() + (newPlan.durationValue || 1)
      );
    } else {
      newPlanEndDate.setDate(
        newPlanEndDate.getDate() + 30 * (newPlan.durationValue || 1)
      );
    }

    // If user chose "after_current" and still has active plan:
    // Keep current plan active, and queue the new plan to automatically take effect when current plan ends!
    if (upgradeType === "after_current" && hasActiveUnexpiredPlan) {
      vendor.queuedPlan = newPlan._id;
      vendor.queuedPlanStartDate = newPlanStartDate;
      vendor.queuedPlanEndDate = newPlanEndDate;
      vendor.requestedPlan = null;
      vendor.upgradeType = "after_current";
    } else {
      // Immediate upgrade ("from_today" or current plan already expired)
      vendor.plan = newPlan._id;
      vendor.planEndDate = newPlanEndDate;
      vendor.queuedPlan = null;
      vendor.queuedPlanStartDate = null;
      vendor.queuedPlanEndDate = null;
      vendor.requestedPlan = null;
      vendor.upgradeType = null;
    }

    vendor.status = "Active";
    vendor.paymentStatus = "Paid";
    vendor.cashfreeOrderId = orderId;
    vendor.cashfreePaymentId = paymentId;
    vendor.paidAmount = Number(cfOrder.order_amount) || newPlan.price;
    vendor.paidAt = new Date();

    await vendor.save();

    // Create UserSubscription entry for invoice and purchase history
    let userSub;
    try {
      userSub = await UserSubscription.create({
        userId: vendor._id,
        subscriptionId: newPlan._id,
        priceAtPurchase: newPlan.price,
        branchCount: newPlan.branchCount || 0,
        featuresAtPurchase: newPlan.features || {},
        startDate:
          upgradeType === "after_current" &&
          vendor.planEndDate &&
          new Date(vendor.planEndDate) > now
            ? new Date(vendor.planEndDate)
            : now,
        endDate: newPlanEndDate,
        paymentStatus: "Paid",
        orderId,
        paymentId,
      });
    } catch (subErr) {
      console.error("Error creating UserSubscription record:", subErr);
    }

    // Admin Notification
    try {
      await Notification.create({
        userId: vendor._id,
        userModel: "MainVendor",
        senderName: vendor.name,
        title: "Plan Upgraded Successfully",
        message: `Vendor ${vendor.name} has upgraded to ${newPlan.name} (₹${cfOrder.order_amount}). Plan active till ${newPlanEndDate.toLocaleDateString()}.`,
        type: "plan_upgrade",
        recipient: "admin",
      });
    } catch (e) {
      console.error("Notification error:", e);
    }

    // Send Upgrade Success Email to Vendor
    try {
      const emailContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Plan Upgraded Successfully</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" 
                 style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
            <tr>
              <td align="center" style="background:#27ae60; padding:25px; color:#ffffff;">
                <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                <p style="margin:5px 0 0; font-size:14px;">Plan Upgrade Successful</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px; color:#333333;">
                <h2 style="margin-top:0;">Hello ${vendor.name},</h2>
                <p>Your subscription plan has been successfully upgraded to <strong>${newPlan.name}</strong>!</p>
                <p>Your new plan is now active with all upgraded features and limits.</p>
                
                <h3 style="margin-top:20px; margin-bottom:10px;">Upgrade Details:</h3>
                <table width="100%" cellpadding="8" cellspacing="0" style="background:#f8f9fa; border-radius:6px; margin-bottom:20px;">
                  <tr>
                    <td><strong>Upgraded Plan:</strong></td>
                    <td>${newPlan.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Amount Paid:</strong></td>
                    <td>₹${cfOrder.order_amount}</td>
                  </tr>
                  <tr>
                    <td><strong>Order ID:</strong></td>
                    <td>${orderId}</td>
                  </tr>
                  <tr>
                    <td><strong>Timing Choice:</strong></td>
                    <td>${upgradeType === "from_today" ? "Started from Today" : "Continues After Previous Expiry"}</td>
                  </tr>
                  <tr>
                    <td><strong>Valid Till:</strong></td>
                    <td><strong>${newPlanEndDate.toLocaleDateString()}</strong></td>
                  </tr>
                </table>
                
                <div style="text-align:center; margin:30px 0;">
                  <a href="${(process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system").replace(/\/$/, "")}/mainvendor" 
                     style="background:#F39C12; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">
                    Go to Your Dashboard
                  </a>
                </div>
                
                <p>Thank you for continuing with ${process.env.COMPANY_NAME || "AuctionBilling"}!</p>
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

      const emailSubject = await getTemplateSubject(
        "main_vendor_plan_updated",
        `Plan Upgraded: ${newPlan.name} is now active!`
      );
      await sendEmail(vendor.email, emailSubject, emailContent);
    } catch (emailErr) {
      console.error("Upgrade confirmation email error:", emailErr);
    }

    res.status(200).json({
      status: true,
      message: `Plan upgraded to ${newPlan.name} successfully! Valid till ${newPlanEndDate.toLocaleDateString()}.`,
      plan: newPlan,
      planEndDate: newPlanEndDate,
    });
  } catch (error) {
    console.error("Verify and upgrade error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const vendor = await MainVendor.findOne({ email });

    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Main vendor not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    vendor.otp = otp;
    vendor.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await vendor.save();

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Password Reset OTP</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td align="center" style="background:#F39C12; padding:25px; color:#ffffff;">
                    <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                    <p style="margin:5px 0 0; font-size:14px;">Password Reset Request</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px; color:#333333;">
                    <h2 style="margin-top:0;">Hello,</h2>
                    <p>We received a request to reset your password. Use the OTP code below to proceed:</p>
                    
                    <div style="text-align:center; margin:30px 0;">
                      <span style="background:#f8f9fa; border:2px dashed #F39C12; color:#F39C12; padding:15px 30px; font-size:28px; font-weight:bold; letter-spacing:5px; border-radius:5px;">${otp}</span>
                    </div>

                    <p style="color:#777; font-size:14px;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
                    <br/>
                    <p>Regards,<br/>${process.env.COMPANY_NAME || "AuctionBilling"} Team</p>
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

    const otpSubject = await getTemplateSubject(
      "main_vendor_reset_otp",
      "Password Reset OTP"
    );
    await sendEmail(email, otpSubject, emailContent);

    res.status(200).json({ status: true, message: "OTP sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const vendor = await MainVendor.findOne({
      email,
      otp,
      otpExpires: { $gt: Date.now() },
    });

    if (!vendor) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or expired OTP" });
    }

    vendor.password = await bcrypt.hash(newPassword, 10);
    vendor.otp = undefined;
    vendor.otpExpires = undefined;
    await vendor.save();

    res
      .status(200)
      .json({ status: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getMainVendorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await MainVendor.findById(id).populate("plan").lean();
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Main vendor not found" });
    }

    // Find their latest subscription record (active or expired)
    const latestSub = await UserSubscription.findOne({
      userId: vendor._id,
    }).sort({ endDate: -1, createdAt: -1 });

    // If main vendor has planEndDate, respect that as the source of truth for expiry
    if (vendor.planEndDate) {
      if (latestSub) {
        latestSub.endDate = vendor.planEndDate;
      }
    }
    
    vendor.activeSubscription = latestSub;

    delete vendor.password;

    res.status(200).json({ status: true, vendor });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const vendor = await MainVendor.findById(req.user.id);
    if (!vendor) {
      return res
        .status(404)
        .json({ status: false, message: "Main vendor not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, vendor.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ status: false, message: "Incorrect current password" });
    }

    vendor.password = await bcrypt.hash(newPassword, 10);
    await vendor.save();

    res
      .status(200)
      .json({ status: true, message: "Password changed successful" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getSellers = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const { branchId } = req.query;

    let vendorQuery = { mainVendorId };
    if (branchId && branchId !== "all") {
      vendorQuery._id = branchId;
    }

    const branches = await Vendor.find(vendorQuery).select("_id name");
    const branchIds = branches.map((b) => b._id);

    const sellers = await Seller.find({ vendorId: { $in: branchIds } })
      .populate("vendorId", "name")
      .sort({ createdAt: -1 });

    const formattedSellers = sellers.map((s) => ({
      id: s._id,
      name: s.name,
      email: s.email,
      phone: s.contact,
      branch: s.vendorId?.name || "N/A",
      branchId: s.vendorId?._id,
      city: s.city,
      state: s.state,
      address: s.address,
      status: s.status,
    }));

    res.status(200).json({ status: true, sellers: formattedSellers });
  } catch (error) {
    console.error("Get sellers error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const branches = await Vendor.find({ mainVendorId }).sort({ name: 1 });
    res.status(200).json({ status: true, vendors: branches });
  } catch (error) {
    console.error("Get main vendor branches error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getBuyers = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const { branchId } = req.query;

    let vendorQuery = { mainVendorId };
    if (branchId && branchId !== "all") {
      vendorQuery._id = branchId;
    }

    const branches = await Vendor.find(vendorQuery).select("_id name");
    const branchIds = branches.map((b) => b._id);

    const buyers = await Buyer.find({ vendorId: { $in: branchIds } })
      .populate("vendorId", "name")
      .sort({ createdAt: -1 });

    const formattedBuyers = buyers.map((b) => ({
      id: b._id,
      name: b.name,
      email: b.email,
      phone: b.contact,
      branch: b.vendorId?.name || "N/A",
      branchId: b.vendorId?._id,
      city: b.city,
      state: b.state,
      address: b.address,
      status: b.status,
    }));

    res.status(200).json({ status: true, buyers: formattedBuyers });
  } catch (error) {
    console.error("Get buyers error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const { branchId, startDate, endDate } = req.query;

    let vendorQuery = { mainVendorId };
    if (branchId && branchId !== "all") {
      vendorQuery._id = branchId;
    }

    const branches = await Vendor.find(vendorQuery).select("_id name");
    const branchIds = branches.map((b) => b._id);

    let transactionQuery = { vendorId: { $in: branchIds } };
    
    // Add date filtering if provided
    if (startDate && endDate) {
      transactionQuery.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (startDate) {
      transactionQuery.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0))
      };
    } else if (endDate) {
      transactionQuery.createdAt = {
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Transaction.find(transactionQuery)
      .populate("vendorId", "name")
      .populate("sellerId", "name")
      .populate("buyerId", "name")
      .populate("productId", "name")
      .sort({ createdAt: -1 });

    const formattedTransactions = transactions.map((t) => {
      let unit = "qty";
      if (t.productId && t.productId.variants && t.variantId) {
        const variant = t.productId.variants.find(v => v._id && v._id.toString() === t.variantId.toString());
        if (variant && variant.unit) {
          unit = variant.unit;
        }
      }

      return {
        id: t._id,
        date: t.date,
        branch: t.vendorId?.name || "N/A",
        branchId: t.vendorId?._id,
        sellerName: t.sellerId?.name || "N/A",
        buyerName: t.buyerId?.name || t.buyerName || "N/A",
        productName: t.productId?.name || "N/A",
        quantity: t.quantity,
        unit: unit,
        rate: t.rate,
        totalAmount: t.finalAmount,
        commissionAmount: t.commissionAmount,
        netAmount: t.netAmount,
      };
    });

    res.status(200).json({ status: true, transactions: formattedTransactions });
  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getCommissionRecords = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const { branchId, startDate, endDate } = req.query;

    let vendorQuery = { mainVendorId };
    if (branchId && branchId !== "all") {
      vendorQuery._id = branchId;
    }

    const branches = await Vendor.find(vendorQuery).select("_id name");
    const branchIds = branches.map((b) => b._id);

    let transactionQuery = { vendorId: { $in: branchIds } };
    
    // Add date filtering if provided
    if (startDate && endDate) {
      transactionQuery.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    } else if (startDate) {
      transactionQuery.createdAt = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0))
      };
    } else if (endDate) {
      transactionQuery.createdAt = {
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Transaction.find(transactionQuery)
      .populate("vendorId", "name")
      .populate("sellerId", "name")
      .populate("productId", "name")
      .sort({ createdAt: -1 });

    let totalCommission = 0;
    const formattedRecords = transactions.map((t) => {
      totalCommission += t.commissionAmount || 0;
      return {
        id: t._id,
        date: t.date,
        branch: t.vendorId?.name || "N/A",
        seller: t.sellerId?.name || "N/A",
        productName: t.productId?.name || "N/A",
        saleAmount: t.finalAmount,
        commissionPercent: t.commissionPercent || 0,
        amount: t.commissionAmount || 0,
      };
    });

    res.status(200).json({ 
      status: true, 
      commissions: formattedRecords,
      totalCommission
    });
  } catch (error) {
    console.error("Get commission records error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const mainVendorId = req.user.id;
    const { branchId, startDate, endDate, date } = req.query;

    let branchIds = [];
    let totalBranches = 0;

    if (branchId === "all") {
      // Find all branches
      const branches = await Vendor.find({ mainVendorId }).select("_id");
      branchIds = branches.map((v) => v._id);
      totalBranches = branchIds.length;
      // Add main vendor ID to the list to include their own data in "All"
      branchIds.push(new mongoose.Types.ObjectId(mainVendorId));
    } else if (branchId === mainVendorId) {
      // "My Details" - only main vendor's own data
      branchIds = [new mongoose.Types.ObjectId(mainVendorId)];
      totalBranches = 0; // Not applicable for single view, or we could keep it as 0
    } else if (branchId) {
      // Specific branch
      branchIds = [new mongoose.Types.ObjectId(branchId)];
      totalBranches = 1;
    } else {
      // Default fallback (e.g. if branchId not provided/all)
      const branches = await Vendor.find({ mainVendorId }).select("_id");
      branchIds = branches.map((v) => v._id);
      totalBranches = branchIds.length;
      branchIds.push(new mongoose.Types.ObjectId(mainVendorId));
    }

    // Build common date filter
    let dateFilter = {};
    if (date) {
      dateFilter = {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
      };
    } else if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      dateFilter = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
      };
    } else if (endDate) {
      dateFilter = {
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const sellerQuery = { vendorId: { $in: branchIds } };
    const buyerQuery = { vendorId: { $in: branchIds } };
    const transactionQuery = { vendorId: { $in: branchIds } };

    if (Object.keys(dateFilter).length > 0) {
      sellerQuery.createdAt = dateFilter;
      buyerQuery.createdAt = dateFilter;
      transactionQuery.createdAt = dateFilter;
    }

    const [totalSellers, totalBuyers, transactions] = await Promise.all([
      Seller.countDocuments(sellerQuery),
      Buyer.countDocuments(buyerQuery),
      Transaction.find(transactionQuery).populate("sellerId buyerId vendorId productId").sort({ createdAt: -1 }),
    ]);

    let totalSales = 0;
    let totalCommission = 0;
    let todayAuctions = 0; // Number of unique transactions for today or selected date
    let totalQty = 0;
    let totalPayIn = 0;
    let totalPayOut = 0;

    const recentTransactions = transactions.slice(0, 5).map(t => {
      let unit = "qty";
      if (t.productId && t.productId.variants && t.variantId) {
        const variant = t.productId.variants.find(v => v._id && v._id.toString() === t.variantId.toString());
        if (variant && variant.unit) {
          unit = variant.unit;
        }
      }
      return {
        _id: t._id,
        date: t.date || t.createdAt,
        productName: t.productId?.name || t.productName || "N/A",
        sellerName: t.sellerId?.name || t.sellerName || "N/A",
        buyerName: t.buyerId?.name || t.buyerName || "N/A",
        branchName: t.vendorId?.name || "N/A",
        quantity: t.quantity,
        unit: unit,
        finalAmount: t.finalAmount,
        commissionAmount: t.commissionAmount
      };
    });

    transactions.forEach(t => {
      totalSales += t.finalAmount || 0;
      totalCommission += t.commissionAmount || 0;
      todayAuctions += 1;
      totalQty += t.quantity || 0;
      // In this system, commission belongs to the vendor. Pay in/out logic:
      // totalPayIn is from buyers (finalAmount)
      totalPayIn += t.finalAmount || 0;
      // totalPayOut is to sellers (netAmount)
      totalPayOut += t.netAmount || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        totalBranches,
        totalSellers,
        totalBuyers,
        totalSales,
        totalCommission,
        todayAuctions,
        totalQty,
        totalPayIn,
        totalPayOut,
        recentTransactions
      }
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    const { sessionId } = req.user;
    if (sessionId) {
      await Session.findOneAndUpdate({ sessionId }, { isActive: false });
    }
    res.status(200).json({ status: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Main Vendor logout error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Admin Manually Extends Plan Expiry Date & Time for a Main Vendor
 */
exports.extendVendorPlan = async (req, res) => {
  try {
    const { vendorId, extendDays, targetDateTime, reason } = req.body;

    if (!vendorId) {
      return res.status(400).json({ status: false, message: "Vendor ID is required." });
    }

    const vendor = await MainVendor.findById(vendorId).populate("plan");
    if (!vendor) {
      return res.status(404).json({ status: false, message: "Vendor not found." });
    }

    const now = new Date();
    let newExpiryDate;

    if (targetDateTime) {
      newExpiryDate = new Date(targetDateTime);
      if (isNaN(newExpiryDate.getTime())) {
        return res.status(400).json({ status: false, message: "Invalid target date/time provided." });
      }
    } else if (extendDays) {
      const daysNum = Number(extendDays);
      if (isNaN(daysNum) || daysNum <= 0) {
        return res.status(400).json({ status: false, message: "Please provide a valid number of days." });
      }

      // Base date: if current planEndDate is in the future, add to it; otherwise add to now
      const baseDate = vendor.planEndDate && new Date(vendor.planEndDate) > now
        ? new Date(vendor.planEndDate)
        : new Date(now);

      baseDate.setDate(baseDate.getDate() + daysNum);
      newExpiryDate = baseDate;
    } else {
      return res.status(400).json({ status: false, message: "Please provide days to extend or a target date/time." });
    }

    // Save extended date to vendor
    vendor.planEndDate = newExpiryDate;
    vendor.status = "Active"; // Ensure active
    vendor.isPlanExtended = true;
    vendor.planExtendedAt = new Date();
    await vendor.save();

    // Update or create the latest UserSubscription record
    const latestSub = await UserSubscription.findOne({ userId: vendor._id }).sort({ endDate: -1, createdAt: -1 });
    if (latestSub) {
      latestSub.endDate = newExpiryDate;
      if (!latestSub.featuresAtPurchase) {
        latestSub.featuresAtPurchase = vendor.plan?.features || { planExtension: true };
      }
      await latestSub.save();
    } else if (vendor.plan) {
      await UserSubscription.create({
        userId: vendor._id,
        subscriptionId: vendor.plan._id,
        priceAtPurchase: vendor.plan.price || 0,
        branchCount: vendor.plan.branchCount || 0,
        featuresAtPurchase: vendor.plan.features || { planExtension: true },
        startDate: now,
        endDate: newExpiryDate,
        paymentStatus: "Paid",
      });
    }

    // Format formatted date & time in Indian 12-hour AM/PM format
    const formattedDateTime = newExpiryDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Create Notification
    try {
      await Notification.create({
        userId: vendor._id,
        userModel: "MainVendor",
        senderName: "Administrator",
        title: "Subscription Plan Extended",
        message: `Your subscription has been manually extended until ${formattedDateTime}.`,
        type: "plan_extended",
        recipient: "vendor",
      });
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    // Send Confirmation Email to Vendor
    try {
      const emailSubject = `Subscription Plan Extended - Valid Till ${formattedDateTime}`;
      const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Plan Extended by Admin</title>
      </head>
      <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; margin:40px 0; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <tr>
                  <td align="center" style="background:#10b981; padding:25px; color:#ffffff;">
                    <h1 style="margin:0; font-size:24px;">${process.env.COMPANY_NAME || "AuctionBilling"}</h1>
                    <p style="margin:5px 0 0; font-size:14px;">Plan Extended by Administrator</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px; color:#333333;">
                    <h2 style="margin-top:0; color:#1e293b;">Hello ${vendor.name},</h2>
                    <p>Good news! Your subscription plan has been extended by our administration team.</p>
                    
                    <h3 style="margin-top:20px; margin-bottom:10px; color:#1e293b;">Extension Details:</h3>
                    <table width="100%" cellpadding="10" cellspacing="0" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; margin-bottom:20px;">
                      <tr>
                        <td style="color:#64748b; font-size:14px;"><strong>Plan Name:</strong></td>
                        <td style="color:#0f172a; font-size:14px;"><strong>${vendor.plan?.name || "Active Plan"}</strong></td>
                      </tr>
                      <tr>
                        <td style="color:#64748b; font-size:14px;"><strong>New Expiry Date &amp; Time:</strong></td>
                        <td style="color:#059669; font-size:15px; font-weight:bold;">${formattedDateTime} (IST)</td>
                      </tr>
                      ${reason ? `
                      <tr>
                        <td style="color:#64748b; font-size:14px;"><strong>Admin Note / Reason:</strong></td>
                        <td style="color:#0f172a; font-size:14px;">${reason}</td>
                      </tr>` : ""}
                    </table>
                    
                    <div style="text-align:center; margin:30px 0;">
                      <a href="${(process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system").replace(/\/$/, "")}/mainvendor" 
                         style="background:#10b981; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">
                        Access Your Dashboard
                      </a>
                    </div>
                    
                    <p style="color:#64748b; font-size:13px; line-height:1.5;">If you have any questions or need further assistance, please contact our support team.</p>
                    <br/>
                    <p>Warm regards,<br/><strong>${process.env.COMPANY_NAME || "AuctionBilling"} Team</strong></p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background:#f1f5f9; padding:20px; font-size:12px; color:#64748b;">
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

      await sendEmail(vendor.email, emailSubject, emailContent);
    } catch (emailErr) {
      console.error("Plan extension email error:", emailErr);
    }

    res.status(200).json({
      status: true,
      message: `Plan successfully extended till ${formattedDateTime}!`,
      newPlanEndDate: newExpiryDate,
      formattedDateTime,
    });
  } catch (error) {
    console.error("Extend vendor plan error:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

