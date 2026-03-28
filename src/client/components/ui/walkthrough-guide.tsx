
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface WalkthroughStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onEnter?: () => void;
  onLeave?: () => void;
  onTargetClick?: () => void;
  advanceOnClick?: boolean; // ターゲットをクリックしたら次へ進む
}

interface WalkthroughGuideProps {
  steps: WalkthroughStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function WalkthroughGuide({ steps, isOpen, onClose, onComplete }: WalkthroughGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[currentStepIndex];

  const goToStep = useCallback((index: number) => {
    const prevStep = steps[currentStepIndex];
    if (prevStep && prevStep.onLeave) {
        prevStep.onLeave();
    }

    setCurrentStepIndex(index);

    const nextStep = steps[index];
    if (nextStep && nextStep.onEnter) {
        nextStep.onEnter();
    }
  }, [steps, currentStepIndex]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      onComplete();
    }
  }, [currentStepIndex, steps.length, onComplete, goToStep]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  // 初期化（isOpenがtrueになったとき）
  useEffect(() => {
    if (isOpen && steps.length > 0) {
        // 最初のステップのonEnterを実行
        const firstStep = steps[0];
        if (firstStep && firstStep.onEnter) {
            firstStep.onEnter();
        }
        setCurrentStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  // クリーンアップ（閉じるとき）
  useEffect(() => {
      if (!isOpen) return;
      return () => {
          const currentStep = steps[currentStepIndex];
          if (currentStep && currentStep.onLeave) {
              currentStep.onLeave();
          }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // 閉じる時だけ実行したいが、currentStepIndexが変わると再実行されるのを防ぐため依存配列を最小限に

  const updateTargetRect = useCallback(() => {
    if (!currentStep) return;
    const element = document.querySelector(currentStep.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // If target not found, skip to next step (or handle appropriately)
      // setTargetRect(null); 
    }
  }, [currentStep]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(updateTargetRect, 100);
      window.addEventListener('resize', updateTargetRect);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
      };
    }
  }, [isOpen, currentStepIndex, updateTargetRect]);

  if (!isOpen || !currentStep || !targetRect) return null;

  // Calculate popover position
  const popoverStyle: React.CSSProperties = {};
  const margin = 24; // Increased margin
  const popoverWidth = 320; // approximate

  // Simple positioning logic (can be enhanced)
  let top = targetRect.bottom + margin;
  let left = targetRect.left;

  if (currentStep.position === 'top') {
    top = targetRect.top - margin - 200; // rough height estimate
  } else if (currentStep.position === 'right') {
    left = targetRect.right + margin;
    top = targetRect.top;
  } else if (currentStep.position === 'left') {
    left = targetRect.left - margin - popoverWidth;
    top = targetRect.top;
  }

  // Boundary checks (basic)
  if (left < 10) left = 10;
  if (window.innerWidth > 0 && left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - 10;
  }
  if (top < 10) top = 10;

  // 4分割オーバーレイの計算
  const overlayColor = 'rgba(0, 0, 0, 0.5)';
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 4-part Overlay to ensure click-through on target */}
      {/* Top */}
      <div 
        className="absolute left-0 right-0 top-0 transition-all duration-300 ease-in-out pointer-events-auto"
        style={{ height: targetRect.top, backgroundColor: overlayColor }}
      />
      {/* Bottom */}
      <div 
        className="absolute left-0 right-0 bottom-0 transition-all duration-300 ease-in-out pointer-events-auto"
        style={{ top: targetRect.bottom, backgroundColor: overlayColor }}
      />
      {/* Left */}
      <div 
        className="absolute left-0 transition-all duration-300 ease-in-out pointer-events-auto"
        style={{ 
          top: targetRect.top, 
          height: targetRect.height, 
          width: targetRect.left, 
          backgroundColor: overlayColor 
        }}
      />
      {/* Right */}
      <div 
        className="absolute right-0 transition-all duration-300 ease-in-out pointer-events-auto"
        style={{ 
          top: targetRect.top, 
          height: targetRect.height, 
          left: targetRect.right, 
          backgroundColor: overlayColor 
        }}
      />
      
      {/* Target Highlight Border */}
      <div 
        className="absolute border-2 border-primary rounded transition-all duration-300 ease-in-out animate-pulse"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          pointerEvents: 'none'
        }}
      />

      {/* Proxy Click Layer for advanceOnClick */}
      {(currentStep.advanceOnClick || currentStep.onTargetClick) && (
        <div
          className="absolute cursor-pointer"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            zIndex: 1000, // Ensure it's on top
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.stopPropagation();
            
            if (currentStep.onTargetClick) {
                currentStep.onTargetClick();
            }
            
            const element = document.querySelector(currentStep.target) as HTMLElement;
            if (element) {
                element.click();
            }
            
            if (currentStep.advanceOnClick) {
                // 少し待ってから次へ進む（操作の結果を確認させるため）
                setTimeout(() => {
                  handleNext();
                }, 1000);
            }
          }}
        />
      )}

      {/* Guide Card */}
      <div 
        className="absolute pointer-events-auto transition-all duration-300 ease-in-out"
        style={{ 
            top: top, 
            left: left,
            maxWidth: '90vw',
            width: `${popoverWidth}px`
        }}
      >
        <Card className="shadow-lg border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">
              {currentStep.title} <span className="text-sm font-normal text-muted-foreground ml-2">({currentStepIndex + 1}/{steps.length})</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.content}
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrev} 
                disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> 前へ
            </Button>
            <Button size="sm" onClick={handleNext}>
              {currentStepIndex === steps.length - 1 ? '完了' : '次へ'} 
              {currentStepIndex !== steps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
