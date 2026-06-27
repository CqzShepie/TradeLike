import { Link } from "react-router-dom";
import Logo from "./Logo";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-6">
      <Logo />

    <Link
      to="/login"
      className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
    >
      Login
    </Link>
    </nav>
  );
}

export default Navbar;