/** Calendar invites for a planned watch night. Times are UTC so every calendar shows them in its own zone. */

export interface Plan {
  title: string;
  start: Date;
  minutes: number;
  url: string;
  details: string;
}

function utcStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(plan: Plan) {
  const end = new Date(plan.start.getTime() + plan.minutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.title,
    dates: `${utcStamp(plan.start)}/${utcStamp(end)}`,
    details: `${plan.details}\n\n${plan.url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** iCalendar text escaping: backslash, semicolon, comma and newline. */
function escape(text: string) {
  return text.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

/** An .ics file with a reminder 15 minutes before, for Apple Calendar, Outlook and the rest. */
export function icsFile(plan: Plan, uid: string) {
  const end = new Date(plan.start.getTime() + plan.minutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tandem//Watch night//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@tandem`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(plan.start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escape(plan.title)}`,
    `DESCRIPTION:${escape(`${plan.details}\n\n${plan.url}`)}`,
    `URL:${plan.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(plan.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(plan: Plan, uid: string) {
  const blob = new Blob([icsFile(plan, uid)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tandem-watch-night.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** "9:00 PM, Fri 17 Oct", in the given zone (or the viewer's own). */
export function formatWhen(d: Date, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/** "2 d 3 h", "3 h 12 min", "4 min", for a countdown. */
export function formatCountdown(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days} d ${hours} h`;
  if (hours) return `${hours} h ${mins} min`;
  return `${mins} min`;
}
