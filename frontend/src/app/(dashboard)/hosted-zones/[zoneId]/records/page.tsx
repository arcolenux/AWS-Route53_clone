"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hostedZonesApi, recordsApi, DNSRecord, HostedZone, CreateRecordData } from "@/lib/api";
import { exportToBind, exportToJson, downloadFile, parseImportData } from "@/lib/dns-utils";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import LoadingSpinner, { EmptyState } from "@/components/LoadingSpinner";

const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"] as const;
type RecordType = (typeof RECORD_TYPES)[number];

const TYPE_PLACEHOLDERS: Record<RecordType, string> = {
  A: "192.0.2.1",
  AAAA: "2001:db8::1",
  CNAME: "example.com",
  TXT: "v=spf1 include:example.com ~all",
  MX: "10 mail.example.com",
  NS: "ns1.example.com",
  PTR: "example.com",
  SRV: "10 20 443 server.example.com",
  CAA: '0 issue "letsencrypt.org"',
};

const TYPE_HINTS: Record<RecordType, string> = {
  A: "IPv4 address (e.g., 192.0.2.1)",
  AAAA: "IPv6 address (e.g., 2001:db8::1)",
  CNAME: "Canonical name (e.g., example.com)",
  TXT: "Text value — wrap in quotes if needed",
  MX: "Priority and mail server (e.g., 10 mail.example.com)",
  NS: "Name server hostname (e.g., ns1.example.com)",
  PTR: "Domain name for reverse lookup",
  SRV: "Priority Weight Port Target (e.g., 10 20 443 server.example.com)",
  CAA: 'Flags Tag Value (e.g., 0 issue "letsencrypt.org")',
};

interface RecordFormState {
  name: string;
  type: RecordType;
  ttl: string;
  values: string;
  comment: string;
}

function defaultForm(): RecordFormState {
  return { name: "", type: "A", ttl: "300", values: "", comment: "" };
}

function recordToForm(r: DNSRecord): RecordFormState {
  return {
    name: r.name,
    type: r.type as RecordType,
    ttl: String(r.ttl),
    values: r.values.join("\n"),
    comment: r.comment ?? "",
  };
}

