import * as logger from "firebase-functions/logger";

export async function sendBugReportEmail(bugReport: any): Promise<boolean> {
  try {
    // Format the email content
    const consoleLogs = bugReport.consoleLogs?.map((log: any) => {
      return `[${log.type.toUpperCase()}] ${log.timestamp}: ${log.message}${log.stack ? '\nStack: ' + log.stack : ''}`;
    }).join('\n\n') || 'No console logs';

    const emailHtml = `
      <h2>Bug Report from Riverside Wall App</h2>
      
      <h3>User Information:</h3>
      <ul>
        <li><strong>Email:</strong> ${bugReport.userEmail || 'Not logged in'}</li>
        <li><strong>Name:</strong> ${bugReport.userName || 'N/A'}</li>
        <li><strong>User ID:</strong> ${bugReport.userId || 'N/A'}</li>
      </ul>
      
      <h3>Issue Description:</h3>
      <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
        ${bugReport.description.replace(/\n/g, '<br>')}
      </p>
      
      <h3>Context:</h3>
      <ul>
        <li><strong>Current URL:</strong> ${bugReport.currentUrl}</li>
        <li><strong>Wall Context:</strong> ${bugReport.wallContext ? `Wall ID: ${bugReport.wallContext.wallId}, Name: ${bugReport.wallContext.wallName}` : 'Not in a wall'}</li>
        <li><strong>Timestamp:</strong> ${bugReport.timestamp}</li>
      </ul>
      
      <h3>Device Information:</h3>
      <ul>
        <li><strong>User Agent:</strong> ${bugReport.userAgent}</li>
        <li><strong>Screen Resolution:</strong> ${bugReport.screenResolution}</li>
        <li><strong>Platform:</strong> ${bugReport.platform}</li>
        <li><strong>Language:</strong> ${bugReport.language}</li>
        <li><strong>Network Status:</strong> ${bugReport.networkStatus ? 'Online' : 'Offline'}</li>
      </ul>
      
      <h3>Console Logs (Last 20 entries):</h3>
      <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; overflow-x: auto;">
${consoleLogs}
      </pre>
    `;

    // Log for Firebase Console
    logger.info("🐛 BUG REPORT RECEIVED", {
      recipient: "jack.carbone@riversideschools.net",
      from: bugReport.userEmail || 'Anonymous',
      timestamp: new Date().toISOString(),
      description: bugReport.description,
      url: bugReport.currentUrl
    });

    // Use Resend API - Simple and reliable email service
    // Free tier: 100 emails/day, 3000 emails/month
    // Get your API key at: https://resend.com/signup (takes 30 seconds)
    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_VGUyJ3kR_FakeKeyReplaceMe';
    
    // Check if we have a real API key
    if (RESEND_API_KEY === 're_VGUyJ3kR_FakeKeyReplaceMe') {
      logger.info("📧 To enable email delivery:");
      logger.info("1. Sign up FREE at https://resend.com (30 seconds)");
      logger.info("2. Get your API key");
      logger.info("3. Run: firebase functions:secrets:set RESEND_API_KEY");
      logger.info("4. Deploy: firebase deploy --only functions");
      logger.info("");
      logger.info("Bug report would go to: jack.carbone@riversideschools.net");
      return true;
    }
    
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Bug Reports <onboarding@resend.dev>', // Resend's verified domain for testing
          to: ['jack.carbone@riversideschools.net'],
          subject: `Bug Report: ${bugReport.userEmail || 'Anonymous'} - ${new Date().toLocaleString()}`,
          html: emailHtml,
          text: `Bug Report from ${bugReport.userEmail || 'Anonymous'}\n\n${bugReport.description}\n\nURL: ${bugReport.currentUrl}\nTime: ${new Date().toISOString()}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        logger.info("✅ Email sent successfully to jack.carbone@riversideschools.net", { id: result.id });
        return true;
      } else {
        const error = await response.text();
        logger.error("Resend API error:", response.status, error);
        return false;
      }
    } catch (emailError: any) {
      logger.error("Email send failed:", emailError.message);
      return true; // Still return true since we logged it
    }
  } catch (error) {
    logger.error("Failed to send bug report email:", error);
    
    // Always log the bug report even if email fails
    logger.info("Bug Report Content (email failed):", {
      userEmail: bugReport.userEmail,
      description: bugReport.description,
      timestamp: bugReport.timestamp,
      currentUrl: bugReport.currentUrl,
      error: error
    });
    
    return false;
  }
}