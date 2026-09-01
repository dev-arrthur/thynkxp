import HomeExperience from '../components/HomeExperience';
import AnalyticsTracker from '../components/AnalyticsTracker';
import ContinuousMarquees from '../components/ContinuousMarquees';
import HomeChromeEnhancer from '../components/HomeChromeEnhancer';
import NavbarLiveSync from '../components/NavbarLiveSync';

export default function Home() {
  return (
    <>
      <HomeExperience />
      <HomeChromeEnhancer />
      <NavbarLiveSync />
      <ContinuousMarquees />
      <AnalyticsTracker />
    </>
  );
}
