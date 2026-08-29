import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getDesignSettings } from "@/lib/store";
import { useTourNarration } from "@/hooks/useTourNarration";
import type { VOICE_CUES } from "@/lib/voiceLines";

type TourStep = {
  target: string;
  titleKey: string;
  descKey: string;
};

// Same fix as CartTour: these were literal sentences handed to `t()`, which
// reverses the word order for PT and ES.
const steps: TourStep[] = [
  { target: '[data-tour="checkout-address"]', titleKey: 'checkout_tour_step1_title', descKey: 'checkout_tour_step1_desc' },
  { target: '[data-tour="checkout-summary"]', titleKey: 'checkout_tour_step2_title', descKey: 'checkout_tour_step2_desc' },
  { target: '[data-tour="checkout-payment"]', titleKey: 'checkout_tour_step3_title', descKey: 'checkout_tour_step3_desc' },
];

/** What the assistant says at each step, in the same order. */
const cueIds: (keyof typeof VOICE_CUES)[] = ['checkout_tour_1', 'checkout_tour_2', 'checkout_tour_3'];

interface CheckoutTourProps {
  onStepChange?: (step: number) => void;
}

export const CheckoutTour = ({ onStepChange }: CheckoutTourProps = {}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  useTourNarration(cueIds, currentStep, isVisible);

  useEffect(() => {
    if (loading) return;

    const hasSeenTour = localStorage.getItem("checkout_tour_completed");
    
    // Check if the current user is designated to always see the tour
    const settings = getDesignSettings();
    const alwaysShowEmail = settings.alwaysShowTourEmail?.trim().toLowerCase();
    const userEmail = user?.email?.trim().toLowerCase();
    const isAlwaysShow = alwaysShowEmail && userEmail && alwaysShowEmail === userEmail;

    // Reset current step when making it visible again
    if (isAlwaysShow || !hasSeenTour) {
      setCurrentStep(0);
      // Delay to ensure the DOM is painted and elements are mounted
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  useEffect(() => {
    if (isVisible && onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, isVisible, onStepChange]);

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

        if (!isVisibleInViewport || currentStep > 0) {
           targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // If element is not found, skip to next or close
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
    localStorage.setItem("checkout_tour_completed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Wait until rect is found to show the tooltip (if the element doesn't exist, we might want to skip it, but for now we wait)
  if (!targetRect) {
    // If element doesn't exist, auto-advance after a small delay
    setTimeout(() => {
       handleNext();
    }, 500);
    return null;
  }

  const currentStepData = steps[currentStep];

  const padding = 12;
  const margin = 12; // Minimum margin from screen edge

  let cutoutTop = window.innerHeight / 2;
  let cutoutLeft = window.innerWidth / 2;
  let cutoutWidth = 0;
  let cutoutHeight = 0;
  let cutoutRadius = 0;

  if (targetRect) {
    cutoutTop = targetRect.top - padding;
    cutoutLeft = targetRect.left - padding;
    cutoutWidth = targetRect.width + padding * 2;
    cutoutHeight = targetRect.height + padding * 2;
    cutoutRadius = 24;

    // Constrain to screen boundaries to avoid overflowing
    if (cutoutLeft < margin) {
      cutoutWidth -= (margin - cutoutLeft);
      cutoutLeft = margin;
    }
    if (cutoutLeft + cutoutWidth > window.innerWidth - margin) {
      cutoutWidth = window.innerWidth - margin - cutoutLeft;
    }
    if (cutoutTop < margin) {
      cutoutHeight -= (margin - cutoutTop);
      cutoutTop = margin;
    }
    if (cutoutTop + cutoutHeight > window.innerHeight - margin) {
      cutoutHeight = window.innerHeight - margin - cutoutTop;
    }
  }

  const cutoutStyle = {
    top: cutoutTop,
    left: cutoutLeft,
    width: cutoutWidth,
    height: cutoutHeight,
    borderRadius: cutoutRadius,
  };

  // Determine tooltip placement based on target position
  const tooltipHeight = 260; // Approximate height
  const tooltipWidth = 340;
  const spaceAbove = targetRect ? targetRect.top : 0;
  
  // Try to place above if there's space, else below
  const placeBelow = targetRect ? spaceAbove < tooltipHeight + 30 : true;
  
  // Horizontal alignment: Center with the target, but keep within screen bounds
  let leftPos: string | number = '50%';
  if (targetRect) {
    const targetCenter = targetRect.left + targetRect.width / 2;
    const halfWidth = window.innerWidth < 640 ? 150 : 170; // Half of max-w
    leftPos = Math.max(halfWidth + 10, Math.min(targetCenter, window.innerWidth - halfWidth - 10));
  }
  
  type Placement = 'top' | 'bottom' | 'left' | 'right';
  let placement: Placement = placeBelow ? 'bottom' : 'top';
  let tooltipStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

  if (targetRect) {
    const isDesktop = window.innerWidth >= 768;
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;
    
    // For Desktop logic on Checkout
    if (isDesktop && currentStep === 0) { // Address
      if (spaceRight >= tooltipWidth + 24) {
        placement = 'right';
      }
    } else if (isDesktop && (currentStep === 1 || currentStep === 2)) { // Summary or Payment
      if (spaceLeft >= tooltipWidth + 24) {
        placement = 'left';
      }
    }

    if (placement === 'right') {
      tooltipStyle = {
        top: targetRect.top + targetRect.height / 2,
        left: targetRect.right + padding + 24,
        transform: 'translateY(-50%)'
      };
    } else if (placement === 'left') {
      tooltipStyle = {
        top: targetRect.top + targetRect.height / 2,
        right: window.innerWidth - targetRect.left + padding + 24,
        transform: 'translateY(-50%)'
      };
    } else if (placement === 'bottom') {
      const desiredTop = targetRect.bottom + padding + 16;
      const maxTop = window.innerHeight - tooltipHeight - 24; // 24px bottom margin
      
      tooltipStyle = {
        top: !isDesktop ? Math.min(desiredTop, maxTop) : desiredTop,
        left: leftPos,
        transform: 'translateX(-50%)'
      };
    } else if (placement === 'top') {
      const desiredBottom = (window.innerHeight - targetRect.top) + padding + 16;
      const maxBottom = window.innerHeight - tooltipHeight - 24; // 24px top margin
      
      tooltipStyle = {
        bottom: !isDesktop ? Math.min(desiredBottom, maxBottom) : desiredBottom,
        left: leftPos,
        transform: 'translateX(-50%)'
      };
    }
  }

  // Animation values based on placement
  let initialAnim: any = { opacity: 0, scale: 0.95, x: "-50%", y: -20 };
  let animateAnim: any = { opacity: 1, scale: 1, x: "-50%", y: 0 };
  let exitAnim: any = { opacity: 0, scale: 0.95, x: "-50%", y: 20 };

  if (placement === 'top') {
    initialAnim = { opacity: 0, scale: 0.95, x: "-50%", y: 20 };
    animateAnim = { opacity: 1, scale: 1, x: "-50%", y: 0 };
    exitAnim = { opacity: 0, scale: 0.95, x: "-50%", y: -20 };
  } else if (placement === 'right') {
    initialAnim = { opacity: 0, scale: 0.95, x: -20, y: "-50%" };
    animateAnim = { opacity: 1, scale: 1, x: 0, y: "-50%" };
    exitAnim = { opacity: 0, scale: 0.95, x: -20, y: "-50%" };
  } else if (placement === 'left') {
    initialAnim = { opacity: 0, scale: 0.95, x: 20, y: "-50%" };
    animateAnim = { opacity: 1, scale: 1, x: 0, y: "-50%" };
    exitAnim = { opacity: 0, scale: 0.95, x: 20, y: "-50%" };
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none">
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

      {/* Invisible click blockers around the cutout */}
      {targetRect && (
        <>
          <motion.div 
            className="absolute top-0 left-0 right-0 pointer-events-auto" 
            animate={{ height: cutoutStyle.top }} 
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 right-0 pointer-events-auto" 
            animate={{ top: cutoutStyle.top + cutoutStyle.height }} 
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          <motion.div 
            className="absolute left-0 pointer-events-auto" 
            animate={{ top: cutoutStyle.top, height: cutoutStyle.height, width: cutoutStyle.left }} 
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          <motion.div 
            className="absolute right-0 pointer-events-auto" 
            animate={{ top: cutoutStyle.top, height: cutoutStyle.height, left: cutoutStyle.left + cutoutStyle.width }} 
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </>
      )}

      {/* Pop-up Dialog */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={initialAnim}
          animate={animateAnim}
          exit={exitAnim}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="absolute w-[92%] max-w-[300px] sm:max-w-[340px] bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl border border-black/5 flex flex-col items-center text-center z-10 pointer-events-auto"
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
export default CheckoutTour;
