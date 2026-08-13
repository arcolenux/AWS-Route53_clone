"use client";

export default function DashboardPage() {
  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Breadcrumb */}
      <nav className="aws-breadcrumb">
        <span>Route 53</span>
        <span className="sep">›</span>
        <span>Dashboard</span>
      </nav>

      {/* Page header */}
      <div className="aws-page-header">
        <div>
          <h1 className="aws-page-title">Route 53 Dashboard</h1>
          <p className="aws-page-subtitle">DNS and Traffic Management</p>
        </div>
      </div>

      {/* Welcome card */}
      <div className="aws-card mb-6" style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#fff8e1",
              border: "2px solid #ffe0b2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            ◎
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#16191f", marginBottom: 8 }}>
              Welcome to Route 53
            </h2>
            <p style={{ fontSize: 14, color: "#545b64", lineHeight: 1.6 }}>
              Amazon Route 53 is a highly available and scalable cloud Domain Name System (DNS) web service.
              It is designed to give developers and businesses an extremely reliable and cost-effective way
              to route end users to Internet applications by translating names like www.example.com into
              numeric IP addresses.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/hosted-zones" className="btn-primary" style={{ textDecoration: "none" }}>
                Manage Hosted Zones
              </a>
              <a href="/health-checks" className="btn-secondary" style={{ textDecoration: "none" }}>
                Health Checks
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {QUICK_CARDS.map((card) => (
          <a key={card.href} href={card.href} style={{ textDecoration: "none" }}>
            <div
              className="aws-card"
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
                height: "100%",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = "#0073bb";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.borderColor = "#d5dbdb";
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#16191f", marginBottom: 6 }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 13, color: "#545b64", lineHeight: 1.5 }}>
                {card.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const QUICK_CARDS = [
  {
    href: "/hosted-zones",
    icon: "◎",
    title: "Hosted Zones",
    description: "Create and manage DNS hosted zones. A hosted zone is a container for DNS records.",
  },
  {
    href: "/health-checks",
    icon: "♥",
    title: "Health Checks",
    description: "Monitor the health of resources and route traffic away from unhealthy endpoints.",
  },
  {
    href: "/traffic-policies",
    icon: "⬡",
    title: "Traffic Policies",
    description: "Define rules to route traffic to your resources based on various criteria.",
  },
  {
    href: "/resolver",
    icon: "⟳",
    title: "Resolver",
    description: "Configure DNS resolution between your VPCs and your on-premises networks.",
  },
  {
    href: "/domains",
    icon: "◻",
    title: "Domains",
    description: "Register and manage domain names directly through Route 53.",
  },
  {
    href: "/profiles",
    icon: "◷",
    title: "Profiles",
    description: "Create and manage Route 53 profiles for centralized DNS configuration.",
  },
];
