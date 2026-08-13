"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { hostedZonesApi, HostedZone } from "@/lib/api";
import { downloadFile } from "@/lib/dns-utils";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import LoadingSpinner, { EmptyState } from "@/components/LoadingSpinner";

export default function HostedZonesPage() {
  const { addToast } = useToast();

  // List state
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    private: false,
    description: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editZone, setEditZone] = useState<HostedZone | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteZone, setDeleteZone] = useState<HostedZone | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteBulkOpen, setDeleteBulkOpen] = useState(false);

  // Shortcuts modal
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hostedZonesApi.list({ search: search || undefined, page, page_size: pageSize });
      setZones(data.items);
      setTotal(data.total);
      setSelected(new Set());
    } catch (err: unknown) {
      addToast("error", "Failed to load hosted zones", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize, addToast]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Global Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "?") {
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("hosted-zones-search")?.focus();
      } else if (e.key === "c" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openCreate();
      } else if (e.key === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fetchZones();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchZones]);

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

  // Create
  const openCreate = () => {
    setCreateForm({ name: "", private: false, description: "" });
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      await hostedZonesApi.create({
        name: createForm.name.trim(),
        private: createForm.private,
        description: createForm.description.trim() || undefined,
      });
      setCreateOpen(false);
      addToast("success", "Hosted zone created", createForm.name.trim());
      setPage(1);
      setSearch("");
      setSearchInput("");
      fetchZones();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create zone");
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit
  const openEdit = (zone: HostedZone) => {
    setEditZone(zone);
    setEditForm({ name: zone.name, description: zone.description ?? "" });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editZone) return;
    setEditError(null);
    setEditLoading(true);
    try {
      await hostedZonesApi.update(editZone.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      setEditZone(null);
      addToast("success", "Hosted zone updated");
      fetchZones();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update zone");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete single
  const handleDeleteConfirm = async () => {
    if (!deleteZone) return;
    setDeleteLoading(true);
    try {
      await hostedZonesApi.delete(deleteZone.id);
      setDeleteZone(null);
      addToast("success", "Hosted zone deleted", deleteZone.name);
      fetchZones();
    } catch (err: unknown) {
      addToast("error", "Failed to delete zone", err instanceof Error ? err.message : undefined);
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
        await hostedZonesApi.delete(id);
      } catch {
        failed++;
      }
    }
    setDeleteLoading(false);
    setDeleteBulkOpen(false);
    if (failed > 0) {
      addToast("error", `${failed} zone(s) could not be deleted`);
    } else {
      addToast("success", `${ids.length} hosted zone(s) deleted`);
    }
    fetchZones();
  };

  // Export JSON
  const handleExportZones = async () => {
    try {
      const allData = await hostedZonesApi.list({ page: 1, page_size: 100 });
      const content = JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          zones: allData.items,
        },
        null,
        2
      );
      downloadFile(content, "route53-hosted-zones.json", "application/json");
      addToast("success", "Exported hosted zones list", "route53-hosted-zones.json");
    } catch (err: any) {
      addToast("error", "Export failed", err.message);
    }
  };

  // Selection
  const allSelected = zones.length > 0 && zones.every((z) => selected.has(z.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(zones.map((z) => z.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Breadcrumb */}
      <nav className="aws-breadcrumb">
        <a href="/dashboard">Route 53</a>
        <span className="sep">›</span>
        <span>Hosted zones</span>
      </nav>

      {/* Page header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Hosted zones</h1>
          <p className="aws-page-subtitle">
            A hosted zone is a container for records, and records contain information about how you want to route traffic.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0, flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">
            ⌨ Shortcuts
          </button>
          <button className="btn-secondary" onClick={handleExportZones} title="Export hosted zones as JSON">
            ⬇ Export JSON
          </button>
          <button
            className="btn-secondary"
            onClick={fetchZones}
            title="Refresh (r)"
          >
            ↻ Refresh
          </button>
          <button className="btn-primary" onClick={openCreate} id="create-hosted-zone-btn" title="Create hosted zone (c)">
            + Create hosted zone
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
            <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
              <input
                type="text"
                className="aws-input"
                placeholder="Search hosted zones… (press /)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: 32 }}
                id="hosted-zones-search"
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
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#aab7b8",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>

          {selected.size > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#545b64" }}>
                {selected.size} selected
              </span>
              <button
                className="btn-danger"
                onClick={() => setDeleteBulkOpen(true)}
                id="bulk-delete-btn"
              >
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
        ) : zones.length === 0 ? (
          <EmptyState
            title={search ? "No hosted zones match your search" : "No hosted zones"}
            description={
              search
                ? `No results for "${search}". Try a different search term.`
                : "You haven't created any hosted zones yet. Create one to get started."
            }
            action={
              !search ? (
                <button className="btn-primary" onClick={openCreate}>
                  + Create hosted zone
                </button>
              ) : (
                <button className="btn-secondary" onClick={handleClearSearch}>
                  Clear search
                </button>
              )
            }
            icon={<span style={{ fontSize: 40 }}>◎</span>}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="aws-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      className="aws-checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Domain name</th>
                  <th>Type</th>
                  <th>Record count</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className={selected.has(zone.id) ? "selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        className="aws-checkbox"
                        checked={selected.has(zone.id)}
                        onChange={() => toggleOne(zone.id)}
                        aria-label={`Select ${zone.name}`}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/hosted-zones/${zone.id}/records`}
                        style={{ color: "#0073bb", textDecoration: "none", fontWeight: 500 }}
                      >
                        {zone.name}
                      </Link>
                    </td>
                    <td>
                      {zone.private ? (
                        <span className="badge-private">Private</span>
                      ) : (
                        <span className="badge-public">Public</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: "#16191f", fontVariantNumeric: "tabular-nums" }}>
                        {zone.record_count}
                      </span>
                    </td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {zone.description ? (
                        <span title={zone.description} style={{ color: "#545b64" }}>
                          {zone.description}
                        </span>
                      ) : (
                        <span style={{ color: "#aab7b8" }}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "#545b64", fontSize: 12 }}>
                      {new Date(zone.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link
                          href={`/hosted-zones/${zone.id}/records`}
                          className="btn-link"
                        >
                          View records
                        </Link>
                        <span style={{ color: "#d5dbdb" }}>|</span>
                        <button
                          className="btn-link"
                          onClick={() => openEdit(zone)}
                        >
                          Edit
                        </button>
                        <span style={{ color: "#d5dbdb" }}>|</span>
                        <button
                          className="btn-link"
                          style={{ color: "#d13212" }}
                          onClick={() => setDeleteZone(zone)}
                        >
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

      {/* Create Zone Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create hosted zone"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateOpen(false)} disabled={createLoading}>
              Cancel
            </button>
            <button
              className="btn-primary"
              form="create-zone-form"
              type="submit"
              disabled={createLoading}
              id="create-zone-submit"
            >
              {createLoading ? "Creating…" : "Create hosted zone"}
            </button>
          </>
        }
      >
        <form id="create-zone-form" onSubmit={handleCreate}>
          {createError && (
            <div className="toast-error rounded px-4 py-3 mb-4 text-sm flex gap-2">
              <span>⚠</span><span>{createError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="aws-label" htmlFor="zone-name">
              Domain name <span style={{ color: "#d13212" }}>*</span>
            </label>
            <input
              id="zone-name"
              type="text"
              className="aws-input"
              placeholder="example.com"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
            <p className="form-hint">
              Enter the name of the domain. Use a trailing period (e.g., example.com.) for absolute domains.
            </p>
          </div>

          <div className="form-group">
            <label className="aws-label">Type</label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="radio"
                  name="zone-type"
                  checked={!createForm.private}
                  onChange={() => setCreateForm((f) => ({ ...f, private: false }))}
                  style={{ accentColor: "#ff9900" }}
                />
                Public hosted zone
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="radio"
                  name="zone-type"
                  checked={createForm.private}
                  onChange={() => setCreateForm((f) => ({ ...f, private: true }))}
                  style={{ accentColor: "#ff9900" }}
                />
                Private hosted zone
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="aws-label" htmlFor="zone-description">
              Description (optional)
            </label>
            <textarea
              id="zone-description"
              className="aws-input"
              placeholder="Optional description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              maxLength={255}
              style={{ resize: "vertical" }}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Zone Modal */}
      <Modal
        open={!!editZone}
        onClose={() => setEditZone(null)}
        title="Edit hosted zone"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditZone(null)} disabled={editLoading}>
              Cancel
            </button>
            <button
              className="btn-primary"
              form="edit-zone-form"
              type="submit"
              disabled={editLoading}
            >
              {editLoading ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="edit-zone-form" onSubmit={handleEdit}>
          {editError && (
            <div className="toast-error rounded px-4 py-3 mb-4 text-sm flex gap-2">
              <span>⚠</span><span>{editError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="aws-label" htmlFor="edit-zone-name">
              Domain name
            </label>
            <input
              id="edit-zone-name"
              type="text"
              className="aws-input"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="aws-label" htmlFor="edit-zone-description">
              Description
            </label>
            <textarea
              id="edit-zone-description"
              className="aws-input"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              maxLength={255}
              style={{ resize: "vertical" }}
            />
          </div>
        </form>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
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
              <td style={{ padding: "8px 0", color: "#545b64" }}>Open Create Hosted Zone modal</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eaeded" }}>
              <td style={{ padding: "8px 0" }}><kbd style={{ background: "#f2f3f3", padding: "2px 6px", borderRadius: 3, border: "1px solid #d5dbdb", fontFamily: "monospace" }}>r</kbd></td>
              <td style={{ padding: "8px 0", color: "#545b64" }}>Refresh hosted zones list</td>
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
        open={!!deleteZone}
        onClose={() => setDeleteZone(null)}
        title="Delete hosted zone"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteZone(null)} disabled={deleteLoading}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              id="confirm-delete-zone-btn"
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, color: "#d13212", flexShrink: 0 }}>⚠</div>
          <div>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Are you sure you want to delete the hosted zone{" "}
              <strong>{deleteZone?.name}</strong>?
            </p>
            <p style={{ fontSize: 13, color: "#545b64" }}>
              This will permanently delete the zone and all its DNS records. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Bulk Modal */}
      <Modal
        open={deleteBulkOpen}
        onClose={() => setDeleteBulkOpen(false)}
        title={`Delete ${selected.size} hosted zone(s)`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteBulkOpen(false)} disabled={deleteLoading}>
              Cancel
            </button>
            <button
              className="btn-danger"
              onClick={handleDeleteBulk}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting…" : `Delete ${selected.size} zone(s)`}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ fontSize: 28, color: "#d13212", flexShrink: 0 }}>⚠</div>
          <div>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Are you sure you want to delete <strong>{selected.size}</strong> hosted zone(s)?
            </p>
            <p style={{ fontSize: 13, color: "#545b64" }}>
              All DNS records within these zones will also be permanently deleted. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
