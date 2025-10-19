import React, { ReactNode, useEffect, useState } from "react";
import styles from "./Layout.module.scss";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  header: ReactNode;
  content: ReactNode;
  footer: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  header,
  content,
  footer,
}) => {
  const location = useLocation();
  const [showHeader, setShowHeader] = useState<boolean>(true);

  useEffect(() => {
    setShowHeader(
      location.pathname === "/login" ||
        location.pathname === "/signup" ||
        location.pathname === "/activate-account/:userEmail"
    );
  }, [location.pathname]);

  return (
    <div className={styles.layoutContainer}>
      <header className={styles.header}>{header}</header>
      <div className="d-flex" style={{ overflow: "auto" }}>
        <main
          className={styles.content}
          style={!showHeader ? { marginTop: "94px" } : { marginTop: 0 }}
        >
          {content}
        </main>
      </div>
      <footer className={styles.footer}>{footer}</footer>
    </div>
  );
};

export default Layout;
