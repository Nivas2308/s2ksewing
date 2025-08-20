/**
 * Complete Google Apps Script Code for S2K Sewing Contact Management System
 * This file should be saved as Code.gs in your Google Apps Script project
 */

// Configuration Constants - UPDATE THESE FOR YOUR PROJECT
const CONTACT_SHEET_NAME = "Contact_Submissions";
const ADMIN_SHEET_NAME = "Admin_Contact_Info";
const SPREADSHEET_ID = "1dzzk4IK89JE2FHOjgvytFiecVEiQwu2Q-Pe2eg72eyQ"; // Your spreadsheet ID
const ADMIN_EMAIL = "s2ksewing@gmail.com"; // Your email address

/**
 * Main entry point for HTTP requests (GET and POST)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === "get_admin_contact_info") {
      return getAdminContactInfo();
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Invalid GET request",
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Server error: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    console.log("=== INCOMING POST REQUEST ===");
    console.log("Parameters:", e.parameter);

    const action = e.parameter.action;

    if (action === "submit_contact_form") {
      return handleContactFormSubmission(e.parameter);
    } else if (action === "get_admin_contact_info") {
      return getAdminContactInfo();
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Unknown action: " + action,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error("Error in doPost:", error);
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Server error: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle contact form submission
 */
function handleContactFormSubmission(params) {
  try {
    console.log("=== HANDLING CONTACT FORM SUBMISSION ===");
    console.log("Raw form data:", params);

    // Validate required fields
    if (!params.name || !params.email || !params.message) {
      throw new Error("Missing required fields: name, email, or message");
    }

    // Generate unique submission ID
    const submissionId =
      "S2K_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("Generated submission ID:", submissionId);

    // Clean and prepare form data
    const formData = {
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone ? params.phone.trim() : "",
      subject: params.subject || "general",
      message: params.message.trim(),
      timestamp: new Date().toISOString(),
      submissionId: submissionId,
    };

    console.log("Cleaned form data:", formData);

    // Save to spreadsheet first
    console.log("=== SAVING TO SPREADSHEET ===");
    const saveResult = saveToSpreadsheet(formData);
    console.log("Spreadsheet save result:", saveResult);

    // Send email notification
    console.log("=== SENDING EMAIL NOTIFICATION ===");
    const emailResult = sendEmailNotification(formData, submissionId);
    console.log("Email notification result:", emailResult);

    // Return success response
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Contact form submitted successfully",
        submissionId: submissionId,
        emailSent: emailResult,
        timestamp: formData.timestamp,
      })
    )
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      });
  } catch (error) {
    console.error("❌ Error in handleContactFormSubmission:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Failed to submit contact form: " + error.message,
        error: error.toString(),
      })
    )
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type",
      });
  }
}

/**
 * Save form data to Google Spreadsheet
 */
function saveToSpreadsheet(formData) {
  try {
    console.log("Opening spreadsheet with ID:", SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONTACT_SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log("Creating new sheet:", CONTACT_SHEET_NAME);
      sheet = ss.insertSheet(CONTACT_SHEET_NAME);

      // Add headers
      sheet
        .getRange(1, 1, 1, 8)
        .setValues([
          [
            "Timestamp",
            "Submission_ID",
            "Name",
            "Email",
            "Phone",
            "Subject",
            "Message",
            "Status",
          ],
        ]);

      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4285F4");
      headerRange.setFontColor("white");
    }

    // Add the form data
    const newRow = [
      new Date(formData.timestamp),
      formData.submissionId,
      formData.name,
      formData.email,
      formData.phone,
      getSubjectCategory(formData.subject),
      formData.message,
      "New",
    ];

    sheet.appendRow(newRow);
    console.log("✅ Data saved to spreadsheet successfully");

    return true;
  } catch (error) {
    console.error("❌ Error saving to spreadsheet:", error);
    throw new Error("Failed to save to spreadsheet: " + error.message);
  }
}

/**
 * Send email notification to admin
 */
