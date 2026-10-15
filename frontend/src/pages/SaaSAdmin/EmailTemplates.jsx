import React, { useState, useEffect } from "react";
import { Mail, Save, RefreshCw, CheckCircle, Info } from "lucide-react";
import { toast } from "react-toastify";
import { getEmailTemplates, updateEmailTemplate } from "../../api/templateApi";
import "./SaaSAdmin.css";

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [subjects, setSubjects] = useState({});

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await getEmailTemplates();
      if (res && res.status) {
        setTemplates(res.templates || []);
        const initialSubs = {};
        (res.templates || []).forEach((t) => {
          initialSubs[t.templateKey] = t.subject;
        });
        setSubjects(initialSubs);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast.error(err?.message || "Failed to load email templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubjectChange = (key, value) => {
    setSubjects((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (key) => {
    const updatedSubject = subjects[key];
    if (!updatedSubject || !updatedSubject.trim()) {
      toast.error("Subject line cannot be empty.");
      return;
    }

    try {
      setSavingKey(key);
      const res = await updateEmailTemplate(key, { subject: updatedSubject.trim() });
      if (res && res.status) {
        toast.success("Email subject updated successfully!");
        // Refresh local state with updated template data
        setTemplates((prev) =>
          prev.map((t) =>
            t.templateKey === key ? { ...t, subject: res.template.subject } : t
          )
        );
      } else {
        toast.error(res?.message || "Failed to update subject");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err?.message || "Error updating email subject");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="saas-container" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "rgba(243, 156, 18, 0.12)",
              color: "#F39C12",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mail size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
              Email Templates
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, marginTop: "2px" }}>
              Customize and manage email subject lines 
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "50px 20px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0",
          }}
        >
          <RefreshCw
            size={28}
            className="animate-spin"
            style={{ margin: "0 auto 12px", color: "#F39C12" }}
          />
          <p style={{ color: "#64748b", fontSize: "14px" }}>Loading email templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "50px 20px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0",
          }}
        >
          <Mail size={36} style={{ margin: "0 auto 12px", color: "#94a3b8" }} />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
            No Email Templates Found
          </h3>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Templates will appear automatically once initialized.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {templates.map((tpl) => {
            const isSaving = savingKey === tpl.templateKey;
            const currentVal = subjects[tpl.templateKey] ?? tpl.subject;
            const isModified = currentVal.trim() !== tpl.subject.trim();

            return (
              <div
                key={tpl.templateKey}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  padding: "24px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Card Title & Tag */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "17px",
                        fontWeight: "600",
                        color: "#0f172a",
                        margin: "0 0 4px 0",
                      }}
                    >
                      {tpl.templateName}
                    </h3>
                    {tpl.description && (
                      <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                        {tpl.description}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#475569",
                      fontFamily: "monospace",
                    }}
                  >
                    {tpl.templateKey}
                  </span>
                </div>

                {/* Form Input for Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>Email Subject Line</span>
                    {isModified && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "500",
                          color: "#F39C12",
                          background: "rgba(243, 156, 18, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Unsaved changes
                      </span>
                    )}
                  </label>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => handleSubjectChange(tpl.templateKey, e.target.value)}
                      placeholder="Enter email subject line..."
                      style={{
                        flex: "1 1 300px",
                        padding: "11px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        outline: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#F39C12";
                        e.target.style.boxShadow = "0 0 0 3px rgba(243, 156, 18, 0.15)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#cbd5e1";
                        e.target.style.boxShadow = "none";
                      }}
                    />

                    <button
                      onClick={() => handleSave(tpl.templateKey)}
                      disabled={isSaving}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "11px 22px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#ffffff",
                        backgroundColor: "#F39C12",
                        border: "none",
                        borderRadius: "8px",
                        cursor: isSaving ? "not-allowed" : "pointer",
                        opacity: isSaving ? 0.7 : 1,
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 4px rgba(243, 156, 18, 0.2)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSaving) e.currentTarget.style.backgroundColor = "#d68910";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSaving) e.currentTarget.style.backgroundColor = "#F39C12";
                      }}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Helpful Note */}
               
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