export default function RecordsPage() {
  const params = useParams<{ zoneId: string }>();
  const zoneId = params.zoneId;
  const { addToast } = useToast();

  // Zone
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [zoneLoading, setZoneLoading] = useState(true);

  // Records list
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create/Edit
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DNSRecord | null>(null);
  const [formData, setFormData] = useState<RecordFormState>(defaultForm());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteRecord, setDeleteRecord] = useState<DNSRecord | null>(null);
  const [deleteBulkOpen, setDeleteBulkOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Keyboard Shortcuts Modal
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Load zone
  useEffect(() => {
    setZoneLoading(true);
    hostedZonesApi
      .get(zoneId)
      .then(setZone)
      .catch(() => addToast("error", "Failed to load hosted zone"))
      .finally(() => setZoneLoading(false));
  }, [zoneId, addToast]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recordsApi.list(zoneId, {
        search: search || undefined,
        type: typeFilter || undefined,
        page,
        page_size: pageSize,
      });
      setRecords(data.items);
      setTotal(data.total);
      setSelected(new Set());
    } catch (err: unknown) {
      addToast("error", "Failed to load records", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [zoneId, search, typeFilter, page, pageSize, addToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Global Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "?") {
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("records-search")?.focus();
      } else if (e.key === "c" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openCreate();
      } else if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fetchRecords();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchRecords]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // Open create
  const openCreate = () => {
    setEditRecord(null);
    setFormData(defaultForm());
    setFormError(null);
    setFormOpen(true);
  };

  // Open edit
  const openEdit = (r: DNSRecord) => {
    setEditRecord(r);
    setFormData(recordToForm(r));
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const values = formData.values
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    if (values.length === 0) {
      setFormError("At least one value is required");
      setFormLoading(false);
      return;
    }

    const ttl = parseInt(formData.ttl, 10);
    if (isNaN(ttl) || ttl < 0) {
      setFormError("TTL must be a non-negative number");
      setFormLoading(false);
      return;
    }

    try {
      if (editRecord) {
        await recordsApi.update(zoneId, editRecord.id, {
          name: formData.name.trim(),
          ttl,
          values,
          comment: formData.comment.trim() || undefined,
        });
        addToast("success", "Record updated");
      } else {
        const payload: CreateRecordData = {
          name: formData.name.trim(),
          type: formData.type,
          ttl,
          values,
          comment: formData.comment.trim() || undefined,
        };
        await recordsApi.create(zoneId, payload);
        addToast("success", "Record created");
      }
      setFormOpen(false);
      fetchRecords();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save record");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete single
  const handleDeleteConfirm = async () => {
    if (!deleteRecord) return;
    setDeleteLoading(true);
    try {
      await recordsApi.delete(zoneId, deleteRecord.id);
      setDeleteRecord(null);
      addToast("success", "Record deleted");
      fetchRecords();
    } catch (err: unknown) {
      addToast("error", "Failed to delete record", err instanceof Error ? err.message : undefined);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Delete bulk
  const handleDeleteBulk = async () => {
    setDeleteLoading(true);
    const ids = Array.from(selected);
    let failed = 0;
    for (const id of ids) {
      try {
        await recordsApi.delete(zoneId, id);
      } catch {
        failed++;
      }
    }
    setDeleteLoading(false);
    setDeleteBulkOpen(false);
    if (failed > 0) {
      addToast("error", `${failed} record(s) could not be deleted`);
    } else {
      addToast("success", `${ids.length} record(s) deleted`);
    }
    fetchRecords();
  };

  // Export
  const handleExportBind = async () => {
    if (!zone) return;
    try {
      // Fetch all records without pagination
      const allData = await recordsApi.list(zoneId, { page: 1, page_size: 100 });
      const bindContent = exportToBind(zone, allData.items);
      downloadFile(bindContent, `${zone.name}.zone`, "text/plain");
      addToast("success", "Exported BIND zone file", `${zone.name}.zone`);
    } catch (err: any) {
      addToast("error", "Export failed", err.message);
    }
  };

  const handleExportJson = async () => {
    if (!zone) return;
    try {
      const allData = await recordsApi.list(zoneId, { page: 1, page_size: 100 });
      const jsonContent = exportToJson(zone, allData.items);
      downloadFile(jsonContent, `${zone.name}.json`, "application/json");
      addToast("success", "Exported zone JSON file", `${zone.name}.json`);
    } catch (err: any) {
      addToast("error", "Export failed", err.message);
    }
  };

  // Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone || !importText.trim()) return;
    setImportLoading(true);
    setImportErrors([]);

    const { records: parsedRecords, errors } = parseImportData(importText, zone.name);
    if (errors.length > 0) {
      setImportErrors(errors);
      if (parsedRecords.length === 0) {
        setImportLoading(false);
        return;
      }
    }

    let createdCount = 0;
    const createErrors: string[] = [];

    for (const rec of parsedRecords) {
      try {
        await recordsApi.create(zoneId, rec);
        createdCount++;
      } catch (err: any) {
        createErrors.push(`${rec.name} (${rec.type}): ${err.message}`);
      }
    }

    setImportLoading(false);
    if (createErrors.length > 0) {
      setImportErrors((prev) => [...prev, ...createErrors]);
    }
    if (createdCount > 0) {
      addToast("success", `Successfully imported ${createdCount} DNS record(s)`);
      setImportOpen(false);
      setImportText("");
      fetchRecords();
    }
  };

  // Selection
  const allSelected = records.length > 0 && records.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (zoneLoading) {
    return <LoadingSpinner fullPage message="Loading hosted zone…" />;
  }

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Breadcrumb */}
      <nav className="aws-breadcrumb">
        <a href="/dashboard">Route 53</a>
        <span className="sep">›</span>
        <a href="/hosted-zones">Hosted zones</a>
        <span className="sep">›</span>
        <span>{zone?.name ?? zoneId}</span>
      </nav>

      {/* Zone info banner */}
      {zone && (
        <div
          className="aws-card mb-4"
          style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
        >
          <div>
            <span style={{ fontSize: 12, color: "#545b64", display: "block" }}>Hosted zone name</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{zone.name}</span>
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#545b64", display: "block" }}>Type</span>
            {zone.private ? (
              <span className="badge-private">Private</span>
            ) : (
              <span className="badge-public">Public</span>
            )}
          </div>
          <div>
            <span style={{ fontSize: 12, color: "#545b64", display: "block" }}>Hosted zone ID</span>
            <code style={{ fontSize: 12, color: "#16191f", background: "#f2f3f3", padding: "2px 6px", borderRadius: 3 }}>
              {zone.id}
            </code>
          </div>
          {zone.description && (
            <div>
              <span style={{ fontSize: 12, color: "#545b64", display: "block" }}>Description</span>
              <span style={{ fontSize: 13 }}>{zone.description}</span>
            </div>
          )}
        </div>
      )}

      {/* Page header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Records</h1>
          <p className="aws-page-subtitle">
            DNS records for {zone?.name}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
            ⌨ Shortcuts
          </button>
          <button className="btn-secondary" onClick={() => setImportOpen(true)} title="Import BIND or JSON">
            ⬆ Import BIND
          </button>
          <div style={{ position: "relative", display: "inline-block" }}>
            <button className="btn-secondary" onClick={handleExportBind} title="Export as BIND zone format">
              ⬇ Export BIND
            </button>
          </div>
          <button className="btn-secondary" onClick={handleExportJson} title="Export as JSON format">
            ⬇ Export JSON
          </button>
          <button className="btn-secondary" onClick={fetchRecords} title="Refresh (r)">
            ↻ Refresh
          </button>
          <button className="btn-primary" onClick={openCreate} id="create-record-btn" title="Create record (c)">
            + Create record
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="aws-card">
        {/* Toolbar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #d5dbdb",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <input
                type="text"
                className="aws-input"
                placeholder="Search records… (press /)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: 32 }}
                id="records-search"
              />
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#aab7b8",
                  fontSize: 14,
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab7b8", padding: 0 }}
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="btn-secondary">Search</button>
          </form>

          {/* Type filter */}
          <select
            className="aws-select"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ width: "auto" }}
            id="type-filter"
          >
            <option value="">All types</option>
            {RECORD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {selected.size > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#545b64" }}>{selected.size} selected</span>
              <button className="btn-danger" onClick={() => setDeleteBulkOpen(true)} id="bulk-delete-records-btn">
                Delete ({selected.size})
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 40 }}>
            <LoadingSpinner fullPage />
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            title={search || typeFilter ? "No records match your filters" : "No DNS records"}
            description={
              search || typeFilter
                ? "Try different search terms or clear the type filter."
                : "No DNS records exist in this hosted zone. Create records to route traffic."
            }
            action={
              !search && !typeFilter ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={openCreate}>
                    + Create record
                  </button>
                  <button className="btn-secondary" onClick={() => setImportOpen(true)}>
                    ⬆ Import BIND file
                  </button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => { handleClearSearch(); setTypeFilter(""); }}>
                  Clear filters
                </button>
              )
            }
            icon={<span style={{ fontSize: 40 }}>⬡</span>}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="aws-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="aws-checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th>Record name</th>
                  <th>Type</th>
                  <th>TTL (seconds)</th>
                  <th>Value/Route traffic to</th>
                  <th>Comment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? "selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        className="aws-checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        aria-label={`Select ${r.name}`}
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, fontFamily: "monospace", fontSize: 13 }}>{r.name}</span>
                    </td>
                    <td>
                      <span className="badge-record-type">{r.type}</span>
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", color: "#545b64" }}>
                      {r.ttl}
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      {r.values.map((v, i) => (
                        <div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#16191f", wordBreak: "break-all" }}>
                          {v}
                        </div>
                      ))}
                    </td>
                    <td style={{ color: "#545b64", fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.comment ?? <span style={{ color: "#aab7b8" }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-link" onClick={() => openEdit(r)}>Edit</button>
                        <span style={{ color: "#d5dbdb" }}>|</span>
                        <button className="btn-link" style={{ color: "#d13212" }} onClick={() => setDeleteRecord(r)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {/* ---- Modals ---- */}

      {/* Create/Edit Record Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editRecord ? "Edit record" : "Create record"}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFormOpen(false)} disabled={formLoading}>
              Cancel
            </button>
            <button
              className="btn-primary"
              form="record-form"
              type="submit"
              disabled={formLoading}
              id="save-record-btn"
            >
              {formLoading ? "Saving…" : editRecord ? "Save changes" : "Create record"}
            </button>
          </>
        }
      >
        <form id="record-form" onSubmit={handleFormSubmit}>
          {formError && (
            <div className="toast-error rounded px-4 py-3 mb-4 text-sm flex gap-2">
              <span>⚠</span><span>{formError}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div className="form-group">
              <label className="aws-label" htmlFor="record-name">
                Record name <span style={{ color: "#d13212" }}>*</span>
              </label>
              <input
                id="record-name"
                type="text"
                className="aws-input"
                placeholder={zone?.name ?? ""}
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus={!editRecord}
              />
              <p className="form-hint">
                Enter a subdomain or @ for the zone apex
              </p>
            </div>

            <div className="form-group">
              <label className="aws-label" htmlFor="record-type">
                Record type <span style={{ color: "#d13212" }}>*</span>
              </label>
              <select
                id="record-type"
                className="aws-select"
                value={formData.type}
                onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value as RecordType }))}
                disabled={!!editRecord}
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {editRecord && (
                <p className="form-hint">Record type cannot be changed after creation</p>
              )}
            </div>

            <div className="form-group">
              <label className="aws-label" htmlFor="record-ttl">
                TTL (seconds) <span style={{ color: "#d13212" }}>*</span>
              </label>
              <input
                id="record-ttl"
                type="number"
                className="aws-input"
                min="0"
                max="2147483647"
                value={formData.ttl}
                onChange={(e) => setFormData((f) => ({ ...f, ttl: e.target.value }))}
                required
              />
              <p className="form-hint">
                Common: 60 (1 min), 300 (5 min), 3600 (1 hr), 86400 (1 day)
              </p>
            </div>

            <div className="form-group">
              <label className="aws-label" htmlFor="record-comment">
                Comment (optional)
              </label>
              <input
                id="record-comment"
                type="text"
                className="aws-input"
                placeholder="Optional comment"
                value={formData.comment}
                onChange={(e) => setFormData((f) => ({ ...f, comment: e.target.value }))}
                maxLength={255}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="aws-label" htmlFor="record-values">
              Value <span style={{ color: "#d13212" }}>*</span>
            </label>
            <textarea
              id="record-values"
              className="aws-input"
              placeholder={TYPE_PLACEHOLDERS[formData.type]}
              value={formData.values}
              onChange={(e) => setFormData((f) => ({ ...f, values: e.target.value }))}
              rows={4}
              required
              style={{ fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
            />
            <p className="form-hint">
              {TYPE_HINTS[formData.type]}. Enter multiple values on separate lines.
            </p>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import DNS records from BIND zone or JSON"
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(false)} disabled={importLoading}>
              Cancel
            </button>
            <button
              className="btn-primary"
              form="import-form"
              type="submit"
              disabled={importLoading || !importText.trim()}
            >
              {importLoading ? "Importing…" : "Import Records"}
            </button>
          </>
        }
      >
        <form id="import-form" onSubmit={handleImportSubmit}>
          {importErrors.length > 0 && (
            <div className="toast-error rounded px-4 py-3 mb-4 text-sm">
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Import Warnings/Errors:</div>
              <ul style={{ listStyleType: "disc", paddingLeft: 20 }}>
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label className="aws-label" htmlFor="import-content">
              BIND Zone / JSON Content
            </label>
            <textarea
              id="import-content"
              className="aws-input"
              placeholder={`; Example BIND zone:\n$TTL 300\n@       IN  A       192.0.2.1\nwww     IN  CNAME   example.com.\nmail    IN  MX  10  mail.example.com.\n@       IN  TXT     "v=spf1 ~all"`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              required
              style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            />
            <p className="form-hint">
              Paste standard BIND zone file contents or exported JSON records.
            </p>
          </div>
        </form>
      </Modal>

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <Modal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        title="Keyboard Shortcuts"
        size="sm"
        footer={
          <button className="btn-primary" onClick={() => setShortcutsOpen(false)}>
            Close
          </button>
        }
      >
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eaeded" }}>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>/</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Focus search bar</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eaeded" }}>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>c</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Open Create Record modal</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eaeded" }}>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>r</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Refresh record list</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eaeded" }}>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>Esc</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Close active modal</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>?</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Open this help dialog</td>
            </tr>
          </tbody>
        </table>
      </Modal>

      {/* Delete Single Modal */}
      <Modal
        open={!!deleteRecord}
        onClose={() => setDeleteRecord(null)}
        title="Delete record"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteRecord(null)} disabled={deleteLoading}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleDeleteConfirm} disabled={deleteLoading} id="confirm-delete-record-btn">
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, color: "#d13212", flexShrink: 0 }}>⚠</div>
          <div>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Delete <strong>{deleteRecord?.name}</strong> ({deleteRecord?.type})?
            </p>
            <p style={{ fontSize: 13, color: "#545b64" }}>
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Bulk Modal */}
      <Modal
        open={deleteBulkOpen}
        onClose={() => setDeleteBulkOpen(false)}
        title={`Delete ${selected.size} record(s)`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteBulkOpen(false)} disabled={deleteLoading}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleDeleteBulk} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : `Delete ${selected.size} record(s)`}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, color: "#d13212", flexShrink: 0 }}>⚠</div>
          <div>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Delete <strong>{selected.size}</strong> DNS record(s)?
            </p>
            <p style={{ fontSize: 13, color: "#545b64" }}>This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