function sendEmailNotification(formData, submissionId) {
  try {
    console.log("=== STARTING EMAIL NOTIFICATION ===");
    console.log("Admin email:", ADMIN_EMAIL);
    console.log("Form data for email:", formData);

    // Validate admin email
    if (!ADMIN_EMAIL || !isValidEmail(ADMIN_EMAIL)) {
      throw new Error("Invalid admin email address: " + ADMIN_EMAIL);
    }

    // Test Gmail access
    try {
      const quota = GmailApp.getRemainingDailyQuota();
      console.log("Gmail quota remaining:", quota);

      if (quota <= 0) {
        throw new Error("Gmail daily quota exceeded");
      }
    } catch (gmailError) {
      console.error("Gmail service error:", gmailError);
      throw new Error("Gmail service not accessible: " + gmailError.message);
    }

    // Get admin contact info for email template
    const adminContactInfo = getAdminContactInfoSync();
    console.log("Admin contact info loaded");

    // Create email content
    const subjectCategory = getSubjectCategory(formData.subject);
    const emailSubject = `🔔 New ${subjectCategory} - ${formData.name} | S2K Sewing`;

    const plainTextBody = createPlainTextEmail(
      formData,
      submissionId,
      adminContactInfo
    );
    const htmlBody = createHtmlEmail(formData, submissionId, adminContactInfo);

    console.log("Email subject:", emailSubject);
    console.log("Attempting to send email...");

    // Send the email
    GmailApp.sendEmail(ADMIN_EMAIL, emailSubject, plainTextBody, {
      htmlBody: htmlBody,
      name: "S2K Sewing Contact System",
      replyTo: formData.email,
      noReply: false,
    });

    console.log("✅ Email notification sent successfully");

    // Log the successful email in spreadsheet
    logEmailNotification(submissionId, ADMIN_EMAIL, "SUCCESS");

    return true;
  } catch (error) {
    console.error("❌ Primary email failed:", error);

    // Try simple fallback email
    try {
      console.log("Attempting fallback email...");
      return sendFallbackEmail(formData, submissionId, error.message);
    } catch (fallbackError) {
      console.error("❌ Fallback email also failed:", fallbackError);

      // Log the failure
      logEmailNotification(
        submissionId,
        ADMIN_EMAIL,
        "FAILED: " + error.message
      );

      return false;
    }
  }
}

/**
 * Send simple fallback email
 */
function sendFallbackEmail(formData, submissionId, originalError) {
  try {
    const simpleSubject = `S2K Sewing Contact: ${formData.name}`;
    const simpleBody = `NEW CONTACT FORM SUBMISSION

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || "Not provided"}
Subject: ${getSubjectCategory(formData.subject)}
Message: ${formData.message}

Submission ID: ${submissionId}
Time: ${new Date(formData.timestamp).toLocaleString()}

(Original email template failed: ${originalError})

---
Reply to this email to contact the customer directly.`;

    GmailApp.sendEmail(ADMIN_EMAIL, simpleSubject, simpleBody);

    console.log("✅ Fallback email sent successfully");
    return true;
  } catch (error) {
    console.error("❌ Fallback email failed:", error);
    throw error;
  }
}

/**
 * Create HTML email template
 */
