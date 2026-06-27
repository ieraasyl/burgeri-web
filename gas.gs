/**
 * Burgeri Ops — Google Apps Script backend (email OTP)
 *
 * Delivers the sign-in one-time codes for the Burgeri write-off app. The
 * Cloudflare Worker (src/lib/auth.server.ts) calls this Web App from
 * better-auth's emailOTP `sendVerificationOTP` hook.
 *
 * Handles:
 *   1. "send-otp"      → Sends a verification code email via GmailApp
 *   2. "upload-photo"  → Saves a write-off photo to Google Drive, returns its id
 *
 * Deploy as: Web App → Execute as: Me → Who has access: Anyone
 *
 * Required Script Properties (Project Settings → Script Properties):
 *   GAS_SECRET            — shared secret (must match GAS_SECRET in .dev.vars / wrangler secret)
 *   GAS_PHOTO_FOLDER_ID   — (optional) Drive folder id for write-off photos; root if unset
 *
 * The Worker posts JSON:
 *   { secret, action: "send-otp", email, otp, type }
 *   { secret, action: "upload-photo", filename, mimeType, dataBase64 }
 */

/* ─── Configuration helpers ─── */

var BRAND_NAME = "Burgeri Ops"
var BRAND_COLOR = "#00786f" // matches the app theme_color / Tailwind primary

function getConfig_() {
  const props = PropertiesService.getScriptProperties()
  return {
    secret: props.getProperty("GAS_SECRET") || "",
    photoFolderId: props.getProperty("GAS_PHOTO_FOLDER_ID") || "",
  }
}

/* ─── Entry points ─── */

/**
 * POST handler — the only entry point.
 * Expects JSON body with: { secret, action, ...payload }
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
  } catch (_) {
    return jsonResponse_(400, { error: "Invalid JSON body" })
  }

  var config = getConfig_()

  if (!config.secret || body.secret !== config.secret) {
    return jsonResponse_(401, { error: "Unauthorized" })
  }

  var action = body.action

  if (action === "send-otp") {
    return handleSendOtp_(body)
  }

  if (action === "upload-photo") {
    return handleUploadPhoto_(body, config)
  }

  return jsonResponse_(400, { error: "Unknown action: " + action })
}

/**
 * GET handler — health-check only.
 */
function doGet() {
  return jsonResponse_(200, { status: "ok", service: "burgeri-ops-gas" })
}

/* ─── Action: send-otp ─── */

function handleSendOtp_(body) {
  var email = (body.email || "").trim()
  var otp = (body.otp || "").trim()
  if (!email || !otp) {
    return jsonResponse_(400, { error: "Missing email or otp" })
  }

  var subject = "Your " + BRAND_NAME + " sign-in code: " + otp
  var htmlBody = buildOtpEmail_(otp, "Sign in to your account", email)

  try {
    GmailApp.sendEmail(email, subject, otp, {
      name: BRAND_NAME,
      htmlBody: htmlBody,
    })
    return jsonResponse_(200, { success: true })
  } catch (err) {
    return jsonResponse_(500, { error: "Failed to send email: " + err.message })
  }
}

/* ─── Action: upload-photo ─── */

function handleUploadPhoto_(body, config) {
  var dataBase64 = body.dataBase64 || ""
  var filename = (body.filename || "write-off-" + Date.now() + ".jpg").trim()
  var mimeType = body.mimeType || "image/jpeg"

  if (!dataBase64) {
    return jsonResponse_(400, { error: "Missing dataBase64" })
  }

  try {
    var bytes = Utilities.base64Decode(dataBase64)
    var blob = Utilities.newBlob(bytes, mimeType, filename)

    var folder = config.photoFolderId
      ? DriveApp.getFolderById(config.photoFolderId)
      : DriveApp.getRootFolder()
    var file = folder.createFile(blob)

    // Make the photo viewable by the reviewer web app via its share link.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

    var fileId = file.getId()
    return jsonResponse_(200, {
      success: true,
      fileId: fileId,
      url: "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w2000",
    })
  } catch (err) {
    return jsonResponse_(500, { error: "Failed to store photo: " + err.message })
  }
}

/**
 * HTML email for the OTP.
 */
function buildOtpEmail_(otp, heading, email) {
  return (
    "<!DOCTYPE html>" +
    '<html><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 0">' +
    '<tr><td align="center">' +
    '<table width="400" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">' +
    '<tr><td style="padding:20px 24px;border-bottom:1px solid #e4e4e7">' +
    '<span style="color:' +
    BRAND_COLOR +
    ';font-size:20px;font-weight:600;letter-spacing:-0.02em">' +
    BRAND_NAME +
    "</span>" +
    "</td></tr>" +
    '<tr><td style="padding:32px 24px">' +
    '<p style="margin:0 0 8px;color:#71717a;font-size:12px;text-transform:lowercase">' +
    heading.toLowerCase() +
    "</p>" +
    '<p style="margin:0 0 16px;color:#3f3f46;font-size:14px">Your verification code is:</p>' +
    '<div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px 24px;text-align:center;margin:0 0 24px">' +
    '<span style="color:' +
    BRAND_COLOR +
    ';font-size:28px;font-weight:600;letter-spacing:0.35em;font-family:ui-monospace,monospace">' +
    otp +
    "</span>" +
    "</div>" +
    '<p style="margin:0 0 8px;color:#71717a;font-size:12px">This code expires in 5 minutes.</p>' +
    '<p style="margin:0;color:#a1a1aa;font-size:11px">If you did not request this code, you can safely ignore this email.</p>' +
    "</td></tr>" +
    '<tr><td style="padding:16px 24px;border-top:1px solid #e4e4e7;background:#fafafa">' +
    '<p style="margin:0;color:#a1a1aa;font-size:11px">Sent to ' +
    email +
    " — " +
    BRAND_NAME +
    "</p>" +
    "</td></tr>" +
    "</table>" +
    "</td></tr></table>" +
    "</body></html>"
  )
}

/* ─── Utilities ─── */

function jsonResponse_(code, payload) {
  payload.statusCode = code
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  )
}
