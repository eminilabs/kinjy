import Hero from '@/components/home/Hero'
import TrustTicker from '@/components/home/TrustTicker'
import ModuleConstellation from '@/components/home/ModuleConstellation'
import FeedRulesStory from '@/components/home/FeedRulesStory'
import CreateOnce from '@/components/home/CreateOnce'
import HeritageBand from '@/components/home/HeritageBand'
import Economy from '@/components/home/Economy'
import AssistantIntro from '@/components/home/AssistantIntro'
import PricingTeaser from '@/components/home/PricingTeaser'

/**
 * Home — the Kinjy landing page (design/home.md).
 * Mood: awe → clarity → warmth → invitation.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <TrustTicker />
      <ModuleConstellation />
      <FeedRulesStory />
      <CreateOnce />
      <HeritageBand />
      <Economy />
      <AssistantIntro />
      <PricingTeaser />
    </>
  )
}
