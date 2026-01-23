import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, X, Minus, MoveRight } from "lucide-react";

/* Aristide Benoist Style Portfolio 
  - Core: Organic Flex Layout Interaction, Custom Easing, Minimal Typography
*/

const projects = [
  {
    id: 1,
    title: "VOGUE",
    subtitle: "Editorial Design",
    year: "2024",
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1888&auto=format&fit=crop",
    description:
      "A digital editorial project reinterpreting the flow of modern fashion. Pursued harmony between bold layouts and delicate typography.",
  },
  {
    id: 2,
    title: "ARCHI",
    subtitle: "Brutalism Space",
    year: "2023",
    category: "Architecture",
    image:
      "https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=1887&auto=format&fit=crop",
    description:
      "An architectural photography archive exploring the materiality of concrete and light. Expressed the rough texture of Brutalism in a web space.",
  },
  {
    id: 3,
    title: "SONIC",
    subtitle: "Audio Interface",
    year: "2025",
    category: "Product",
    image:
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1887&auto=format&fit=crop",
    description:
      "Audio interface design visualizing sound waves. Combined haptic feedback with visual responsiveness.",
  },
  {
    id: 4,
    title: "NOIR",
    subtitle: "Film Photography",
    year: "2022",
    category: "Art Direction",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2073&auto=format&fit=crop",
    description:
      "Art direction project transferring the grain of black and white film to a digital canvas. Emphasized the contrast of light and shadow.",
  },
  {
    id: 5,
    title: "AERO",
    subtitle: "Future Mobility",
    year: "2024",
    category: "Concept",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
    description:
      "Mobility concept design proposing future urban movement. Solved aerodynamic forms through UI interaction.",
  },
];

// Custom Easing
const EASING =
  "transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

