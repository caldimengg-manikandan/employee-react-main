import React, { useEffect, useState } from "react";
import { attendanceApprovalAPI } from "../../services/api";

const AttendanceApproval = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceApprovalAPI.list(
        statusFilter ? { status: statusFilter } : undefined
      );
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id) => {
    setLoading(true);
    try {
      await attendanceApprovalAPI.approve(id);
      await load();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    setLoading(true);
    try {
      await attendanceApprovalAPI.reject(rejectId, rejectReason || "");
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", { hour12: true });
    } catch {
      return iso;
    }
  };

  const formatHours = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const styles = {
    container: { maxWidth: "1100px", margin: "0 auto", padding: "20px" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
    title: { fontSize: "20px", fontWeight: 700, color: "#1a202c" },
    controls: { display: "flex", gap: "8px", alignItems: "center" },
    select: { padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" },
    table: { width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
    th: { backgroundColor: "#f7fafc", textAlign: "left", padding: "12px", fontSize: "12px", color: "#4a5568", borderBottom: "1px solid #e2e8f0" },
    td: { padding: "12px", borderBottom: "1px solid #edf2f7", fontSize: "14px", color: "#1a202c" },
    actions: { display: "flex", gap: "8px" },
    btn: { padding: "6px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" },
    approveBtn: { backgroundColor: "#16a34a", color: "#fff", border: "none" },
    rejectBtn: { backgroundColor: "#ef4444", color: "#fff", border: "none" },
    modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalContent: { width: "420px", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden" },
    modalHeader: { padding: "14px 16px", borderBottom: "1px solid #edf2f7", display: "flex", alignItems: "center", justifyContent: "space-between" },
    modalTitle: { fontSize: "16px", fontWeight: 700, color: "#2d3748" },
    modalBody: { padding: "16px", display: "grid", gap: "12px" },
    input: { padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px" },
    modalFooter: { padding: "12px 16px", borderTop: "1px solid #edf2f7", display: "flex", justifyContent: "flex-end", gap: "8px" },
    btnSecondary: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#fff", cursor: "pointer" },
    btnPrimary: { padding: "8px 12px", borderRadius: "6px", backgroundColor: "#3182ce", color: "#fff", border: "none", cursor: "pointer" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Attendance Approval</div>
        <div style={styles.controls}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>IN</th>
            <th style={styles.th}>OUT</th>
            <th style={styles.th}>Hours</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={styles.td}>Loading...</td></tr>
          ) : requests.length === 0 ? (
            <tr><td colSpan={6} style={styles.td}>No records</td></tr>
          ) : (
            requests.map((r) => (
              <tr key={r._id}>
                <td style={styles.td}>{r.employeeName} ({r.employeeId})</td>
                <td style={styles.td}>{formatDateTime(r.inTime)}</td>
                <td style={styles.td}>{formatDateTime(r.outTime)}</td>
                <td style={styles.td}>{formatHours(Number(r.workDurationSeconds || 0))}</td>
                <td style={styles.td}>{r.status}</td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.btn, ...styles.approveBtn }}
                      onClick={() => approve(r._id)}
                      disabled={loading || r.status !== "Pending"}
                    >
                      Approve
                    </button>
                    <button
                      style={{ ...styles.btn, ...styles.rejectBtn }}
                      onClick={() => { setRejectId(r._id); setRejectReason(""); }}
                      disabled={loading || r.status !== "Pending"}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {rejectId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Reject Request</div>
              <button style={styles.btnSecondary} onClick={() => { setRejectId(null); setRejectReason(""); }}>Close</button>
            </div>
            <div style={styles.modalBody}>
              <input
                type="text"
                placeholder="Reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</button>
              <button style={styles.btnPrimary} onClick={reject}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceApproval;
