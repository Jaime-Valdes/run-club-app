import { useEffect, useState } from "react";
import { useServerDown } from "../../api/serverStatus";
import "./PageLoading.css";

const SLOW_THRESHOLD_MS = 4000;

export default function PageLoading() {
  const [slow, setSlow] = useState(false);
  const serverDown = useServerDown();

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // The banner explains the problem, so don't also spin forever.
  if (serverDown) return null;

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
