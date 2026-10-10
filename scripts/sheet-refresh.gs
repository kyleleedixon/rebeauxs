/**
 * Rebeaux's BBQ Sauce — tell the dashboard to refresh after an edit.
 *
 * Paste this into the Sheet: Extensions -> Apps Script. Then set the two values
 * below and install the trigger (see README section 7a). A simple onEdit(e)
 * will NOT work here — simple triggers may not call external URLs, so this has
 * to be installed as an "On edit" trigger, which runs with your authorisation.
 *
 * It sends no data. It only tells the dashboard its cached copy is out of date.
 */

// Your production URL, with /api/revalidate on the end.
const DASHBOARD_ENDPOINT = 'https://REPLACE-ME.vercel.app/api/revalidate';

// Must match REVALIDATE_TOKEN in the Vercel environment variables.
const REVALIDATE_TOKEN = 'REPLACE-ME';

/** Installed "On edit" trigger target. */
function onSheetEdit() {
  pingDashboard_();
}

/** Run this once by hand to authorise the script and check the wiring. */
function pingNow() {
  const code = pingDashboard_(true);
  SpreadsheetApp.getActiveSpreadsheet().toast(
    code === 200 ? 'Dashboard refreshed.' : 'Refresh failed — HTTP ' + code,
    'RBX dashboard',
    5,
  );
}

/**
 * Typing fires an edit per keystroke-commit, so this collapses bursts: at most
 * one ping every 15 seconds. The dashboard's own 5-minute refresh catches
 * anything a skipped ping misses.
 */
function pingDashboard_(force) {
  const cache = CacheService.getScriptCache();
  if (!force && cache.get('rbx-pinged')) return 0;
  cache.put('rbx-pinged', '1', 15);

  try {
    const response = UrlFetchApp.fetch(DASHBOARD_ENDPOINT, {
      method: 'post',
      headers: { 'x-revalidate-token': REVALIDATE_TOKEN },
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    if (code !== 200) console.error('Dashboard refresh failed: HTTP ' + code);
    return code;
  } catch (err) {
    console.error('Dashboard refresh failed: ' + err);
    return -1;
  }
}