function createHtmlEmail(formData, submissionId, adminContactInfo) {
  const subjectCategory = getSubjectCategory(formData.subject);
  const urgencyClass = getUrgencyClass(formData.subject);
  const submitTime = new Date(formData.timestamp).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 20px; 
      background-color: #f5f5f5;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .info-section { 
      background: #f8f9fa; 
      padding: 20px; 
      margin: 20px 0; 
      border-radius: 8px; 
      border-left: 5px solid #007bff; 
    }
    .info-section.urgent { border-left-color: #dc3545; }
    .info-section.medium { border-left-color: #ffc107; }
    .info-section h3 { margin: 0 0 15px 0; color: #2c3e50; }
    .info-row { margin: 8px 0; }
    .info-label { font-weight: 600; color: #495057; }
    .info-value { color: #212529; }
    .info-value a { color: #007bff; text-decoration: none; }
    .message-section { 
      background: #fff; 
      border: 2px solid #e9ecef; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
    }
    .message-content { 
      background: #f8f9fa; 
      padding: 15px; 
      border-radius: 5px; 
      border-left: 4px solid #28a745;
      white-space: pre-wrap;
    }
    .actions { 
      text-align: center; 
      margin: 30px 0; 
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .btn { 
      display: inline-block; 
      padding: 12px 25px; 
      margin: 5px; 
      background: #007bff; 
      color: white; 
      text-decoration: none; 
      border-radius: 25px; 
      font-weight: 600;
    }
    .btn.phone { background: #28a745; }
    .footer { 
      background: #343a40; 
      color: #adb5bd; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    .priority-urgent { background: #dc3545; color: white; }
    .priority-medium { background: #ffc107; color: #212529; }
    .priority-normal { background: #28a745; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧵 S2K Sewing Contact Alert</h1>
      <p>New ${subjectCategory.toLowerCase()} received
        <span class="priority-badge priority-${urgencyClass}">
          ${urgencyClass.toUpperCase()} PRIORITY
        </span>
      </p>
    </div>
    
    <div class="content">
      <div class="info-section ${urgencyClass}">
        <h3>👤 Customer Information</h3>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${formData.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value"><a href="mailto:${formData.email}">${
    formData.email
  }</a></span>
        </div>
        ${
          formData.phone
            ? `
        <div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value"><a href="tel:${formData.phone.replace(
            /\D/g,
            ""
          )}">${formData.phone}</a></span>
        </div>`
            : ""
        }
        <div class="info-row">
          <span class="info-label">Category:</span>
          <span class="info-value">${subjectCategory}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Submitted:</span>
          <span class="info-value">${submitTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ID:</span>
          <span class="info-value">${submissionId}</span>
        </div>
      </div>
      
      <div class="message-section">
        <h3>💬 Customer Message</h3>
        <div class="message-content">${formData.message}</div>
      </div>
      
      <div class="actions">
        <h3>🚀 Quick Actions</h3>
        <a href="mailto:${formData.email}?subject=Re: ${encodeURIComponent(
    subjectCategory
  )} - S2K Sewing Response&body=${encodeURIComponent(
    "Dear " + formData.name + ",\n\nThank you for contacting S2K Sewing...\n\n"
  )}" class="btn">
          📧 Reply to Customer
        </a>
        ${
          formData.phone
            ? `
        <a href="tel:${formData.phone.replace(/\D/g, "")}" class="btn phone">
          📞 Call Customer
        </a>`
            : ""
        }
      </div>
    </div>
    
    <div class="footer">
      <p>🤖 Automated notification from S2K Sewing Contact Management System</p>
      <p>⏰ Please respond to the customer within 24 hours</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Create plain text email
 */
function createPlainTextEmail(formData, submissionId, adminContactInfo) {
  const subjectCategory = getSubjectCategory(formData.subject);
  const submitTime = new Date(formData.timestamp).toLocaleString();
  const urgency = getUrgencyClass(formData.subject).toUpperCase();

  return `🧵 S2K SEWING - NEW CONTACT FORM SUBMISSION
=============================================

PRIORITY LEVEL: ${urgency}
CATEGORY: ${subjectCategory}

CUSTOMER INFORMATION:
--------------------
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || "Not provided"}
Submission Time: ${submitTime}
Submission ID: ${submissionId}

CUSTOMER MESSAGE:
----------------
${formData.message}

QUICK ACTIONS:
-------------
- Reply to this email to respond to the customer
- Call the customer: ${formData.phone || "No phone provided"}

=============================================
🤖 Automated notification from S2K Sewing Contact System
⏰ Please respond within 24 hours for optimal service
📧 Reply directly to this email to contact the customer`;
}

/**
 * Get admin contact information
 */
function getAdminContactInfo() {
  try {
    const contactInfo = getAdminContactInfoSync();

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        contactInfo: contactInfo,
      })
    )
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      });
  } catch (error) {
    console.error("Error getting admin contact info:", error);

    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        message: "Failed to load contact info: " + error.message,
      })
    )
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      });
  }
}

