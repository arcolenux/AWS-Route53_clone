import { DNSRecord, HostedZone, CreateRecordData } from "./api";

/**
 * Format a list of DNS records as a standard BIND zone file format.
 */
export function exportToBind(zone: HostedZone, records: DNSRecord[]): string {
  const origin = zone.name.endsWith(".") ? zone.name : `${zone.name}.`;
  const lines: string[] = [
    `; BIND Zone File for ${zone.name}`,
    `; Exported from AWS Route53 Clone at ${new Date().toISOString()}`,
    `; Hosted Zone ID: ${zone.id}`,
    `; Type: ${zone.private ? "Private" : "Public"}`,
    "",
    `$ORIGIN ${origin}`,
    `$TTL 300`,
    "",
  ];

  for (const r of records) {
    const recordName = r.name || "@";
    const commentSuffix = r.comment ? ` ; ${r.comment}` : "";
    for (const val of r.values) {
      lines.push(`${recordName.padEnd(24)} ${String(r.ttl).padEnd(8)} IN  ${r.type.padEnd(8)} ${val}${commentSuffix}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a hosted zone and its records as JSON.
 */
export function exportToJson(zone: HostedZone, records: DNSRecord[]): string {
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      zone: {
        id: zone.id,
        name: zone.name,
        private: zone.private,
        description: zone.description,
        created_at: zone.created_at,
      },
      records: records.map((r) => ({
        name: r.name,
        type: r.type,
        ttl: r.ttl,
        values: r.values,
        comment: r.comment,
      })),
    },
    null,
    2
  );
}

/**
 * Trigger browser file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse BIND zone text or JSON records into CreateRecordData items.
 */
export function parseImportData(
  text: string,
  zoneName: string
): { records: CreateRecordData[]; errors: string[] } {
  const trimmed = text.trim();
  const errors: string[] = [];

  // If JSON format
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawList = Array.isArray(parsed) ? parsed : (parsed.records || []);
      if (!Array.isArray(rawList)) {
        return { records: [], errors: ["JSON does not contain a valid records array"] };
      }
      const records: CreateRecordData[] = [];
      for (const item of rawList) {
        if (!item.type || !item.values || !Array.isArray(item.values) || item.values.length === 0) {
          errors.push(`Invalid record format: ${JSON.stringify(item)}`);
          continue;
        }
        records.push({
          name: item.name || "@",
          type: item.type.toUpperCase(),
          ttl: typeof item.ttl === "number" ? item.ttl : 300,
          values: item.values.map(String),
          comment: item.comment || undefined,
        });
      }
      return { records, errors };
    } catch (e: any) {
      errors.push(`JSON parse error: ${e.message}`);
    }
  }

  // Otherwise parse as BIND Zone format
  const validTypes = new Set(["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]);
  const lines = trimmed.split("\n");
  let defaultTtl = 300;
  let origin = zoneName;

  // Group by (name, type, ttl)
  const grouped: Map<string, CreateRecordData> = new Map();

  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx].trim();
    // remove comments
    const commentIdx = line.indexOf(";");
    let comment = "";
    if (commentIdx >= 0) {
      comment = line.substring(commentIdx + 1).trim();
      line = line.substring(0, commentIdx).trim();
    }
    if (!line) continue;

    if (line.toUpperCase().startsWith("$ORIGIN")) {
      const parts = line.split(/\s+/);
      if (parts[1]) origin = parts[1].replace(/\.$/, "");
      continue;
    }
    if (line.toUpperCase().startsWith("$TTL")) {
      const parts = line.split(/\s+/);
      if (parts[1] && !isNaN(Number(parts[1]))) defaultTtl = Number(parts[1]);
      continue;
    }

    // Split tokens
    const tokens = line.split(/\s+/);
    if (tokens.length < 3) {
      errors.push(`Line ${idx + 1}: Not enough fields -> '${line}'`);
      continue;
    }

    let name = tokens[0];
    let tokenIndex = 1;
    let ttl = defaultTtl;

    // Check if next token is TTL number
    if (/^\d+$/.test(tokens[tokenIndex])) {
      ttl = parseInt(tokens[tokenIndex], 10);
      tokenIndex++;
    }

    // Check if next token is class (IN, CH, etc.)
    if (tokens[tokenIndex] && ["IN", "CH", "HS"].includes(tokens[tokenIndex].toUpperCase())) {
      tokenIndex++;
    }

    // If TTL wasn't before IN, check if it's after IN
    if (tokens[tokenIndex] && /^\d+$/.test(tokens[tokenIndex])) {
      ttl = parseInt(tokens[tokenIndex], 10);
      tokenIndex++;
    }

    const type = (tokens[tokenIndex] || "").toUpperCase();
    tokenIndex++;

    if (!validTypes.has(type)) {
      errors.push(`Line ${idx + 1}: Unsupported DNS record type '${type}'`);
      continue;
    }

    const val = tokens.slice(tokenIndex).join(" ");
    if (!val) {
      errors.push(`Line ${idx + 1}: Missing record value`);
      continue;
    }

    const key = `${name}|${type}|${ttl}`;
    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.values.push(val);
      if (comment && !existing.comment) existing.comment = comment;
    } else {
      grouped.set(key, {
        name,
        type,
        ttl,
        values: [val],
        comment: comment || undefined,
      });
    }
  }

  return { records: Array.from(grouped.values()), errors };
}
