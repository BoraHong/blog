import { h } from "preact"
import { resolveRelative } from "@quartz-community/utils"

const weekdays = ["일", "월", "화", "수", "목", "금", "토"]

const defaultOptions = {
  folder: "Diary",
  title: "일기 달력",
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ")
}

function pad(value) {
  return String(value).padStart(2, "0")
}

function dateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function normalizeDate(value) {
  if (value == null || value === "") return undefined

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateKey(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  const text = String(value).trim()
  const dateOnly = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return dateKey(Number(year), Number(month), Number(day))
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return dateKey(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }

  return undefined
}

function normalizeFolder(folder) {
  return String(folder ?? "Diary").replace(/^\/+|\/+$/g, "").toLowerCase()
}

function getTitle(page) {
  const title = page.frontmatter?.title
  if (title != null && String(title).trim() !== "") return String(title)
  return String(page.slug ?? "Untitled").split("/").at(-1) ?? "Untitled"
}

function getDiaryEntries(allFiles, currentSlug, opts) {
  const folder = normalizeFolder(opts.folder)
  return allFiles
    .filter((page) => {
      const slug = String(page.slug ?? "").toLowerCase()
      return slug.startsWith(`${folder}/`) && page.frontmatter?.date != null
    })
    .map((page) => {
      const date = normalizeDate(page.frontmatter?.date)
      if (!date || !page.slug) return undefined
      return {
        date,
        title: getTitle(page),
        href: resolveRelative(currentSlug, page.slug),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko-KR"))
}

function groupByDate(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.date] ??= []
    acc[entry.date].push({
      title: entry.title,
      href: entry.href,
    })
    return acc
  }, {})
}

function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split("-")
  return `${year}년 ${Number(month)}월`
}

function formatDate(date) {
  return date.replaceAll("-", ".")
}

function renderMonthGrid(yearMonth, selectedDate, grouped) {
  const [year, month] = yearMonth.split("-").map(Number)
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = weekdays.map((weekday) =>
    h("div", { class: "diary-calendar-weekday" }, weekday),
  )

  for (let i = 0; i < firstDay; i++) {
    cells.push(h("div", { class: "diary-calendar-day is-empty", "aria-hidden": "true" }))
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateKey(year, month, day)
    const count = grouped[date]?.length ?? 0
    cells.push(
      h(
        "button",
        {
          type: "button",
          class: classNames(
            "diary-calendar-day",
            count > 0 && "has-entry",
            date === selectedDate && "is-selected",
          ),
          "data-date": date,
          "aria-pressed": date === selectedDate ? "true" : "false",
          title: count > 0 ? `${formatDate(date)} 일기 ${count}개` : formatDate(date),
        },
        h("span", { class: "diary-calendar-day-number" }, day),
        count > 0 ? h("span", { class: "diary-calendar-day-count" }, count) : null,
      ),
    )
  }

  return cells
}

function renderResultList(selectedDate, grouped) {
  const pages = grouped[selectedDate] ?? []
  return h(
    "div",
    { class: "diary-calendar-results", "aria-live": "polite" },
    h(
      "p",
      { class: "diary-calendar-status" },
      pages.length > 0
        ? `${formatDate(selectedDate)} · ${pages.length}개의 일기`
        : `${formatDate(selectedDate)} · 작성된 일기가 없어요`,
    ),
    pages.length > 0
      ? h(
          "ul",
          { class: "diary-calendar-result-list" },
          pages.map((page) =>
            h(
              "li",
              { class: "diary-calendar-result-item" },
              h("a", { class: "internal internal-link", href: page.href }, page.title),
            ),
          ),
        )
      : h("p", { class: "diary-calendar-empty" }, "선택한 날짜에 작성된 일기가 없어요."),
  )
}

