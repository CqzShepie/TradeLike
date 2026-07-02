type WelcomeBannerProps = {
  title?: string;
  subtitle?: string;
};

function WelcomeBanner({
  title,
  subtitle,
}: WelcomeBannerProps) {
  const hour = new Date().getHours();

  let greeting = "Good evening";

  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 18) {
    greeting = "Good afternoon";
  }

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold tracking-tight text-white">
        {title ?? greeting}
      </h1>

      <p className="mt-2 text-lg text-slate-300">
        {subtitle ?? "Here's what's happening in your business today."}
      </p>
    </div>
  );
}

export default WelcomeBanner;
