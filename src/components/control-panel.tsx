'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings2, Sigma, Palette } from 'lucide-react';
import { SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from './ui/sidebar';

interface ControlPanelProps {
  fileLoaded: boolean;
  showWeeklyChart: boolean;
  onWeeklyChartToggle: () => void;
  onMaSettingsToggle: () => void;
  upColor: string;
  downColor: string;
  onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => void;
}

export function ControlPanel({
  fileLoaded,
  showWeeklyChart,
  onWeeklyChartToggle,
  onMaSettingsToggle,
  upColor,
  downColor,
  onCandleColorChange,
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

            <div className="flex items-center justify-between">
                <Label htmlFor="ma-settings-button" className="flex items-center gap-2">
                    <Sigma className="h-4 w-4" />
                    移動平均線 設定
                </Label>
                <Button variant="outline" size="icon" onClick={onMaSettingsToggle}>
                    <Sigma className="h-4 w-4" />
                </Button>
            </div>
            
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

          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  );
}
