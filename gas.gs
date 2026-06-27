/**
 * Burgeri Ops — Google Apps Script backend (photo upload)
 *
 * Stores write-off photos uploaded by the mobile app. The Cloudflare Worker
 * forwards multipart uploads to this Web App after validating the mobile
 * session.
 *
 * Handles:
 *   1. "upload-photo"  → Saves a write-off photo to Google Drive, returns its id
 *
 * Deploy as: Web App → Execute as: Me → Who has access: Anyone
 *
 * Required Script Properties (Project Settings → Script Properties):
 *   GAS_SECRET            — shared secret (must match GAS_SECRET in .dev.vars / wrangler secret)
 *   GAS_PHOTO_FOLDER_ID   — (optional) Drive folder id for write-off photos; root if unset
 *
 * The Worker posts JSON:
 *   { secret, action: "upload-photo", filename, mimeType, dataBase64 }
 */

/* ─── Configuration helpers ─── */

var BRAND_NAME = "Burgeri Ops"

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

/* ─── Utilities ─── */

function jsonResponse_(code, payload) {
  payload.statusCode = code
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  )
}
