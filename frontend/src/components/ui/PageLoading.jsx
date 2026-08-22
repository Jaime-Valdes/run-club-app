import { useEffect, useState } from "react";
import "./PageLoading.css";

const SLOW_THRESHOLD_MS = 4000;

export default function PageLoading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-loading">
      <div className="page-loading-spinner" />
      <p>
        {slow
          ? "Waking up the server — this can take up to a minute on the first load."
          : "Loading..."}
      </p>
    </div>
  );
}
