import fs from "node:fs";

const login = "Raymind2k";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required.");

const query = [
  "query ($login: String!, $from: DateTime!, $to: DateTime!) {",
  "  user(login: $login) {",
  "    contributionsCollection(from: $from, to: $to) {",
  "      contributionCalendar {",
  "        totalContributions",
  "        weeks { contributionDays { date contributionCount } }",
  "      }",
  "    }",
  "  }",
  "}"
].join("\n");

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "User-Agent": "raymind-profile-streak"
  },
  body: JSON.stringify({
    query,
    variables: {
      login,
      from: new Date(Date.now() - 364 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString()
    }
  })
});

if (!response.ok) {
  throw new Error("GitHub GraphQL returned HTTP " + response.status + ": " + await response.text());
}
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map(e => e.message).join("; "));
const user = payload.data?.user;
if (!user) throw new Error("Could not read the GitHub profile for " + login + ".");

const calendar = user.contributionsCollection.contributionCalendar;
const days = calendar.weeks.flatMap(week => week.contributionDays)
  .sort((a, b) => a.date.localeCompare(b.date));
const counts = new Map(days.map(day => [day.date, day.contributionCount]));

function dateInIndia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return part.year + "-" + part.month + "-" + part.day;
}
function addDays(key, amount) {
  const date = new Date(key + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

const today = dateInIndia();
let cursor = (counts.get(today) || 0) > 0 ? today : addDays(today, -1);
let current = 0;
while ((counts.get(cursor) || 0) > 0) {
  current++;
  cursor = addDays(cursor, -1);
}

let best = 0, run = 0;
for (const day of days) {
  if (day.contributionCount > 0) {
    run++;
    best = Math.max(best, run);
  } else {
    run = 0;
  }
}

const last30 = Array.from({ length: 30 }, (_, i) => counts.get(addDays(today, i - 29)) || 0);
const last30Total = last30.reduce((sum, n) => sum + n, 0);
const maxDay = Math.max(1, ...last30);
const milestones = [7, 14, 30, 60, 100, 180, 365, 500, 750, 1000];
const nextMilestone = milestones.find(value => value > current) || (Math.floor(current / 500) + 1) * 500;
const progress = Math.min(1, current / nextMilestone);
const circumference = 2 * Math.PI * 66;
const dashOffset = circumference * (1 - progress);
const bars = last30.map((count, i) => {
  const height = Math.max(4, Math.round(29 * count / maxDay));
  const x = 603 + i * 10;
  const y = 165 - height;
  const color = count ? (count >= maxDay * .65 ? "#41ffb1" : "#36dff5") : "#203247";
  return '<rect x="' + x + '" y="' + y + '" width="6" height="' + height + '" rx="3" fill="' + color + '"/>';
}).join("");

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="250" viewBox="0 0 960 250">',
  '<title>Raymind2K contribution momentum reactor</title>',
  '<desc>Current public contribution streak, best public streak in the past 365 days, a 30-day contribution pulse, and progress toward the next streak milestone.</desc>',
  '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1b2a"/><stop offset="1" stop-color="#111328"/></linearGradient><linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36dff5"/><stop offset="1" stop-color="#a077ff"/></linearGradient></defs>',
  '<rect x="1" y="1" width="958" height="248" rx="22" fill="url(#bg)" stroke="#25465d" stroke-width="2"/>',
  '<path d="M24 65H936" stroke="#27435a" stroke-width="1"/>',
  '<text x="34" y="42" fill="#e0eff6" font-family="ui-monospace,Consolas,monospace" font-size="17" font-weight="700" letter-spacing="1">RAYMIND2K  /  MOMENTUM REACTOR</text>',
  '<circle cx="810" cy="36" r="4" fill="#41ffb1"/>',
  '<text x="824" y="41" fill="#41ffb1" font-family="ui-monospace,Consolas,monospace" font-size="12" letter-spacing="1">AUTO-SYNC  /  6H</text>',
  '<circle cx="130" cy="151" r="69" fill="#0a1420" stroke="#203247" stroke-width="10"/>',
  '<circle cx="130" cy="151" r="69" fill="none" stroke="url(#accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '" transform="rotate(-90 130 151)"/>',
  '<text x="130" y="151" text-anchor="middle" dominant-baseline="central" fill="#f0f7fb" font-family="ui-monospace,Consolas,monospace" font-size="39" font-weight="800">' + current + '</text>',
  '<text x="130" y="231" text-anchor="middle" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="11" letter-spacing="2">CURRENT STREAK</text>',
  '<path d="M258 82V221" stroke="#27435a"/>',
  '<text x="292" y="105" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="12" letter-spacing="2">BEST RUN  /  PAST 365 DAYS</text>',
  '<text x="292" y="160" fill="#a077ff" font-family="ui-monospace,Consolas,monospace" font-size="48" font-weight="800">' + best + '<tspan fill="#8faec2" font-size="15"> DAYS</tspan></text>',
  '<text x="292" y="198" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="12">CONTRIBUTION SIGNAL</text>',
  '<text x="292" y="220" fill="#41ffb1" font-family="ui-monospace,Consolas,monospace" font-size="17" font-weight="700">' + last30Total + '<tspan fill="#8faec2" font-size="11"> EVENTS / 30 DAYS</tspan></text>',
  '<path d="M560 82V221" stroke="#27435a"/>',
  '<text x="590" y="102" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="12" letter-spacing="2">30-DAY BUILD PULSE</text>',
  '<path d="M601 170H904" stroke="#27435a"/>',
  bars,
  '<text x="590" y="198" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="11">NEXT STREAK GATE</text>',
  '<text x="904" y="198" text-anchor="end" fill="#36dff5" font-family="ui-monospace,Consolas,monospace" font-size="12" font-weight="700">' + nextMilestone + ' DAYS</text>',
  '<rect x="590" y="210" width="314" height="8" rx="4" fill="#203247"/>',
  '<rect x="590" y="210" width="' + (314 * progress).toFixed(1) + '" height="8" rx="4" fill="url(#accent)"/>',
  '<text x="590" y="237" fill="#8faec2" font-family="ui-monospace,Consolas,monospace" font-size="10">' + Math.max(0, nextMilestone - current) + ' TO GO  /  ' + Math.round(progress * 100) + '% CHARGED</text>',
  '</svg>'
].join("");

fs.writeFileSync("streak-card.svg", svg, "utf8");
console.log("Updated streak-card.svg: current " + current + " days, best " + best + " days, last 30 days " + last30Total + " contributions.");