export default function App() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(
    null,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };
    window.addEventListener("mousemove", moveCursor);
    return () =>
      window.removeEventListener("mousemove", moveCursor);
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    // Prevent event propagation and reset state
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(null);
    setActiveId(null);
  };

  const selectedProject = projects.find(
    (p) => p.id === selectedId,
  );

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] text-[#f0f0f0] overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Custom Cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-4 h-4 bg-white rounded-full mix-blend-difference pointer-events-none z-50 -mt-2 -ml-2 transition-transform duration-75 ease-out hidden md:block"
      />

      {/* Loading Screen */}
      <div
        className={`absolute inset-0 z-[60] bg-black flex items-center justify-center transition-transform duration-1000 ease-[cubic-bezier(0.87,0,0.13,1)] ${isLoaded ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="text-8xl font-bold tracking-tighter animate-pulse">
          LOAD
        </div>
      </div>

      {/* Main Navigation Header */}
      <header
        className={`absolute top-0 left-0 w-full p-8 z-30 flex justify-between items-start mix-blend-difference pointer-events-none ${selectedId ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
      >
        <div className="pointer-events-auto">
          <h1 className="text-xl font-bold tracking-tight">
            ARISTIDE.INSPIRED
          </h1>
          <p className="text-xs text-gray-400 mt-1 tracking-widest uppercase">
            Portfolio 2026
          </p>
        </div>
        <div className="text-right hidden md:block pointer-events-auto">
          <p className="text-xs text-gray-400 uppercase tracking-widest">
            Available for work
          </p>
          <p className="text-xs font-bold mt-1">SEOUL, KR</p>
        </div>
      </header>

      {/* Main Gallery */}
      <main
        className={`flex flex-col md:flex-row w-full h-full transition-all duration-1000 ${selectedId ? "gap-0" : ""}`}
      >
        {projects.map((project, index) => {
          const isHovered = activeId === project.id;
          const isSelected = selectedId === project.id;
          const isAnySelected = selectedId !== null;

          let flexClass = "flex-1";

          // Desktop behavior
          const desktopFlexClass = (() => {
            if (activeId && !isAnySelected) {
              return isHovered
                ? "md:flex-[4]"
                : "md:flex-[0.5]";
            }
            if (isAnySelected) {
              return isSelected
                ? "md:flex-[100]"
                : "md:flex-[0] md:opacity-0 md:overflow-hidden md:w-0 md:border-none";
            }
            return "md:flex-1";
          })();

          return (
            <div
              key={project.id}
              className={`relative w-full md:w-auto md:h-full h-[20vh] border-b md:border-b-0 md:border-r border-white/10 last:border-0 cursor-pointer overflow-hidden group ${flexClass} ${desktopFlexClass} ${EASING} ${isSelected ? "h-full md:h-full flex-grow" : isAnySelected ? "h-0 border-none opacity-0" : "h-[20vh]"}`}
              onMouseEnter={() =>
                !selectedId && setActiveId(project.id)
              }
              onMouseLeave={() =>
                !selectedId && setActiveId(null)
              }
              onClick={() =>
                !selectedId && setSelectedId(project.id)
              }
            >
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={project.image}
                  alt={project.title}
                  className={`w-full h-full object-cover transition-all duration-1000 ease-out 
                    ${isHovered ? "scale-110 grayscale-0" : "scale-100 grayscale"} 
                    ${isSelected ? "scale-105 grayscale-0" : ""}
                  `}
                />
                <div
                  className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${isHovered || isSelected ? "opacity-0" : "opacity-60"}`}
                />
              </div>

              <div
                className={`absolute inset-0 flex flex-col justify-between p-6 md:p-12 transition-opacity duration-500 ${isHovered || isSelected ? "opacity-100" : "opacity-70"}`}
              >
                <div
                  className={`flex justify-between items-center transition-all duration-500 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                >
                  <span className="text-xs font-mono border border-white/30 rounded-full px-2 py-1">
                    0{index + 1}
                  </span>
                  <ArrowRight
                    className={`w-5 h-5 -rotate-45 transition-transform duration-500 ${isHovered ? "rotate-0" : ""}`}
                  />
                </div>

                <div className="relative mt-auto">
                  {!activeId && !selectedId && (
                    <div className="hidden md:block absolute bottom-0 left-0 origin-bottom-left -rotate-90 w-64">
                      <h2 className="text-2xl font-bold tracking-tighter text-white/50">
                        {project.title}
                      </h2>
                    </div>
                  )}

                  <div
                    className={`transform transition-all duration-700 ${isHovered || isSelected ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
                  >
                    <div className="flex items-end gap-4 mb-2 overflow-hidden">
                      <h2 className="text-4xl md:text-9xl font-bold tracking-tighter leading-none">
                        {project.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs md:text-base font-light tracking-wide text-gray-300">
                      <span className="uppercase">
                        {project.category}
                      </span>
                      <Minus className="w-4 h-4 text-gray-600" />
                      <span>{project.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Detail Page Overlay */}
      {selectedId && selectedProject && (
        <div className="fixed top-0 right-0 h-full w-full md:w-1/2 bg-[#0a0a0a]/95 backdrop-blur-xl z-[70] flex flex-col justify-center p-8 md:p-24 border-l border-white/10 transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] translate-x-0">
          {/* Close Button - fixed z-index and handler */}
          <button
            onClick={handleClose}
            className="absolute top-8 right-8 p-3 rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-300 group z-[80]"
            aria-label="Close detail"
          >
            <X className="w-6 h-6 transition-transform duration-500 group-hover:rotate-90" />
          </button>

          <div className="space-y-8 animate-in slide-in-from-right-10 fade-in duration-1000 fill-mode-forwards">
            <div>
              <p className="text-sm text-gray-500 mb-2 font-mono uppercase tracking-widest">
                Project Detail
              </p>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4">
                {selectedProject.title}
              </h1>
              <p className="text-xl md:text-2xl text-gray-400 font-light">
                {selectedProject.subtitle}
              </p>
            </div>

            <div className="w-full h-[1px] bg-white/20" />

            <div className="grid grid-cols-2 gap-8 text-sm font-mono text-gray-400">
              <div>
                <span className="block text-gray-600 mb-1 font-sans">
                  CLIENT
                </span>
                Global Brand
              </div>
              <div>
                <span className="block text-gray-600 mb-1 font-sans">
                  YEAR
                </span>
                {selectedProject.year}
              </div>
              <div>
                <span className="block text-gray-600 mb-1 font-sans">
                  ROLE
                </span>
                {selectedProject.category}
              </div>
              <div>
                <span className="block text-gray-600 mb-1 font-sans">
                  URL
                </span>
                Link{" "}
                <MoveRight className="inline w-3 h-3 ml-1" />
              </div>
            </div>

            <p className="text-lg leading-relaxed text-gray-300 max-w-md">
              {selectedProject.description}
            </p>

            <button className="mt-8 px-8 py-4 bg-white text-black font-bold tracking-widest hover:bg-gray-200 transition-colors uppercase text-xs">
              View Case Study
            </button>
          </div>
        </div>
      )}

      {/* Grain Effect */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>
    </div>
  );
}