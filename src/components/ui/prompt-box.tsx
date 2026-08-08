import * as React from "react";
import { Plus, Mic, ArrowUp, Paperclip, Folder, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Optional Tooltip for actions
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-black px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface PromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  suggestion?: string;
  onToolsClick?: () => void;
}

export function PromptBox({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder = "What can villaoro help you find?",
  className,
  suggestion,
  onToolsClick
}: PromptBoxProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto group", className)}>
      {/* Siri-like glowing aura effect behind the prompt box when focused */}
      <div 
        className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-[24px] blur opacity-0 transition-opacity duration-500 group-hover:opacity-20",
          isFocused && "opacity-40 animate-pulse duration-1000"
        )} 
      />
      
      <div 
        className={cn(
          "relative flex flex-col w-full rounded-[24px] overflow-hidden transition-all duration-300 shadow-sm",
          isFocused ? "bg-white border-black/10 shadow-lg" : "bg-[rgba(118,118,128,0.08)] border-transparent"
        )}
        style={{
          border: isFocused ? '0.5px solid rgba(0,0,0,0.1)' : '0.5px solid rgba(0,0,0,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="relative w-full min-h-[44px] flex items-start">
          {/* Suggestion Text Overlay */}
          {suggestion && isFocused && value && suggestion.toLowerCase().startsWith(value.toLowerCase()) && (
            <div className="absolute left-[16px] top-[14px] pointer-events-none flex items-center text-[14px] text-[#bbb] whitespace-pre overflow-hidden z-0">
              <span className="opacity-0">{value}</span>
              <span>{suggestion.slice(value.length)}</span>
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent px-4 py-3.5 text-[14px] sm:text-[15px] outline-none text-black placeholder:text-[#888] relative z-10 leading-relaxed overflow-y-auto no-scrollbar"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1.5">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onToolsClick}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black/60 hover:text-black transition-colors"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Tools & Filters</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-black/5 text-black/50 hover:text-black transition-colors">
                    <Mic size={18} strokeWidth={2.2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Voice Search</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center">
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                value.trim() 
                  ? "bg-black text-white hover:bg-black/80 hover:scale-105 shadow-md" 
                  : "bg-black/5 text-black/20 cursor-not-allowed"
              )}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
