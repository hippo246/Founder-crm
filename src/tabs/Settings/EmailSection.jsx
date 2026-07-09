import { useState } from "react";
import { toast } from "../../components/ui/UI.jsx";

export default function EmailSection({ settings, setSettings, saveAll }) {
  const [emailConfig, setEmailConfig] = useState({
    serviceId: settings.emailServiceId || "",
    templateId: settings.emailTemplateId || "",
    publicKey: settings.emailPublicKey || "",
    fromEmail: settings.emailFromEmail || "",
    fromName: settings.emailFromName || ""
  });

  const handleSave = () => {
    setSettings({
      ...settings,
      emailServiceId: emailConfig.serviceId,
      emailTemplateId: emailConfig.templateId,
      emailPublicKey: emailConfig.publicKey,
      emailFromEmail: emailConfig.fromEmail,
      emailFromName: emailConfig.fromName
    });
    saveAll();
    toast("Email.js configuration saved", "success");
  };

  const handleTestEmail = async () => {
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
      toast("Please fill in all Email.js credentials first", "error");
      return;
    }

    try {
      // This would send a test email using Email.js
      // For now, just show a success message
      toast("Test email would be sent to: " + emailConfig.fromEmail, "info");
    } catch (error) {
      toast("Failed to send test email: " + error.message, "error");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      {/* Email.js Configuration */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Email.js Configuration</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Configure your Email.js credentials to enable email notifications from the CRM.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Service ID
            </label>
            <input
              type="text"
              value={emailConfig.serviceId}
              onChange={(e) => setEmailConfig({ ...emailConfig, serviceId: e.target.value })}
              placeholder="your_service_id"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Template ID
            </label>
            <input
              type="text"
              value={emailConfig.templateId}
              onChange={(e) => setEmailConfig({ ...emailConfig, templateId: e.target.value })}
              placeholder="your_template_id"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Public Key
            </label>
            <input
              type="text"
              value={emailConfig.publicKey}
              onChange={(e) => setEmailConfig({ ...emailConfig, publicKey: e.target.value })}
              placeholder="your_public_key"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              From Email
            </label>
            <input
              type="email"
              value={emailConfig.fromEmail}
              onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
              placeholder="noreply@yourdomain.com"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              From Name
            </label>
            <input
              type="text"
              value={emailConfig.fromName}
              onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
              placeholder="Founder CRM"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none"
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Save Configuration
          </button>
          <button
            onClick={handleTestEmail}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            Send Test Email
          </button>
        </div>
      </div>

      {/* Setup Instructions */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Setup Instructions</div>
        <ol style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 20, lineHeight: 1.8 }}>
          <li style={{ marginBottom: 8 }}>Go to <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Email.js</a> and create an account</li>
          <li style={{ marginBottom: 8 }}>Add an email service (Gmail, Outlook, etc.)</li>
          <li style={{ marginBottom: 8 }}>Create an email template for your notifications</li>
          <li style={{ marginBottom: 8 }}>Copy your Service ID, Template ID, and Public Key from Email.js dashboard</li>
          <li style={{ marginBottom: 8 }}>Paste the credentials above and save</li>
          <li style={{ marginBottom: 8 }}>Test your configuration by sending a test email</li>
        </ol>
      </div>

      {/* Email Templates Info */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Email Templates</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          The CRM can send emails for various events. Configure your Email.js templates to handle:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12 }}>
          <div style={{ background: "var(--bg)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📧 Invoice Sent</div>
            <div style={{ color: "var(--text-muted)" }}>When an invoice is created/sent</div>
          </div>
          <div style={{ background: "var(--bg)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>💰 Payment Received</div>
            <div style={{ color: "var(--text-muted)" }}>When a payment is recorded</div>
          </div>
          <div style={{ background: "var(--bg)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📋 Proposal Sent</div>
            <div style={{ color: "var(--text-muted)" }}>When a proposal is sent</div>
          </div>
          <div style={{ background: "var(--bg)", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>📅 Follow-up Reminder</div>
            <div style={{ color: "var(--text-muted)" }}>Scheduled follow-up notifications</div>
          </div>
        </div>
      </div>
    </div>
  );
}