const script = `
function initDiaryCalendars() {
  document.querySelectorAll("[data-diary-calendar]").forEach(function(root) {
    if (root.dataset.diaryCalendarReady === "true") return;
    root.dataset.diaryCalendarReady = "true";

    var dataScript = root.querySelector('script[type="application/json"]');
    if (!dataScript) return;

    var data;
    try {
      data = JSON.parse(dataScript.textContent || "{}");
    } catch {
      return;
    }

    var grouped = data.dates || {};
    var selectedDate = root.dataset.selectedDate || data.latestDate;
    var yearMonth = root.dataset.month || (selectedDate ? selectedDate.slice(0, 7) : "");
    var grid = root.querySelector(".diary-calendar-grid");
    var monthLabel = root.querySelector(".diary-calendar-month-label");
    var results = root.querySelector(".diary-calendar-results");
    var prevButton = root.querySelector('[data-calendar-nav="prev"]');
    var nextButton = root.querySelector('[data-calendar-nav="next"]');
    var weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    function pad(value) {
      return String(value).padStart(2, "0");
    }

    function formatDate(date) {
      return date.replaceAll("-", ".");
    }

    function formatMonth(value) {
      var parts = value.split("-");
      return parts[0] + "년 " + Number(parts[1]) + "월";
    }

    function getMonthDate(year, month, day) {
      return year + "-" + pad(month) + "-" + pad(day);
    }

    function clear(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    function renderGrid() {
      if (!grid || !yearMonth) return;
      clear(grid);
      monthLabel.textContent = formatMonth(yearMonth);

      weekdays.forEach(function(weekday) {
        var label = document.createElement("div");
        label.className = "diary-calendar-weekday";
        label.textContent = weekday;
        grid.appendChild(label);
      });

      var parts = yearMonth.split("-").map(Number);
      var year = parts[0];
      var month = parts[1];
      var firstDay = new Date(year, month - 1, 1).getDay();
      var daysInMonth = new Date(year, month, 0).getDate();

      for (var i = 0; i < firstDay; i++) {
        var empty = document.createElement("div");
        empty.className = "diary-calendar-day is-empty";
        empty.setAttribute("aria-hidden", "true");
        grid.appendChild(empty);
      }

      for (var day = 1; day <= daysInMonth; day++) {
        var date = getMonthDate(year, month, day);
        var pages = grouped[date] || [];
        var button = document.createElement("button");
        button.type = "button";
        button.className = "diary-calendar-day" + (pages.length > 0 ? " has-entry" : "") + (date === selectedDate ? " is-selected" : "");
        button.dataset.date = date;
        button.setAttribute("aria-pressed", date === selectedDate ? "true" : "false");
        button.title = pages.length > 0 ? formatDate(date) + " 일기 " + pages.length + "개" : formatDate(date);

        var number = document.createElement("span");
        number.className = "diary-calendar-day-number";
        number.textContent = String(day);
        button.appendChild(number);

        if (pages.length > 0) {
          var count = document.createElement("span");
          count.className = "diary-calendar-day-count";
          count.textContent = String(pages.length);
          button.appendChild(count);
        }

        button.addEventListener("click", function(event) {
          selectedDate = event.currentTarget.dataset.date;
          root.dataset.selectedDate = selectedDate;
          renderGrid();
          renderResults();
        });

        grid.appendChild(button);
      }
    }

    function renderResults() {
      if (!results || !selectedDate) return;
      clear(results);
      var pages = grouped[selectedDate] || [];
      var status = document.createElement("p");
      status.className = "diary-calendar-status";
      status.textContent = pages.length > 0
        ? formatDate(selectedDate) + " · " + pages.length + "개의 일기"
        : formatDate(selectedDate) + " · 작성된 일기가 없어요";
      results.appendChild(status);

      if (pages.length === 0) {
        var empty = document.createElement("p");
        empty.className = "diary-calendar-empty";
        empty.textContent = "선택한 날짜에 작성된 일기가 없어요.";
        results.appendChild(empty);
        return;
      }

      var list = document.createElement("ul");
      list.className = "diary-calendar-result-list";
      pages.forEach(function(page) {
        var item = document.createElement("li");
        item.className = "diary-calendar-result-item";
        var link = document.createElement("a");
        link.className = "internal internal-link";
        link.href = page.href;
        link.textContent = page.title;
        item.appendChild(link);
        list.appendChild(item);
      });
      results.appendChild(list);
    }

    function moveMonth(amount) {
      if (!yearMonth) return;
      var parts = yearMonth.split("-").map(Number);
      var date = new Date(parts[0], parts[1] - 1 + amount, 1);
      yearMonth = date.getFullYear() + "-" + pad(date.getMonth() + 1);
      root.dataset.month = yearMonth;
      renderGrid();
    }

    prevButton?.addEventListener("click", function() {
      moveMonth(-1);
    });
    nextButton?.addEventListener("click", function() {
      moveMonth(1);
    });

    renderGrid();
    renderResults();
  });
}

document.addEventListener("nav", initDiaryCalendars);
initDiaryCalendars();
`

