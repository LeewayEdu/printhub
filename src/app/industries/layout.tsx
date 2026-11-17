import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  )
}
