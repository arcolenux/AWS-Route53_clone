interface ComingSoonProps {
  title: string;
  description: string;
  icon: string;
  docsUrl?: string;
}

export default function ComingSoon({ title, description, icon, docsUrl }: ComingSoonProps) {
  return (
    <div style={{ padding: "24px 32px" }}>
      <nav className="aws-breadcrumb">
        <a href="/dashboard">Route 53</a>
        <span className="sep">›</span>
        <span>{title}</span>
      </nav>

      <div className="aws-page-header">
        <h1 className="aws-page-title">{title}</h1>
      </div>

      <div
        className="aws-card"
        style={{
          padding: "64px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: 400,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#f2f3f3",
            border: "2px dashed #d5dbdb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            marginBottom: 24,
          }}
        >
          {icon}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#16191f", marginBottom: 12 }}>
          Coming Soon
        </h2>
        <p style={{ fontSize: 14, color: "#545b64", maxWidth: 480, lineHeight: 1.6, marginBottom: 24 }}>
          {description}
        </p>
        <div
          style={{
            background: "#f0f8ff",
            border: "1px solid #c9e4f5",
            borderRadius: 4,
            padding: "10px 16px",
            fontSize: 13,
            color: "#0073bb",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>ℹ</span>
          <span>
            This section is mocked for the assignment. Core DNS functionality is fully implemented in{" "}
            <a href="/hosted-zones" style={{ color: "#0073bb", fontWeight: 600 }}>
              Hosted Zones
            </a>.
          </span>
        </div>
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ marginTop: 16, textDecoration: "none" }}
          >
            View AWS Documentation ↗
          </a>
        )}
      </div>
    </div>
  );
}
