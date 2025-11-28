'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, Sigma, Palette } from 'lucide-react';
import { SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from './ui/sidebar';
import type { MAConfig } from '@/types';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

interface ControlPanelProps {
  fileLoaded: boolean;
  showWeeklyChart: boolean;
  onWeeklyChartToggle: () => void;
  upColor: string;
  downColor: string;
  onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => void;
  maConfigs: Record<string, MAConfig>;
  onMaToggle: (period: string) => void;
}

export function ControlPanel({
  fileLoaded,
  showWeeklyChart,
  onWeeklyChartToggle,
  upColor,
  downColor,
  onCandleColorChange,
  maConfigs,
  onMaToggle,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader>
        <h2 className="text-lg font-semibold sr-only">コントロールパネル</h2>
      </SidebarHeader>
      <div className="flex-grow overflow-y-auto">
        <SidebarGroup className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <SidebarGroupLabel>表示設定</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-chart-toggle" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                週足チャート表示
              </Label>
              <Switch id="weekly-chart-toggle" checked={showWeeklyChart} onCheckedChange={onWeeklyChartToggle} />
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                チャート配色
              </Label>
              <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <Label htmlFor="up-color-picker">陽線</Label>
                      <Input 
                        id="up-color-picker"
                        type="color" 
                        value={upColor}
                        onChange={(e) => onCandleColorChange('upColor', e.target.value)}
                        className="w-16 h-8 p-1"
                      />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="down-color-picker">陰線</Label>
                      <Input
                        id="down-color-picker"
                        type="color"
                        value={downColor}
                        onChange={(e) => onCandleColorChange('downColor', e.target.value)}
                        className="w-16 h-8 p-1"
                      />
                  </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sigma className="h-4 w-4" />
                移動平均線 (MA)
              </Label>
              <div className="space-y-4 pt-2">
                {Object.values(maConfigs).map(config => (
                  <div key={config.period} className="flex items-center justify-between">
                    <Label htmlFor={`ma-toggle-${config.period}`} className="text-base" style={{ color: config.color }}>
                      {config.period}日 MA
                    </Label>
                    <Switch
                      id={`ma-toggle-${config.period}`}
                      checked={config.visible}
                      onCheckedChange={() => onMaToggle(config.period.toString())}
                    />
                  </div>
                ))}
              </div>
            </div>

          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  );
}
