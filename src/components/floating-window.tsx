'use client';

import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XIcon, GripVerticalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface FloatingWindowProps {
  children: (size: { width: number; height: number }) => ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onInteractionEnd?: () => void;
  initialPosition?: { x: number; y: number };
  className?: string;
}

const defaultInitialPosition = { x: 80, y: 120 };
const defaultInitialSize = { width: 600, height: 400 };
const minSize = { width: 300, height: 200 };

export function FloatingWindow({
  children,
  title,
  isOpen,
  onClose,
  onInteractionEnd,
  initialPosition = defaultInitialPosition,
  className,
}: DraggableWindowProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const getInitialSize = () => isMobile 
    ? { width: window.innerWidth - 32, height: window.innerHeight / 2 } 
    : defaultInitialSize;

  const [position, setPosition] = useState(isMobile ? { x: 16, y: 120 } : initialPosition);
  const [size, setSize] = useState(getInitialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, mouseX: 0, mouseY: 0 });

  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    });
  }, [isOpen, size.width, size.height]);
  
  useEffect(() => {
    if (isMobile) {
      setPosition({ x: 16, y: 120 });
      setSize(getInitialSize());
    } else {
      setPosition(initialPosition);
      setSize(defaultInitialSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // --- Dragging Logic ---
  const handleDragStart = (e: MouseEvent | TouchEvent) => {
    if (!windowRef.current) return;
    if ('button' in e && e.button !== 0) return; // Ignore right-clicks
    
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
    
    dragStartRef.current = {
      ...dragStartRef.current,
      x: pageX - rect.left,
      y: pageY - rect.top,
    };
    
    e.stopPropagation();
    document.body.style.userSelect = 'none';
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
    setPosition({
      x: pageX - dragStartRef.current.x,
      y: pageY - dragStartRef.current.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    onInteractionEnd?.();
  };
  
  // --- Resizing Logic ---
  const handleResizeStart = (e: MouseEvent | TouchEvent) => {
    if ('button' in e && e.button !== 0) return; // Ignore right-clicks

    setIsResizing(true);
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;

    dragStartRef.current = {
      ...dragStartRef.current,
      width: size.width,
      height: size.height,
      mouseX: pageX,
      mouseY: pageY,
    };
    
    e.stopPropagation();
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!isResizing) return;
    const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;

    const newWidth = dragStartRef.current.width + (pageX - dragStartRef.current.mouseX);
    const newHeight = dragStartRef.current.height + (pageY - dragStartRef.current.mouseY);
    
    setSize({
      width: Math.max(newWidth, minSize.width),
      height: Math.max(newHeight, minSize.height),
    });
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.userSelect = '';
    onInteractionEnd?.();
  };

  // --- Event Listener Registration ---
  useEffect(() => {
    const headerEl = headerRef.current;
    const resizeHandleEl = resizeHandleRef.current;

    if (!headerEl || !resizeHandleEl) return;

    const onDragStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handleDragStart(e);
    };

    const onResizeStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handleResizeStart(e);
    };

    headerEl.addEventListener('mousedown', onDragStart);
    headerEl.addEventListener('touchstart', onDragStart, { passive: false });
    resizeHandleEl.addEventListener('mousedown', onResizeStart);
    resizeHandleEl.addEventListener('touchstart', onResizeStart, { passive: false });

    return () => {
      headerEl.removeEventListener('mousedown', onDragStart);
      headerEl.removeEventListener('touchstart', onDragStart as EventListener);
      resizeHandleEl.removeEventListener('mousedown', onResizeStart);
      resizeHandleEl.removeEventListener('touchstart', onResizeStart as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // --- Move/End Event Listeners ---
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isDragging) handleDragMove(e);
      if (isResizing) handleResizeMove(e);
    };
    const handleEnd = () => {
      if (isDragging) handleDragEnd();
      if (isResizing) handleResizeEnd();
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing]);

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      className={cn('fixed z-40', className)}
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
    >
      <Card className="h-full w-full flex flex-col shadow-2xl bg-card/90 backdrop-blur-sm ring-1 ring-border overflow-hidden relative">
        <CardHeader
          ref={headerRef}
          className="flex flex-row items-center justify-between p-2 space-y-0 border-b cursor-move"
        >
          <div className="flex items-center gap-2 text-sm font-medium flex-grow h-full">
            <GripVerticalIcon className="w-5 h-5 text-muted-foreground" />
            {title}
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {isReady && children(size)}
        </CardContent>
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-end justify-end p-1"
        >
          <div className="w-3 h-3 rounded-br-lg border-r-2 border-b-2 border-muted-foreground/50" />
        </div>
      </Card>
    </div>
  );
}
