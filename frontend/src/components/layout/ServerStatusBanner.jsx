import { useLocation } from "react-router-dom";
import { useServerDown } from "../../api/serverStatus";
import "./ServerStatusBanner.css";

export default function ServerStatusBanner() {
  const serverDown = useServerDown();
  const { pathname } = useLocation();
  // The self check-in page shows its own message and has no navbar.
  if (!serverDown || pathname === "/selfcheckin") return null;

  return (
    <div className="server-banner" role="alert">
      <span>Can't reach the server right now, so changes may not save.</span>
      <button className="server-banner-retry" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  );
}
