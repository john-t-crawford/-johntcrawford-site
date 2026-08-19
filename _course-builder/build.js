#!/usr/bin/env node
/*
 * Course builder: courses/<slug>/course.json + content/*.md  -->  learning/<slug>/*.html
 * Usage: node build.js <slug>          (build one course)
 *        node build.js --all           (build every course under courses/)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_ROOT = path.resolve(ROOT, "..");
const COURSES_DIR = path.join(ROOT, "courses");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const ICONS = JSON.parse(fs.readFileSync(path.join(ROOT, "icons.json"), "utf8"));

// ---------- tiny markdown ----------

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderMarkdown(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (line.startsWith(":::")) {
      const header = line.slice(3).trim();
      const spaceIdx = header.indexOf(" ");
      const type = spaceIdx === -1 ? header : header.slice(0, spaceIdx);
      const label = spaceIdx === -1 ? "" : header.slice(spaceIdx + 1).trim();
      i++;
      const inner = [];
      while (i < lines.length && lines[i].trim() !== ":::") { inner.push(lines[i]); i++; }
      i++; // skip closing :::
      const innerHtml = renderMarkdown(inner);
      const asText = innerHtml.replace(/^<p>([\s\S]*)<\/p>$/, "$1");

      if (type === "security") {
        out.push(`<div class="security-note">${innerHtml}</div>`);
      } else if (type === "exercise") {
        out.push(`<div class="exercise"><div class="exercise-label">${label || "Try it"}</div>${innerHtml}</div>`);
      } else if (type === "checkpoint") {
        out.push(`<div class="checkpoint"><strong>Check for understanding:</strong> ${asText}</div>`);
      } else if (type === "capstone") {
        out.push(`<div class="capstone-banner">${asText}</div>`);
      } else {
        out.push(`<div>${innerHtml}</div>`);
      }
      continue;
    }

    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3).trim())}</h2>`);
      i++;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inline(lines[i].slice(2).trim())}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith(":::") && !lines[i].startsWith("## ") && !lines[i].startsWith("- ")) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(" ").trim())}</p>`);
  }
  return out.join("\n");
}

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== "---") return { meta: {}, body: raw };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") { end = i; break; }
  }
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  for (const l of lines.slice(1, end)) {
    const m = l.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val === "true") val = true;
    else if (val === "false") val = false;
    meta[m[1]] = val;
  }
  const body = lines.slice(end + 1).join("\n");
  return { meta, body };
}

// ---------- helpers ----------

function tpl(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : ""));
}

function loadLessons(courseDir) {
  const contentDir = path.join(courseDir, "content");
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith(".md")).sort();
  return files.map(f => {
    const m = f.match(/^(\d+)-(.+)\.md$/);
    const num = m ? m[1] : "00";
    const slug = m ? m[2] : f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(contentDir, f), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const contentHtml = renderMarkdown(body.split(/\r?\n/));
    return {
      num, slug, file: `${num}-${slug}.html`,
      title: meta.title || slug,
      icon: meta.icon || "i00",
      gated: meta.gated !== false,
      capstone: meta.capstone === true,
      summary: meta.summary || "",
      contentHtml
    };
  });
}

function buildIconSymbols(lessons) {
  const used = [...new Set(lessons.map(l => l.icon))];
  return used.map(key => `<symbol id="${key}" viewBox="0 0 96 96">${ICONS[key]}</symbol>`).join("\n");
}

function lessonNumLabel(lesson) {
  return `Lesson ${lesson.num}` + (lesson.capstone ? " · Capstone" : "");
}

// ---------- build one course ----------

function buildCourse(slug) {
  const courseDir = path.join(COURSES_DIR, slug);
  const course = JSON.parse(fs.readFileSync(path.join(courseDir, "course.json"), "utf8"));
  const lessons = loadLessons(courseDir);
  const free = lessons.find(l => !l.gated);
  const gated = lessons.filter(l => l.gated);

  const outDir = path.join(SITE_ROOT, "learning", slug);
  const lessonsOutDir = path.join(outDir, "lessons");
  fs.mkdirSync(lessonsOutDir, { recursive: true });

  const canonicalBase = `https://johntcrawford.com/learning/${slug}/`;

  // ---- index.html ----
  const indexTplRaw = fs.readFileSync(path.join(TEMPLATES_DIR, "index.html"), "utf8");
  const lessonCards = lessons.map(l => {
    const href = l.gated ? `lessons/${l.file}` : "#lesson-00";
    const tag = l.gated ? `<span class="lesson-tag">🔒 Members</span>` : `<span class="lesson-tag free">● Free preview</span>`;
    return `      <a class="lesson-card${l.gated ? " locked" : ""}" href="${href}">
        <div class="lesson-icon"><svg><use href="#${l.icon}"/></svg></div>
        <div class="lesson-body">
          <div class="lesson-num">${lessonNumLabel(l)}</div>
          <div class="lesson-title">${l.title}</div>
          <div class="lesson-desc">${l.summary}</div>
          ${tag}
        </div>
      </a>`;
  }).join("\n");

  const indexHtml = tpl(indexTplRaw, {
    TITLE: course.title,
    DESCRIPTION: course.description,
    CANONICAL: canonicalBase,
    EYEBROW: course.eyebrow,
    HERO_HEADLINE: course.heroHeadline,
    HERO_SUB: course.heroSub,
    HERO_IMAGE: course.heroImage,
    HERO_IMAGE_ALT: course.heroImageAlt,
    ICON_SYMBOLS: buildIconSymbols(lessons),
    LESSON_COUNT: String(lessons.length),
    CURRICULUM_INTRO: course.curriculumIntro,
    LESSON_CARDS: lessonCards,
    LESSON00_TITLE: free ? free.title : "",
    LESSON00_SUMMARY: free ? free.summary : "",
    LESSON00_CONTENT: free ? free.contentHtml : "",
    GATE_HEADLINE: course.gateHeadline,
    GATE_BODY: course.gateBody,
    CONTACT_EMAIL: course.contactEmail,
    GATE_SUBJECT: encodeURIComponent(`${course.title} course access`)
  });
  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml);

  // ---- lesson pages ----
  const lessonTplRaw = fs.readFileSync(path.join(TEMPLATES_DIR, "lesson.html"), "utf8");
  gated.forEach((lesson, idx) => {
    const prev = idx === 0 ? { label: "Course home", href: `/learning/${slug}/` } :
      { label: `${lessonNumLabel(gated[idx - 1])} — ${gated[idx - 1].title}`, href: gated[idx - 1].file };
    const next = idx === gated.length - 1 ? { label: "Back to course home", href: `/learning/${slug}/` } :
      { label: `${lessonNumLabel(gated[idx + 1])} — ${gated[idx + 1].title}`, href: gated[idx + 1].file };

    const html = tpl(lessonTplRaw, {
      PAGE_TITLE: `${lessonNumLabel(lesson)} — ${lesson.title} | ${course.title} | John Crawford`,
      CANONICAL: `${canonicalBase}lessons/${lesson.file}`,
      ICON_KEY: lesson.icon,
      ICON_SVG: ICONS[lesson.icon],
      COURSE_SLUG: slug,
      COURSE_TITLE: course.title,
      LESSON_NUM: lessonNumLabel(lesson),
      LESSON_TITLE: lesson.title,
      CONTENT_HTML: lesson.contentHtml,
      PREV_LINK: `<a href="${prev.href}">← ${prev.label}</a>`,
      NEXT_LINK: `<a href="${next.href}">${next.label} →</a>`
    });
    fs.writeFileSync(path.join(lessonsOutDir, lesson.file), html);
  });

  console.log(`Built "${course.title}" -> learning/${slug}/  (${gated.length} gated lessons + 1 free)`);
}

// ---------- entry point ----------

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node build.js <course-slug> | --all");
  process.exit(1);
}
if (arg === "--all") {
  fs.readdirSync(COURSES_DIR).filter(d => fs.statSync(path.join(COURSES_DIR, d)).isDirectory()).forEach(buildCourse);
} else {
  buildCourse(arg);
}
