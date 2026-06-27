import { Link } from "react-router-dom";

function Logo() {
  return (
    <Link
      to="/"
      className="text-2xl font-bold text-blue-600 hover:text-blue-700"
    >
      TradeLike
    </Link>
  );
}

export default Logo;