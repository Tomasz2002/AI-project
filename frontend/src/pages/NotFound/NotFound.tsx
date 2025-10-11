import React from "react";
import styles from "./NotFound.module.scss";
import useWebsiteTitle from "../../hooks/useWebsiteTitle";
import { useTranslation } from "react-i18next";

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  useWebsiteTitle(t("page-not-found"));

  return (
    <div className={styles.mainContainer}>
      <h1>{t("not-found")}</h1>
      <p>{t("sorry-the-page-you-are-looking-for-does-not-exist")}</p>
    </div>
  );
};

export default NotFound;
