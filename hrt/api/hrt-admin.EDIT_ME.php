<?php
/* ============================================================================
 *  hrt-admin.php — johntcrawford.com/hrt/
 *
 *  Server-side receiver for the field-capture-to-publish pipeline. Lets an
 *  admin (you, from an iPhone) shoot a photo in capture.html and have it land
 *  in a private inbox; review.html then pulls from that inbox, confirms the
 *  species against the drawn plates exactly as it does for local files, and
 *  publishes straight into ./photos/ + photos.js + photos-manifest.json.
 *
 *  There is no user system. Every mutating and read action requires
 *  ?key=<SECRET> to match exactly (hash_equals, constant-time). Nobody
 *  without that key can list, view, upload, or publish anything, and pages
 *  that only READ from this endpoint (capture.html, review.html) fail the
 *  same way for a wrong or missing key — 403, no data.
 *
 *  Install:
 *    1. Copy this file to hrt-admin.php (same folder). hrt-admin.php is
 *       gitignored on purpose — it will hold a live secret, same pattern as
 *       /deploy.php at the site root.
 *    2. Replace SECRET below with a long random string, e.g.:
 *         php -r "echo bin2hex(random_bytes(24));"
 *    3. Create the inbox folder ABOVE the web root, next to the existing
 *       email-capture data dir:
 *         /home/johntcrawford/private/hrt-inbox/   (chmod 0700)
 *    4. Bookmark https://johntcrawford.com/hrt/capture.html?key=<SECRET> on
 *       your phone (Add to Home Screen works well). Open
 *       https://johntcrawford.com/hrt/review.html?key=<SECRET> on desktop
 *       when you're ready to vet what's come in.
 * ============================================================================ */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SECRET       = 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING';
const INBOX_DIR     = '/home/johntcrawford/private/hrt-inbox';
const RATE_FILE     = 'hrt-admin-rate.json';
const RATE_PER_HOUR = 40;                    // per IP, upload action only
const MAX_BYTES     = 20 * 1024 * 1024;      // 20 MB — generous for an iPhone JPEG
const PHOTOS_DIR    = __DIR__ . '/../photos';
const PHOTOS_JS     = __DIR__ . '/../photos.js';
const MANIFEST      = __DIR__ . '/../photos-manifest.json';
const SPECIES_INDEX = __DIR__ . '/../species-index.json';
const VIEWS         = ['foliage', 'bark', 'habit', 'flower', 'fruit'];
const CREDIT        = 'John T. Crawford';
const LICENSE       = 'Public domain \xe2\x80\x94 own work';

// ── SETUP ───────────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

function respond(int $http, string $status, string $message, array $extra = []): void {
    http_response_code($http);
    echo json_encode(array_merge(['status' => $status, 'message' => $message], $extra));
    exit;
}

// ── AUTH ────────────────────────────────────────────────────────────────────
$key = (string)($_REQUEST['key'] ?? '');
if (SECRET === 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING' || !hash_equals(SECRET, $key)) {
    respond(403, 'error', 'Not authorized.');
}

if (!is_dir(INBOX_DIR)) { @mkdir(INBOX_DIR, 0700, true); }
if (!is_dir(INBOX_DIR) || !is_writable(INBOX_DIR)) {
    respond(500, 'error', 'Inbox directory is missing or not writable: ' . INBOX_DIR);
}

$action = (string)($_REQUEST['action'] ?? '');

// ── HELPERS ─────────────────────────────────────────────────────────────────

// Every inbox file is named <32 hex chars>.<ext>. Reject anything else —
// this is the only user-suppliable filename that reaches the filesystem.
function safeInboxName(string $name): ?string {
    return preg_match('/^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/', $name) ? $name : null;
}

function ipKey(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ip = trim(explode(',', $ip)[0]);
    return preg_replace('/[^0-9a-fA-F:.]/', '', $ip) ?: 'unknown';
}

function rateLimited(): bool {
    $path = INBOX_DIR . DIRECTORY_SEPARATOR . RATE_FILE;
    $rates = [];
    if (is_readable($path)) { $rates = json_decode(file_get_contents($path) ?: '', true) ?: []; }
    $now = time(); $cutoff = $now - 3600;
    foreach ($rates as $k => $stamps) {
        $rates[$k] = array_values(array_filter($stamps, fn($t) => $t >= $cutoff));
        if (empty($rates[$k])) unset($rates[$k]);
    }
    $mine = $rates[ipKey()] ?? [];
    if (count($mine) >= RATE_PER_HOUR) return true;
    $mine[] = $now;
    $rates[ipKey()] = $mine;
    @file_put_contents($path, json_encode($rates), LOCK_EX);
    return false;
}

