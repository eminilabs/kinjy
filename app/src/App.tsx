import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import { FEATURES, type Feature } from './lib/features'

// Route-level code-splitting (C5 performance budget): every sub-page ships as
// its own chunk so the landing page no longer carries the full 1.5MB bundle.
const Platform = lazy(() => import('./pages/Platform'))
const Feeds = lazy(() => import('./pages/Feeds'))
const Family = lazy(() => import('./pages/Family'))
const Memorials = lazy(() => import('./pages/Memorials'))
const Creators = lazy(() => import('./pages/Creators'))
const Commerce = lazy(() => import('./pages/Commerce'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Payments = lazy(() => import('./pages/Payments'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Admin = lazy(() => import('./pages/Admin'))
const Safety = lazy(() => import('./pages/Safety'))
const Developers = lazy(() => import('./pages/Developers'))
const AppDemo = lazy(() => import('./pages/AppDemo'))
const SignIn = lazy(() => import('./pages/SignIn'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SocialHub = lazy(() => import('./pages/SocialHub'))
const Circles = lazy(() => import('./pages/app/Circles'))
const Connections = lazy(() => import('./pages/app/Connections'))
const Communities = lazy(() => import('./pages/app/Communities'))
const Forums = lazy(() => import('./pages/app/Forums'))
const Messages = lazy(() => import('./pages/app/Messages'))
const FamilyTreeApp = lazy(() => import('./pages/app/FamilyTree'))
const Graveyard = lazy(() => import('./pages/app/Graveyard'))
const MemorialPublic = lazy(() => import('./pages/MemorialPublic'))
const Marketplace = lazy(() => import('./pages/app/Marketplace'))
const Explore = lazy(() => import('./pages/app/Explore'))
const Live = lazy(() => import('./pages/app/Live'))
const Shorts = lazy(() => import('./pages/app/Shorts'))
const Earn = lazy(() => import('./pages/app/Earn'))
const Supervision = lazy(() => import('./pages/app/Supervision'))
const TrustSafety = lazy(() => import('./pages/TrustSafety'))
const Moderation = lazy(() => import('./pages/app/Moderation'))
const Profile = lazy(() => import('./pages/app/Profile'))

function PageFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="Loading page">
      <div
        className="h-14 w-14 rounded-full animate-orb-breathe"
        style={{ background: 'var(--grad-orb)', filter: 'blur(0.5px)' }}
      />
    </div>
  )
}

/**
 * A route whose feature is switched off (see lib/features.ts) sends the visitor
 * somewhere real instead of rendering the page: app routes to the feed, public
 * pages to the home page. The page's chunk is never even loaded.
 */
function gated(feature: Feature, page: ReactNode, fallback: string) {
  return FEATURES[feature] ? page : <Navigate to={fallback} replace />
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/feeds" element={<Feeds />} />
          <Route path="/family" element={gated('familyTree', <Family />, '/')} />
          <Route path="/memorials" element={<Memorials />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/commerce" element={gated('marketplace', <Commerce />, '/')} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/assistant" element={gated('assistant', <Assistant />, '/')} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/app" element={<AppDemo />} />
          {/* /join is the public entry point; ?ref= carries the inviter's code. */}
          <Route path="/join" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* The member's real feed. /feeds stays the public marketing page. */}
          <Route path="/hub" element={<SocialHub />} />
          {/* Universal Navigation destinations, per the blueprint */}
          <Route path="/circles" element={<Circles />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/tree" element={gated('familyTree', <FamilyTreeApp />, '/hub')} />
          <Route path="/graveyard" element={<Graveyard />} />
          {/* Where a memorial's QR code leads. Public: whoever scans a headstone
              usually has no account. */}
          <Route path="/memorial/:code" element={<MemorialPublic />} />
          <Route path="/market" element={gated('marketplace', <Marketplace />, '/hub')} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/live" element={gated('live', <Live />, '/hub')} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/earn" element={<Earn />} />
          {/* Notifications about supervision link here, so the path is fixed. */}
          <Route path="/supervision" element={<Supervision />} />
          <Route path="/settings/supervision" element={<Supervision />} />
          {/* Staff console. The service refuses every call behind it to
              anybody who is not staff, so the route itself is not the guard. */}
          <Route path="/trust-safety" element={<TrustSafety />} />
          {/* Where the appeal notification sends the member. */}
          <Route path="/moderation" element={<Moderation />} />
          {/* Every avatar in the app links here. */}
          <Route path="/u/:handle" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
