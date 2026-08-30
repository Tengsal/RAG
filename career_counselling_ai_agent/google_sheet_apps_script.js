/**
 * Google Sheets Web App — lead logger for the Career Counselling AI agent.
 *
 * SETUP (2 minutes):
 * 1. Create a Google Sheet (e.g. "Career Counselling Leads").
 *    Add header row: Timestamp | Call ID | Lead ID | Lead Name | Phone | Status |
 *    Duration (s) | Qualification | Interested Course | Callback Time | Email |
 *    Notes | Transcript
 * 2. Extensions → Apps Script → delete the default code → paste THIS file.
 * 3. Deploy → New deployment → type "Web app" →
 *      Execute as: Me
 *      Who has access: Anyone
 *    (Note: "Anyone" makes the URL callable by your server. Only share the URL
 *     with people you trust.)
 * 4. Copy the "Web app URL" (ends in /exec) into your .env:
 *      GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/XXXX/exec
 * 5. Done — every finished call appends a row automatically.
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    const row = [
      payload.timestamp || new Date().toISOString(),
      payload.call_id || '',
      payload.lead_id || '',
      payload.lead_name || '',
      payload.phone || '',
      payload.status || '',
      payload.duration_s || '',
      payload.qualification || '',
      payload.interested_course || '',
      payload.callback_time || '',
      payload.email || '',
      payload.notes || '',
      payload.transcript || '',
    ];

    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
