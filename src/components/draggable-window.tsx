'use client';

import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XIcon, GripVerticalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableWindowProps {
  children: ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  className?: string;
}

export function DraggableWindow({
  children,
  title,
  isOpen,
  onClose,
  initialPosition = { x: 80, y: 120 },
  className,
}: DraggableWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!windowRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = windowRef.current.getBoundingClientRect();
    dragStartPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !windowRef.current) return;
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      className={cn('fixed z-40 w-[600px] h-[400px]', className)}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
    >
      <Card className="h-full w-full flex flex-col shadow-2xl bg-card/90 backdrop-blur-sm ring-1 ring-border">
        <CardHeader
          className="flex flex-row items-center justify-between p-2 space-y-0 border-b"
        >
          <div
            className="flex items-center gap-2 text-sm font-medium cursor-move flex-grow h-full"
            onMouseDown={handleMouseDown}
          >
            <GripVerticalIcon className="w-5 h-5 text-muted-foreground" />
            {title}
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">{children}</CardContent>
      </Card>
    </div>
  );
}
