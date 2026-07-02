import FaqSection from "../components/home/FaqSection";
import FeatureGrid from "../components/home/FeatureGrid";
import HeroSection from "../components/home/HeroSection";
import HomeFooter from "../components/home/HomeFooter";
import HomeHeader from "../components/home/HomeHeader";
import PricingSection from "../components/home/PricingSection";
import ProblemSection from "../components/home/ProblemSection";
import ProductPreview from "../components/home/ProductPreview";
import RoleBenefits from "../components/home/RoleBenefits";
import TrialCta from "../components/home/TrialCta";
import WorkflowSection from "../components/home/WorkflowSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <HomeHeader />

      <main id="main-content">
        <HeroSection />
        <ProductPreview />
        <ProblemSection />
        <FeatureGrid />
        <WorkflowSection />
        <PricingSection />
        <RoleBenefits />
        <TrialCta />
        <FaqSection />
      </main>

      <HomeFooter />
    </div>
  );
}
