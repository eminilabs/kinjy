import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'

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
const Communities = lazy(() => import('./pages/app/Communities'))
const Forums = lazy(() => import('./pages/app/Forums'))
const Messages = lazy(() => import('./pages/app/Messages'))
const FamilyTreeApp = lazy(() => import('./pages/app/FamilyTree'))
const Graveyard = lazy(() => import('./pages/app/Graveyard'))
const Marketplace = lazy(() => import('./pages/app/Marketplace'))
const Explore = lazy(() => import('./pages/app/Explore'))
const Live = lazy(() => import('./pages/app/Live'))
const Shorts = lazy(() => import('./pages/app/Shorts'))
const Earn = lazy(() => import('./pages/app/Earn'))
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

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="/feeds" element={<Feeds />} />
          <Route path="/family" element={<Family />} />
          <Route path="/memorials" element={<Memorials />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/commerce" element={<Commerce />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/assistant" element={<Assistant />} />
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
          <Route path="/communities" element={<Communities />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/tree" element={<FamilyTreeApp />} />
          <Route path="/graveyard" element={<Graveyard />} />
          <Route path="/market" element={<Marketplace />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/live" element={<Live />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/earn" element={<Earn />} />
          {/* Every avatar in the app links here. */}
          <Route path="/u/:handle" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