// Lossless JPEG rewrite dropping APP1..APP15 and comment segments — the
// same segment scan review.html runs client-side, ported so raw GPS bytes
// never sit in the inbox even before a human looks at the queue.
function stripJpegExif(string $bytes): string {
    $len = strlen($bytes);
    if ($len < 4 || substr($bytes, 0, 2) !== "\xFF\xD8") return $bytes;
    $out = substr($bytes, 0, 2);
    $p = 2;
    while ($p < $len - 4) {
        if ($bytes[$p] !== "\xFF") break;
        $marker = ord($bytes[$p + 1]);
        if ($marker === 0xDA) { $out .= substr($bytes, $p); $p = $len; break; }
        $segLen = (ord($bytes[$p + 2]) << 8) | ord($bytes[$p + 3]);
        $drop = ($marker >= 0xE1 && $marker <= 0xEF) || $marker === 0xFE;
        if (!$drop) $out .= substr($bytes, $p, 2 + $segLen);
        $p += 2 + $segLen;
    }
    if ($p < $len) $out .= substr($bytes, $p);
    return $out;
}

function loadSpeciesIndex(): array {
    if (!is_file(SPECIES_INDEX)) return [];
    $rows = json_decode(file_get_contents(SPECIES_INDEX) ?: '[]', true) ?: [];
    $byId = [];
    foreach ($rows as $r) { if (!empty($r['id'])) $byId[$r['id']] = $r; }
    return $byId;
}

// Read photos.js's embedded JSON, mutate, write back in the same shape
// build-photos.js and review.html's own export already produce.
function loadPhotosJs(): array {
    if (!is_file(PHOTOS_JS)) return [];
    $text = file_get_contents(PHOTOS_JS) ?: '';
    if (!preg_match('/window\.WOODY\.PHOTOS\s*=\s*(\{.*\});/s', $text, $m)) return [];
    return json_decode($m[1], true) ?: [];
}

function savePhotosJs(array $photos): void {
    foreach ($photos as $id => &$rows) {
        usort($rows, fn($a, $b) => array_search($a['view'], VIEWS) <=> array_search($b['view'], VIEWS));
    }
    unset($rows);
    ksort($photos);
    $json = json_encode($photos, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $out = "/* Generated by hrt-admin.php (server publish) and review.html (local export).\n"
         . "   Do not hand-edit — re-run the tool that produced it instead. */\n"
         . "window.WOODY = window.WOODY || {};\n"
         . "window.WOODY.PHOTOS = {$json};\n";
    file_put_contents(PHOTOS_JS, $out, LOCK_EX);
}

function updateManifest(string $id, string $view, string $src, array $species): void {
    if (!is_file(MANIFEST)) return;
    $manifest = json_decode(file_get_contents(MANIFEST) ?: '{}', true);
    if (!isset($manifest['photos'])) return;
    $manifest['photos'][$id] = $manifest['photos'][$id] ?? [];
    foreach ($manifest['photos'][$id] as $row) {
        if (($row['src'] ?? '') === $src) return; // already recorded
    }
    $manifest['photos'][$id][] = [
        'latin'   => $species['latin']  ?? '',
        'common'  => $species['common'] ?? '',
        'view'    => $view,
        'src'     => $src,
        'credit'  => CREDIT,
        'license' => LICENSE,
    ];
    file_put_contents(MANIFEST, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// ── ACTIONS ─────────────────────────────────────────────────────────────────

if ($action === 'upload') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, 'error', 'POST required.');
    if (rateLimited()) respond(429, 'error', 'Too many uploads from your network this hour.');
    if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        respond(400, 'error', 'No photo received, or the upload failed.');
    }
    $tmp = $_FILES['photo']['tmp_name'];
    $size = $_FILES['photo']['size'];
    if ($size > MAX_BYTES) respond(400, 'error', 'Photo is too large (' . round($size / 1024 / 1024, 1) . ' MB, 20 MB limit).');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    $extByMime = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extByMime[$mime])) {
        respond(400, 'error', 'Unsupported image type (' . $mime . '). On iPhone: Settings > Camera > Formats > Most Compatible, so shots save as JPEG.');
    }
    $ext = $extByMime[$mime];

    $bytes = file_get_contents($tmp);
    if ($ext === 'jpg') $bytes = stripJpegExif($bytes);

    $view = (string)($_POST['view'] ?? '');
    if (!in_array($view, VIEWS, true)) $view = '';
    $speciesGuess = substr((string)($_POST['speciesGuess'] ?? ''), 0, 80);
    $note = substr((string)($_POST['note'] ?? ''), 0, 300);

    $id = bin2hex(random_bytes(16));
    $file = "{$id}.{$ext}";
    file_put_contents(INBOX_DIR . DIRECTORY_SEPARATOR . $file, $bytes, LOCK_EX);
    file_put_contents(INBOX_DIR . DIRECTORY_SEPARATOR . "{$id}.json", json_encode([
        'file'         => $file,
        'speciesGuess' => $speciesGuess,
        'view'         => $view,
        'note'         => $note,
        'uploadedAt'   => date('c'),
        'ip'           => ipKey(),
        'bytes'        => strlen($bytes),
    ]), LOCK_EX);

    respond(200, 'ok', 'Uploaded.', ['file' => $file]);
}

