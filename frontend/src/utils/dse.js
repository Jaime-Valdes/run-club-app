// Until a roster has been imported nobody has a status, and labeling everyone
// "Not in DSE" would be false, so the cards stay hidden.
export function hasDseRoster(members) {
  return members.some((m) => m.dse_status);
}

const EMAIL = /\S+@\S+\.\S+/;

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Reads a select-all copy of the DSE roster page, which includes the site's menus
// around the table. Returns null if there is no roster table in the text.
export function parseDseRoster(text) {
  const lines = text.split(/\r?\n/);
  const columnsOf = (line) => line.split("\t").map((cell) => cell.trim().toLowerCase());
  const headerIndex = lines.findIndex((line) => {
    const columns = columnsOf(line);
    return columns.includes("name") && columns.includes("email") && columns.includes("status");
  });
  if (headerIndex < 0) return null;

  const columns = columnsOf(lines[headerIndex]);
  const nameColumn = columns.indexOf("name");
  const emailColumn = columns.indexOf("email");
  const statusColumn = columns.indexOf("status");

  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const cells = lines[i].split("\t");
    const emailAt = cells.findIndex((cell) => EMAIL.test(cell));
    if (emailAt < 0) continue;
    const status = cells[emailAt + statusColumn - emailColumn]?.trim();
    if (!status) continue;
    // A cell with a line break before the email splits one row across two lines.
    const nameCells = emailAt === emailColumn ? cells : lines[i - 1].split("\t");
    rows.push({
      name: (nameCells[nameColumn] || "").trim(),
      email: cells[emailAt].trim().toLowerCase(),
      status,
    });
  }
  return rows;
}

// Roster emails can be aliases (first.last@nyu.edu) while the app stores
// netid@nyu.edu, so also check emails saved by earlier manual links, then fall
// back to an exact name that only one member has.
export function matchDseRoster(rows, members, rejectedEmails = new Set()) {
  const byEmail = new Map();
  members.forEach((m) => {
    [m.email, m.dse_email].forEach((email) => {
      if (email) byEmail.set(email.toLowerCase(), m);
    });
  });
  const byName = new Map();
  members.forEach((m) => {
    const key = normalizeName(m.name);
    byName.set(key, byName.has(key) ? null : m);
  });

  const statuses = {};
  const nameMatches = [];
  const unmatched = [];
  rows.forEach((row) => {
    const emailMatch = byEmail.get(row.email);
    const nameMatch = rejectedEmails.has(row.email) ? null : byName.get(normalizeName(row.name));
    const member = emailMatch || nameMatch;
    if (!member) {
      unmatched.push(row);
      return;
    }
    statuses[member.id] = row.status;
    if (!emailMatch) nameMatches.push({ ...row, member });
  });
  return { statuses, nameMatches, unmatched };
}

function nameParts(name) {
  const parts = normalizeName(name).split(" ");
  return { first: parts[0] || "", last: parts[parts.length - 1] || "" };
}

// Likely members for a roster name that had no exact match, such as Nate for Nathan.
export function suggestMembers(row, candidates) {
  const { first, last } = nameParts(row.name);
  const initialMatches = (m) => nameParts(m.name).first[0] === first[0];
  return candidates
    .filter((m) => {
      const parts = nameParts(m.name);
      return parts.last === last || (parts.first === first && parts.last[0] === last[0]);
    })
    .sort((a, b) => initialMatches(b) - initialMatches(a))
    .slice(0, 3);
}
