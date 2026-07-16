const cron = require("node-cron");
const ReferralBonus = require("../models/ReferralBonus");
const User = require("../models/User");
const Notification = require("../models/Notification");

const setupReferralBonusSync = () => {
  const checkProbationCompletion = async (triggerSource) => {
    console.log(`[ReferralBonusSync ${triggerSource}] Checking completed probations...`);
    try {
      const today = new Date();
      
      // Find all referrals pending probation whose probation completion date is reached and hasn't been notified yet
      const completedReferrals = await ReferralBonus.find({
        status: "Pending Probation",
        probationCompletionDate: { $lte: today, $ne: null },
        probationNotificationSent: { $ne: true }
      });

      if (completedReferrals.length === 0) {
        console.log(`[ReferralBonusSync ${triggerSource}] No new completed probations found.`);
        return;
      }

      console.log(`[ReferralBonusSync ${triggerSource}] Found ${completedReferrals.length} completed probation(s). Triggering notifications & emails...`);

      // Get HR and Admin users to notify
      const hrAdminUsers = await User.find({ role: { $in: ["hr", "admin"] } }).select("_id email name");
      const hrAdminEmails = hrAdminUsers.map(u => u.email).filter(Boolean);

      // Get General Manager (GM) emails
      const Employee = require("../models/Employee");
      const gms = await Employee.find({ 
        designation: { $regex: /(general manager|^gm\b)/i } 
      }).select("email officialEmail name");
      const gmEmails = gms.map(e => e.officialEmail || e.email).filter(Boolean);

      // Collect unique recipient email addresses
      const recipients = [...new Set([...hrAdminEmails, ...gmEmails])];

      const { sendZohoMail } = require("../zohoMail.service");
      
      for (const ref of completedReferrals) {
        // Send system notification to HR & Admins
        for (const hr of hrAdminUsers) {
          await Notification.create({
            recipient: hr._id,
            title: "Probation Completed for Referral",
            message: `Candidate ${ref.candidateName} (Referral ID: ${ref.referralId}) has completed the 6-month probation period. Status has been automatically updated to Eligible.`,
            type: "OTHER"
          });
        }

        // Automatically update status to Eligible and eligibility to Yes
        ref.status = "Eligible";
        ref.eligibility = "Yes";
        ref.probationNotificationSent = true;
        await ref.save();

        // Send Email integration
        if (recipients.length > 0) {
          try {
            const subject = `[Referral Bonus] Probation Completed - ${ref.candidateName}`;
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #262760; margin-bottom: 20px;">Probation Completed - Referral Eligible</h2>
                <p>Hello Team,</p>
                <p>This is to inform you that the referred candidate <strong>${ref.candidateName}</strong> (Referral ID: <strong>${ref.referralId}</strong>) has successfully completed their 6-month probation period today.</p>
                <p>A summary of the referral details is provided below:</p>
                <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 15px; margin-bottom: 20px; font-size: 14px;">
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Candidate Name</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.candidateName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Candidate Employee ID</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.candidateEmployeeId || "—"}</td>
                  </tr>
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Candidate Designation</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.candidateDesignation}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Referring Employee ID</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.referringEmployeeId}</td>
                  </tr>
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Referring Employee Name</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.referringEmployeeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Referral Bonus Amount</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #262760;">Rs. ${(ref.bonusAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr style="background-color: #f9f9f9;">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Date of Joining (DOJ)</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${ref.dateOfJoining ? new Date(ref.dateOfJoining).toLocaleDateString() : "—"}</td>
                  </tr>
                </table>
                <p>The referral status has been automatically updated to <strong>Eligible</strong> in the portal. You can now review and approve this claim in the Referral Bonus module.</p>
                <br />
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px; margin-bottom: 20px;" />
                <p style="font-size: 12px; color: #888;">This is an automated notification from the Steel Employee Management Portal.</p>
              </div>
            `;

            await sendZohoMail({
              to: recipients.join(","),
              subject: subject,
              html: htmlContent
            });
            console.log(`[ReferralBonusSync] Email successfully sent to: ${recipients.join(", ")}`);
          } catch (mailErr) {
            console.error(`[ReferralBonusSync] Failed to send email for referral ${ref.referralId}:`, mailErr.message);
          }
        }
      }

      console.log(`[ReferralBonusSync ${triggerSource}] Notifications sent and records updated.`);
    } catch (err) {
      console.error(`[ReferralBonusSync ${triggerSource}] Error:`, err.message);
    }
  };

  // 1. Run check on server startup
  checkProbationCompletion("Startup");

  // 2. Run daily at 12:00 AM
  cron.schedule("0 0 * * *", async () => {
    await checkProbationCompletion("Daily_Cron");
  });

  console.log("[ReferralBonus Cron] Scheduled: Daily check at 12:00 AM");
};

module.exports = setupReferralBonusSync;
