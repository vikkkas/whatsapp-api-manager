import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  ArrowRight, 
  CheckCircle2, 
  Star,
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-pink-200">
      {/* Navbar */}
      <nav 
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? 'bg-black/90 backdrop-blur-md py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-white">Manychat</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/90">
            <a href="#" className="hover:text-white transition-colors">PRODUCT</a>
            <a href="#" className="hover:text-white transition-colors">SOLUTIONS</a>
            <a href="#" className="hover:text-white transition-colors">AGENCIES</a>
            <a href="#" className="hover:text-white transition-colors">PRICING</a>
            <a href="#" className="hover:text-white transition-colors">RESOURCES</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/signup">
              <Button 
                variant="outline" 
                className="rounded-full border-white/30 bg-transparent text-white hover:bg-white hover:text-black px-6 font-bold uppercase text-xs tracking-wider h-10"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:text-white/80 font-bold uppercase text-xs tracking-wider">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-black border-t border-white/10 p-6 flex flex-col gap-4 md:hidden">
            <a href="#" className="text-white font-bold">PRODUCT</a>
            <a href="#" className="text-white font-bold">SOLUTIONS</a>
            <a href="#" className="text-white font-bold">PRICING</a>
            <Link to="/signup" className="w-full">
              <Button className="w-full bg-blue-600 text-white">Get Started</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-black">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2664&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight mb-8">
              Make the most out of every conversation
            </h1>
            <p className="text-xl text-white/90 mb-10 max-w-lg leading-relaxed font-medium">
              Sell more, engage better, and grow your audience with powerful automations for Instagram, WhatsApp, TikTok, and Messenger.
            </p>
            <Link to="/signup">
              <Button className="h-14 px-8 rounded-full bg-[#ff00bf] hover:bg-[#d900a3] text-white font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,191,0.5)] transition-all hover:scale-105">
                Get Started
              </Button>
            </Link>

            <div className="mt-20 flex items-center gap-8 text-white/80">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full border border-black bg-blue-500"></div>
                  <div className="w-6 h-6 rounded-full border border-black bg-green-500"></div>
                </div>
                <span className="font-bold text-sm">Meta Business Partners</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white text-black p-1 rounded text-xs font-bold">G2</div>
                <div className="flex flex-col leading-none">
                  <div className="flex text-yellow-400 text-xs">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                  <span className="text-[10px] font-bold mt-0.5">4.6/5 STARS RATING</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating UI Elements (Mockups) */}
          <div className="relative hidden md:block h-[600px]">
            {/* Purple Card */}
            <div className="absolute top-1/4 right-10 bg-[#8b3dff] p-6 rounded-3xl rounded-br-none shadow-2xl max-w-xs animate-float-slow">
              <p className="text-white text-lg font-medium mb-4">
                Hey 👋 Here's that ebook you requested!
              </p>
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-none justify-center font-bold">
                Grab Your Guide
              </Button>
            </div>

            {/* Dark Bubble */}
            <div className="absolute bottom-1/3 right-1/3 bg-[#1a1a1a] p-4 rounded-3xl rounded-bl-none shadow-2xl max-w-xs flex items-center gap-3 animate-float-delayed">
              <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                <img src="https://i.pravatar.cc/150?img=32" alt="User" />
              </div>
              {/* <p className="text-white text-sm font-medium">
                Do you have a website where I can see more?
              </p> */}
            </div>
          </div>
        </div>
      </section>

      {/* Scale Up Section */}
      <section className="py-32 bg-white text-center">
        <div className="container mx-auto px-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-[#ff4f00] text-white p-4 rounded-full rounded-bl-none shadow-lg transform rotate-12">
                <span className="text-3xl font-bold">$</span>
              </div>
            </div>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 tracking-tight">
            Scale up your best<br />conversations
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
            Powerful automations for all the ways you engage and monetize.
          </p>
        </div>
      </section>

      {/* Yellow Bar */}
      <div className="h-24 bg-[#fff000] w-full"></div>

      {/* Footer (Simplified) */}
      <footer className="bg-black text-white py-12 border-t border-white/10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-2xl font-black tracking-tighter">Manychat</span>
          <div className="text-sm text-gray-400">
            © 2024 Manychat, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