if ($action === 'list') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, 'error', 'GET required.');
    $items = [];
    foreach (glob(INBOX_DIR . '/*.json') ?: [] as $path) {
        $meta = json_decode(file_get_contents($path) ?: '{}', true);
        if (!empty($meta['file']) && safeInboxName($meta['file'])) $items[] = $meta;
    }
    usort($items, fn($a, $b) => strcmp($a['uploadedAt'] ?? '', $b['uploadedAt'] ?? ''));
    respond(200, 'ok', count($items) . ' pending.', ['items' => $items]);
}

if ($action === 'image') {
    $file = safeInboxName((string)($_GET['file'] ?? ''));
    if (!$file) respond(400, 'error', 'Bad filename.');
    $path = INBOX_DIR . DIRECTORY_SEPARATOR . $file;
    if (!is_file($path)) respond(404, 'error', 'Not found.');
    $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    header('Content-Type: ' . ($mime[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

if ($action === 'publish') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, 'error', 'POST required.');
    $file = safeInboxName((string)($_POST['file'] ?? ''));
    $id = (string)($_POST['id'] ?? '');
    $view = (string)($_POST['view'] ?? '');
    if (!$file) respond(400, 'error', 'Bad filename.');
    if (!in_array($view, VIEWS, true)) respond(400, 'error', 'Bad view.');

    $index = loadSpeciesIndex();
    if (!isset($index[$id])) respond(400, 'error', 'Unknown species id: ' . $id);

    $srcPath = INBOX_DIR . DIRECTORY_SEPARATOR . $file;
    if (!is_file($srcPath)) respond(404, 'error', 'Inbox file not found — already published or discarded?');

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!is_dir(PHOTOS_DIR)) mkdir(PHOTOS_DIR, 0755, true);
    $base = "{$id}-{$view}";
    $target = "{$base}.{$ext}";
    $n = 1;
    while (is_file(PHOTOS_DIR . DIRECTORY_SEPARATOR . $target)) { $target = "{$base}-{$n}.{$ext}"; $n++; }

    if (!rename($srcPath, PHOTOS_DIR . DIRECTORY_SEPARATOR . $target)) {
        respond(500, 'error', 'Could not move file into photos/.');
    }
    @unlink(INBOX_DIR . DIRECTORY_SEPARATOR . pathinfo($file, PATHINFO_FILENAME) . '.json');

    $src = 'photos/' . $target;
    $photos = loadPhotosJs();
    $photos[$id] = $photos[$id] ?? [];
    $exists = false;
    foreach ($photos[$id] as $row) { if (($row['src'] ?? '') === $src) $exists = true; }
    if (!$exists) {
        $photos[$id][] = ['src' => $src, 'view' => $view, 'credit' => CREDIT, 'license' => LICENSE];
        savePhotosJs($photos);
    }
    updateManifest($id, $view, $src, $index[$id]);

    respond(200, 'ok', 'Published as ' . $target . '.', ['file' => $target, 'src' => $src]);
}

if ($action === 'discard') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, 'error', 'POST required.');
    $file = safeInboxName((string)($_POST['file'] ?? ''));
    if (!$file) respond(400, 'error', 'Bad filename.');
    @unlink(INBOX_DIR . DIRECTORY_SEPARATOR . $file);
    @unlink(INBOX_DIR . DIRECTORY_SEPARATOR . pathinfo($file, PATHINFO_FILENAME) . '.json');
    respond(200, 'ok', 'Discarded.');
}

respond(400, 'error', 'Unknown action.');
