import HomeExperience from '../components/HomeExperience';
import AnalyticsTracker from '../components/AnalyticsTracker';
import ContinuousMarquees from '../components/ContinuousMarquees';
import MethodExperience from '../components/MethodExperience';

export default function Home() {
  return (
    <>
      <HomeExperience />
      <MethodExperience />
      <ContinuousMarquees />
      <AnalyticsTracker />
    </>
  );
}
