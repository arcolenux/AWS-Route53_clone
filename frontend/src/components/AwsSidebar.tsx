"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "⊞" },
  { label: "Hosted zones", href: "/hosted-zones", icon: "◎" },
  { label: "Health checks", href: "/health-checks", icon: "♥" },
  { label: "Traffic policies", href: "/traffic-policies", icon: "⬡" },
  { label: "Policy records", href: "/policy-records", icon: "▦" },
  { label: "IP-based routing", href: "/ip-routing", icon: "◈" },
  { label: "Resolver", href: "/resolver", icon: "⟳" },
  { label: "Domains", href: "/domains", icon: "◻" },
  { label: "Profiles", href: "/profiles", icon: "◷" },
];

export default function AwsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/hosted-zones") {
      return pathname.startsWith("/hosted-zones");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav
      style={{
        width: 220,
        background: "#232f3e",
        position: "fixed",
        top: 48,
        left: 0,
        bottom: 0,
        overflowY: "auto",
        zIndex: 90,
        borderRight: "1px solid #1a242e",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Service title */}
      <div
        style={{
          padding: "16px 16px 8px",
          color: "#cdd7e0",
          fontSize: 13,
          fontWeight: 700,
          borderBottom: "1px solid #37475a",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="#ff9900"
            opacity="0.8"
          />
          <path
            d="M12 6v6l4 2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Route 53
      </div>

      {/* Navigation items */}
      <div style={{ paddingTop: 4 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 16px",
                textDecoration: "none",
                fontSize: 13,
                color: active ? "white" : "#cdd7e0",
                background: active ? "#37475a" : "transparent",
                borderLeft: active ? "3px solid #ff9900" : "3px solid transparent",
                transition: "background 0.1s, color 0.1s",
                fontWeight: active ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "#2d3f51";
                  (e.currentTarget as HTMLElement).style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#cdd7e0";
                }
              }}
            >
              <span style={{ fontSize: 15, opacity: 0.8 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom: docs link */}
      <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid #37475a" }}>
        <a
          href="https://docs.aws.amazon.com/Route53/"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#8d99a5",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          <span>📖</span> Documentation
        </a>
      </div>
    </nav>
  );
}