/**
 * Get admin contact info synchronously
 */
function getAdminContactInfoSync() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(ADMIN_SHEET_NAME);

    if (!sheet) {
      // Create admin sheet with default data
      sheet = ss.insertSheet(ADMIN_SHEET_NAME);
      sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]);
      sheet.getRange(2, 1, 2, 2).setValues([
        [
          "customerSupport",
          "Email: s2ksewing@gmail.com\nPhone: (555) 123-4567\nHours: Mon-Fri 9AM-5PM",
        ],
        [
          "mainOffice",
          "S2K Sewing Main Office\n123 Sewing Street\nCraft City, CC 12345",
        ],
      ]);

      // Format headers
      sheet
        .getRange(1, 1, 1, 2)
        .setFontWeight("bold")
        .setBackground("#4285F4")
        .setFontColor("white");
    }

    const data = sheet.getDataRange().getValues();
    const contactInfo = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1] !== undefined) {
        contactInfo[row[0]] = row[1];
      }
    }

    return contactInfo;
  } catch (error) {
    console.error("Error getting admin contact info:", error);
    return {
      customerSupport: "Email: s2ksewing@gmail.com\nPhone: (555) 123-4567",
      mainOffice: "S2K Sewing Main Office\n123 Sewing Street",
    };
  }
}

/**
 * Log email notification attempt
 */
function logEmailNotification(submissionId, email, status) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName("Email_Log");

    if (!logSheet) {
      logSheet = ss.insertSheet("Email_Log");
      logSheet
        .getRange(1, 1, 1, 4)
        .setValues([["Timestamp", "Submission_ID", "Email", "Status"]]);
      logSheet
        .getRange(1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#4285F4")
        .setFontColor("white");
    }

    logSheet.appendRow([new Date(), submissionId, email, status]);
  } catch (error) {
    console.error("Error logging email notification:", error);
  }
}

// Utility Functions
function getSubjectCategory(subject) {
  const categories = {
    general: "General Inquiry",
    technical: "Technical Support",
    sales: "Sales Inquiry",
    warranty: "Warranty Claim",
    repair: "Repair Service",
    parts: "Parts Request",
    other: "Other Inquiry",
  };

  return categories[subject] || "General Inquiry";
}

function getUrgencyClass(subject) {
  const urgentSubjects = ["technical", "warranty", "repair"];
  const mediumSubjects = ["sales", "parts"];

  if (urgentSubjects.includes(subject)) return "urgent";
  if (mediumSubjects.includes(subject)) return "medium";
  return "normal";
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Test Functions for Debugging
function testEmailFunctionality() {
  console.log("=== TESTING EMAIL FUNCTIONALITY ===");

  const testData = {
    name: "Test Customer",
    email: "test@example.com",
    phone: "(555) 123-4567",
    subject: "technical",
    message:
      "This is a test message to verify the email notification system is working properly.",
    timestamp: new Date().toISOString(),
    submissionId: "TEST_" + Date.now(),
  };

  try {
    const result = sendEmailNotification(testData, testData.submissionId);
    console.log("Test email result:", result);
    return result;
  } catch (error) {
    console.error("Test email failed:", error);
    return false;
  }
}

function testFullSubmissionFlow() {
  console.log("=== TESTING FULL SUBMISSION FLOW ===");

  const testParams = {
    action: "submit_contact_form",
    name: "John Test",
    email: "john.test@example.com",
    phone: "(555) 987-6543",
    subject: "sales",
    message:
      "I am interested in your sewing machines. Please contact me with more information.",
  };

  try {
    const result = handleContactFormSubmission(testParams);
    console.log("Full test result:", result);
    return result;
  } catch (error) {
    console.error("Full test failed:", error);
    return false;
  }
}
