import Logo from "../components/Logo";

function Login() {
  return (
    <main className="min-h-screen bg-white">
      <header className="px-8 py-6">
        <Logo />
      </header>

      <div className="flex justify-center pt-16">
        <h1 className="text-5xl font-bold">
          Welcome back
        </h1>
      </div>
    </main>
  );
}

export default Login;