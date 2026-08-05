import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

type TourStep = {
  target: string;
  titleKey: string;
  descKey: string;
};

const steps: TourStep[] = [
  { target: '[data-tour="search-bar"]', titleKey: 'tour_step1_title', descKey: 'tour_step1_desc' },
  { target: '[data-tour="product-card"]', titleKey: 'tour_step2_title', descKey: 'tour_step2_desc' },
  { target: '[data-tour="category-scroll"]', titleKey: 'tour_step3_title', descKey: 'tour_step3_desc' },
];

export const AppTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("tour_completed");
    if (!hasSeenTour) {
      // Delay to ensure the DOM is painted and elements are mounted
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateRect = useCallback(() => {
    if (!isVisible) return;
    
    // Quick delay to allow DOM transitions before grabbing rect
    setTimeout(() => {
      const targetEl = document.querySelector(steps[currentStep].target);
      if (targetEl) {
        setTargetRect(targetEl.getBoundingClientRect());
        
        // Calculate scroll needed to bring the element to the center
        const rect = targetEl.getBoundingClientRect();
        const isVisibleInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );

        if (!isVisibleInViewport) {
           targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setTargetRect(null);
      }
    }, 100);
  }, [currentStep, isVisible]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [updateRect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      completeTour();
    }
  };

  const completeTour = () => {
    localStorage.setItem("tour_completed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  const padding = 12;
  const cutoutStyle = targetRect ? {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: 24,
  } : {
    top: window.innerHeight / 2,
    left: window.innerWidth / 2,
    width: 0,
    height: 0,
    borderRadius: 0,
  };

  // Determine tooltip placement based on target position
  const isTopHalf = targetRect ? targetRect.top < window.innerHeight / 2 : true;
  
  const tooltipStyle = targetRect ? (isTopHalf ? {
    top: targetRect.bottom + padding + 24,
    left: '50%',
    transform: 'translateX(-50%)'
  } : {
    bottom: (window.innerHeight - targetRect.top) + padding + 24,
    left: '50%',
    transform: 'translateX(-50%)'
  }) : {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* Overlay Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="pointer-events-auto">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <motion.rect 
                  initial={false}
                  animate={{
                    x: cutoutStyle.left,
                    y: cutoutStyle.top,
                    width: cutoutStyle.width,
                    height: cutoutStyle.height,
                    rx: cutoutStyle.borderRadius,
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(0, 0, 0, 0.65)" 
            mask="url(#tour-mask)" 
          />
        </svg>
      </motion.div>

      {/* Pop-up Dialog */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: isTopHalf ? -20 : 20, x: "-50%", scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: isTopHalf ? 20 : -20, x: "-50%", scale: 0.95 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute w-[90%] max-w-[340px] bg-white rounded-[32px] p-6 shadow-2xl border border-black/5 flex flex-col items-center text-center z-10"
          style={tooltipStyle}
        >
          <div className="flex gap-1.5 mb-6">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-black' : 'w-1.5 bg-black/10'}`} 
              />
            ))}
          </div>

          <h3 className="text-[19px] font-bold text-zinc-900 mb-2.5 tracking-tight">
            {t(currentStepData.titleKey) || "Title"}
          </h3>
          <p className="text-[15px] text-zinc-500 font-medium leading-relaxed mb-7 px-1">
            {t(currentStepData.descKey) || "Description"}
          </p>

          <div className="flex w-full gap-3">
            <button 
              onClick={completeTour}
              className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 transition-colors"
            >
              {t('skip') || "Pular"}
            </button>
            <button 
              onClick={handleNext}
              className="flex-1 py-3.5 rounded-2xl text-[15px] font-semibold text-white bg-black hover:bg-zinc-800 transition-colors shadow-md"
            >
              {currentStep < steps.length - 1 ? (t('tour_next') || "Próximo") : (t('tour_done') || "Concluir")}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default AppTour;
