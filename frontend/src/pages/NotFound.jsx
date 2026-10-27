import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <h1>Page not found</h1>
      <button className="btn" onClick={() => navigate("/")}>Back home</button>
    </div>
  );
}
