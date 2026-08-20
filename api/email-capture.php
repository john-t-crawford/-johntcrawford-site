<?php
/* ============================================================================
 *  email-capture.php — johntcrawford.com
 *  Drop-in PHP form handler for the WCAG whitepaper landing page (or any form).
 *
 *  Features:
 *    - Honeypot field anti-spam (no human-visible captcha needed)
 *    - Per-IP rate limit (file-backed, no DB required)
 *    - Server-side email + name validation
 *    - CSV log of every submission (for record + recovery)
 *    - Email notification to you on each submit
 *    - JSON response (works with fetch/XHR; degrades to plain text)
 *    - CORS allowed only from your own domain (matches your .htaccess)
 *
 *  Install:
 *    1. Upload to /public_html/api/email-capture.php  (create /api/ folder)
 *    2. chmod 0644 email-capture.php
 *    3. Create the data folder ABOVE the web root:
 *         /home/johntcrawford/data/   (chmod 0700)
 *       and update DATA_DIR below to match its absolute path.
 *    4. Test: curl -X POST https://johntcrawford.com/api/email-capture.php \
 *               -d 'email=test@example.com&name=Test&source=wcag22'
 *
 *  Config — edit these constants once and forget.
 * ============================================================================ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const RECIPIENT       = 'contact@crawfordcreationsllc.com';   // where notifications go
const FROM_ADDRESS    = 'noreply@johntcrawford.com';           // must match server's mail domain
const SUBJECT_PREFIX  = '[WCAG Whitepaper] New signup: ';
const ALLOWED_ORIGIN  = 'https://johntcrawford.com';
const RATE_PER_HOUR   = 5;                                     // max submissions per IP per hour
const DATA_DIR        = '/home/johntcrawford/private/data';            // ABSOLUTE path, ABOVE web root
const LOG_FILE        = 'email-capture.csv';
const RATE_FILE       = 'email-capture-rate.json';
const SEND_DOWNLOAD   = true;                                  // include download link in confirmation reply
const DOWNLOAD_URL    = 'https://johntcrawford.com/downloads/wcag22-whitepaper.pdf';

// ── SETUP ───────────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
header('Vary: Origin');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Helper — uniform JSON response and exit.
function respond(int $http, string $status, string $message, array $extra = []): void {
    http_response_code($http);
    echo json_encode(array_merge(['status' => $status, 'message' => $message], $extra));
    exit;
}

// ── METHOD CHECK ────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
    exit;
}
if ($method !== 'POST') {
    respond(405, 'error', 'Method not allowed.');
}

// ── INPUT ───────────────────────────────────────────────────────────────────
// Accept either form-encoded or JSON.
$body = $_POST;
if (empty($body)) {
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    if (is_array($json)) { $body = $json; }
}

$email   = trim((string)($body['email']   ?? ''));
$name    = trim((string)($body['name']    ?? ''));
$source  = trim((string)($body['source']  ?? 'wcag22'));   // tag for which form sent this
$honey   = trim((string)($body['website'] ?? ''));         // honeypot field

// ── HONEYPOT ────────────────────────────────────────────────────────────────
// Real users never fill the hidden "website" field; bots almost always do.
// If filled, fail SILENTLY (200 OK) so spammers don't learn the trick.
if ($honey !== '') {
    respond(200, 'ok', 'Thanks — we\'ll be in touch.');
}

// ── VALIDATE ────────────────────────────────────────────────────────────────
$errors = [];

if ($email === '') {
    $errors['email'] = 'Email is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    $errors['email'] = 'Please enter a valid email address.';
}

if ($name !== '') {
    // Optional, but if provided, must be reasonable.
    if (mb_strlen($name) > 100) {
        $errors['name'] = 'Name is too long.';
    } elseif (preg_match('/[<>{}\\\\]/', $name)) {
        $errors['name'] = 'Name contains invalid characters.';
    }
}

if (mb_strlen($source) > 50 || preg_match('/[^A-Za-z0-9_\-]/', $source)) {
    $source = 'unknown';
}

if (!empty($errors)) {
    respond(400, 'error', 'Please fix the highlighted fields.', ['fields' => $errors]);
}

// ── RATE LIMIT ──────────────────────────────────────────────────────────────
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ip = trim(explode(',', $ip)[0]);   // first IP if behind a proxy chain
$ipKey = preg_replace('/[^0-9a-fA-F:.]/', '', $ip) ?: 'unknown';

if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0700, true);
}

$ratePath = DATA_DIR . DIRECTORY_SEPARATOR . RATE_FILE;
$rates    = [];
if (is_readable($ratePath)) {
    $raw   = file_get_contents($ratePath) ?: '';
    $rates = json_decode($raw, true) ?: [];
}

$now    = time();
$cutoff = $now - 3600;
// Drop expired timestamps for this IP and any IP older than 1 hour.
foreach ($rates as $k => $stamps) {
    $rates[$k] = array_values(array_filter($stamps, fn($t) => $t >= $cutoff));
    if (empty($rates[$k])) unset($rates[$k]);
}
$myStamps = $rates[$ipKey] ?? [];
if (count($myStamps) >= RATE_PER_HOUR) {
    respond(429, 'error', 'Too many submissions from your network. Please try again in an hour.');
}
$myStamps[]      = $now;
$rates[$ipKey]   = $myStamps;
@file_put_contents($ratePath, json_encode($rates), LOCK_EX);

// ── LOG ─────────────────────────────────────────────────────────────────────
$logPath = DATA_DIR . DIRECTORY_SEPARATOR . LOG_FILE;
$row = [
    date('c'),
    $email,
    $name,
    $source,
    $ipKey,
    substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
    substr($_SERVER['HTTP_REFERER']    ?? '', 0, 200),
];
$writeHeader = !file_exists($logPath);
$fp = @fopen($logPath, 'a');
if ($fp) {
    if ($writeHeader) {
        fputcsv($fp, ['timestamp_iso','email','name','source','ip','user_agent','referer']);
    }
    fputcsv($fp, $row);
    fclose($fp);
    @chmod($logPath, 0600);
}

// ── EMAIL ───────────────────────────────────────────────────────────────────
// Notify you. Plain text — short, safe, hard to phish.
$nameText = $name !== '' ? $name : '(no name given)';
$body  = "New whitepaper signup\n";
$body .= str_repeat('-', 28) . "\n";
$body .= "Email:   {$email}\n";
$body .= "Name:    {$nameText}\n";
$body .= "Source:  {$source}\n";
$body .= "Time:    " . date('r') . "\n";
$body .= "IP:      {$ipKey}\n";
$body .= "Referer: " . ($_SERVER['HTTP_REFERER'] ?? '(none)') . "\n";

$headers = [
    'From: '         . FROM_ADDRESS,
    'Reply-To: '     . $email,
    'X-Mailer: '     . 'johntcrawford.com/email-capture',
    'MIME-Version: ' . '1.0',
    'Content-Type: ' . 'text/plain; charset=UTF-8',
];

@mail(RECIPIENT, SUBJECT_PREFIX . $email, $body, implode("\r\n", $headers));

// Optional: confirmation email to the visitor with download link.
// Disabled by default — enable when you've verified mail() works without
// going to spam. SiteGround usually delivers fine from the server domain.
if (SEND_DOWNLOAD) {
    $userBody  = "Thanks for requesting the WCAG 2.2 / Section 508 ID Guide.\n\n";
    $userBody .= "Download: " . DOWNLOAD_URL . "\n\n";
    $userBody .= "If you have questions about applying these standards in a federal\n";
    $userBody .= "contracting context, just reply to this email.\n\n";
    $userBody .= "— John Crawford\n  johntcrawford.com\n";
    $userHeaders = [
        'From: '         . FROM_ADDRESS,
        'Reply-To: '     . RECIPIENT,
        'MIME-Version: ' . '1.0',
        'Content-Type: ' . 'text/plain; charset=UTF-8',
    ];
    @mail($email, 'Your WCAG 2.2 Whitepaper download', $userBody, implode("\r\n", $userHeaders));
}

// ── SUCCESS ─────────────────────────────────────────────────────────────────
respond(200, 'ok', 'Thanks — check your inbox for the download link.', [
    'download' => SEND_DOWNLOAD ? DOWNLOAD_URL : null,
]);
