function WelcomeBanner() {
  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">
        {greeting} 
      </h1>

      <p className="mt-2 text-lg text-slate-500">
        Here's what's happening in your business today.
      </p>
    </div>
  );
}

export default WelcomeBanner;