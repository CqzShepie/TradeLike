import { Link } from "react-router-dom";

function Signup() {
  return (
    <main className="min-h-screen bg-white">
      <header className="px-8 py-6">
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600 hover:text-blue-700"
        >
          TradeLike
        </Link>
      </header>

      <div className="flex justify-center">
        <h1 className="text-4xl font-bold">Create your account</h1>
      </div>
    </main>
  );
}

export default Signup;