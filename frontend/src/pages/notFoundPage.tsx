import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

function NotFoundPage() {
  usePageTitle("Not Found");
  return (
    <div className="flex error-page">
      <h3 className="error-page-icon">:p</h3>
      <h1 className="error-page-header">
        You found a page that doesn't exist!
      </h1>
      <p>
        This page may have moved, been deleted, or you might have followed a
        broken link.
      </p>
      <Link to="/" className="error-page-link">
        ← Back to safety
      </Link>
    </div>
  );
}

export default NotFoundPage;