const css = `
.diary-calendar {
  margin: 1.25rem 0;
  padding: 0.75rem;
  max-width: 24rem;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  background: var(--light);
}

.diary-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.diary-calendar h2 {
  margin: 0;
  font-size: 1rem;
}

.diary-calendar-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.diary-calendar-month-label {
  min-width: 6.5rem;
  text-align: center;
  font-family: var(--headerFont);
  font-weight: 700;
  font-size: 0.9rem;
}

.diary-calendar-nav button,
.diary-calendar-day {
  border: 1px solid var(--lightgray);
  background: color-mix(in srgb, var(--light) 88%, var(--lightgray));
  color: var(--dark);
  cursor: pointer;
}

.diary-calendar-nav button {
  inline-size: 1.65rem;
  block-size: 1.65rem;
  border-radius: 999px;
  font-size: 0.95rem;
  line-height: 1;
}

.diary-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 2.35rem);
  justify-content: start;
  gap: 0.25rem;
}

.diary-calendar-weekday {
  color: var(--gray);
  font-size: 0.72rem;
  text-align: center;
}

.diary-calendar-day {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.35rem;
  block-size: 2.35rem;
  border-radius: 6px;
  font: inherit;
  font-size: 0.82rem;
}

.diary-calendar-day.is-empty {
  border-color: transparent;
  background: transparent;
  cursor: default;
}

.diary-calendar-day.has-entry {
  border-color: var(--tertiary);
  color: var(--secondary);
  font-weight: 700;
}

.diary-calendar-day.is-selected {
  border-color: var(--secondary);
  background: var(--secondary);
  color: var(--light);
}

.diary-calendar-day-count {
  position: absolute;
  inset-block-end: 0.12rem;
  inset-inline-end: 0.15rem;
  min-inline-size: 0.85rem;
  padding: 0 0.15rem;
  border-radius: 999px;
  background: var(--tertiary);
  color: var(--light);
  font-size: 0.55rem;
  line-height: 0.85rem;
}

.diary-calendar-day.is-selected .diary-calendar-day-count {
  background: var(--light);
  color: var(--secondary);
}

.diary-calendar-results {
  margin-top: 0.7rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--lightgray);
}

.diary-calendar-status {
  margin: 0 0 0.35rem;
  color: var(--gray);
  font-size: 0.82rem;
}

.diary-calendar-result-list {
  margin: 0;
  padding-inline-start: 1rem;
  font-size: 0.9rem;
}

.diary-calendar-result-item + .diary-calendar-result-item {
  margin-top: 0.25rem;
}

.diary-calendar-empty {
  margin: 0;
  color: var(--gray);
  font-size: 0.9rem;
}

@media all and (max-width: 600px) {
  .diary-calendar {
    padding: 0.65rem;
    max-width: none;
  }

  .diary-calendar-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .diary-calendar-nav {
    width: 100%;
    justify-content: space-between;
  }

  .diary-calendar-month-label {
    min-width: auto;
  }

  .diary-calendar-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .diary-calendar-day {
    inline-size: 100%;
    block-size: auto;
    aspect-ratio: 1;
  }
}
`

export const DiaryCalendar = (userOptions = {}) => {
  const opts = { ...defaultOptions, ...userOptions }

  const Component = ({ allFiles, fileData, displayClass }) => {
    if (fileData.slug !== "index") return null

    const entries = getDiaryEntries(allFiles, fileData.slug, opts)
    if (entries.length === 0) return null

    const grouped = groupByDate(entries)
    const latestDate = entries[0].date
    const initialMonth = latestDate.slice(0, 7)
    const data = {
      latestDate,
      dates: grouped,
    }

    return h(
      "section",
      {
        class: classNames(displayClass, "diary-calendar"),
        "data-diary-calendar": "",
        "data-month": initialMonth,
        "data-selected-date": latestDate,
      },
      h(
        "div",
        { class: "diary-calendar-header" },
        h("h2", null, opts.title),
        h(
          "div",
          { class: "diary-calendar-nav", "aria-label": "달력 월 이동" },
          h("button", { type: "button", "data-calendar-nav": "prev", "aria-label": "이전 달" }, "‹"),
          h("span", { class: "diary-calendar-month-label" }, formatMonth(initialMonth)),
          h("button", { type: "button", "data-calendar-nav": "next", "aria-label": "다음 달" }, "›"),
        ),
      ),
      h("div", { class: "diary-calendar-grid" }, renderMonthGrid(initialMonth, latestDate, grouped)),
      renderResultList(latestDate, grouped),
      h("script", {
        type: "application/json",
        dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
      }),
    )
  }

  Component.css = css
  Component.afterDOMLoaded = script
  return Component
}
