"use client";

import React from "react";
import { Box, ChartColumnIncreasing, Handbag, Star } from "lucide-react";

export default function Statistic() {
  const EcommerceActions = [
    {
      title: "Orders",
      subtitle: "5868",
      cardIcon: Handbag,
      badgeClass: "kpi-badge-teal",
      statusValue: "+18%",
    },
    {
      title: "Sales",
      subtitle: "$96,850",
      cardIcon: Box,
      badgeClass: "kpi-badge-orange",
      statusValue: "-5%",
    },
    {
      title: "Profit",
      subtitle: "$82,906",
      cardIcon: ChartColumnIncreasing,
      badgeClass: "kpi-badge-teal",
      statusValue: "+18%",
    },
    {
      title: "Expense",
      subtitle: "$14,653",
      cardIcon: Star,
      badgeClass: "kpi-badge-teal",
      statusValue: "+18%",
    },
  ];

  return (
    <div style={{ padding: "32px 16px", maxWidth: "1280px", margin: "0 auto" }}>
      <div className="kpi-connected-card">
        {EcommerceActions.map((item, index) => {
          return (
            <div className="kpi-connected-item" key={index}>
              {/* Top row: Title + Icon */}
              <div className="kpi-connected-header">
                <span className="kpi-connected-title">
                  {item.title}
                </span>
                <div className="kpi-connected-icon-btn">
                  <item.cardIcon size={16} />
                </div>
              </div>

              {/* Bottom: Big Number + Subtext/Badge */}
              <div>
                <div className="kpi-connected-value">
                  {item.subtitle}
                </div>
                <div className="kpi-connected-footer">
                  <span className="kpi-connected-subtext">
                    Last 7 days
                  </span>
                  <span className={`kpi-connected-badge ${item.badgeClass}`}>
                    {item.statusValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
