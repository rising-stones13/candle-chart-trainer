'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, UploadCloud, Play, Settings2, Sigma } from 'lucide-react';
import { format } from 'date-fns';
import type { MAConfig } from '@/types';

interface ControlPanelProps {
  fileLoaded: boolean;
  isReplay: boolean;
  replayDate: Date | null;
  maConfigs: Record<string, MAConfig>;
  showWeeklyChart: boolean;
  isLogScale: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStartReplay: () => void;
  onNextDay: () => void;
  onDateChange: (date?: Date) => void;
  onMaToggle: (period: string) => void;
  onWeeklyChartToggle: () => void;
  onScaleToggle: () => void;
}

export function ControlPanel({
  fileLoaded,
  isReplay,
  replayDate,
  maConfigs,
  showWeeklyChart,
  isLogScale,
  onFileChange,
  onStartReplay,
  onNextDay,
  onDateChange,
  onMaToggle,
  onWeeklyChartToggle,
  onScaleToggle,
}: ControlPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">コントロールパネル</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col gap-6 overflow-y-auto">
        
        <div>
          <Label htmlFor="file-upload" className="text-base font-semibold">1. データ読み込み</Label>
          <Input id="file-upload" type="file" accept=".csv,.json" onChange={onFileChange} ref={fileInputRef} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="w-full mt-2">
            <UploadCloud className="mr-2 h-4 w-4" />
            CSV/JSONファイルを選択
          </Button>
        </div>
        
        <Separator />

        <div className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <Label className="text-base font-semibold">2. リプレイ機能</Label>
          <div className="mt-2 space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {replayDate ? format(replayDate, 'PPP') : <span>開始日を選択</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={replayDate || undefined} onSelect={onDateChange} initialFocus />
              </PopoverContent>
            </Popover>
            <Button onClick={onStartReplay} disabled={!replayDate || isReplay} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              リプレイ開始
            </Button>
            <Button onClick={onNextDay} disabled={!isReplay} className="w-full">
              翌日へ進む
            </Button>
          </div>
        </div>

        <Separator />
        
        <div className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <Label className="text-base font-semibold">3. 表示設定</Label>
          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-chart-toggle" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                週足チャート表示
              </Label>
              <Switch id="weekly-chart-toggle" checked={showWeeklyChart} onCheckedChange={onWeeklyChartToggle} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="log-scale-toggle" className="flex items-center gap-2">
                <Sigma className="h-4 w-4" />
                対数スケール
              </Label>
              <Switch id="log-scale-toggle" checked={isLogScale} onCheckedChange={onScaleToggle} />
            </div>
            
            <div>
              <Label className="font-medium">移動平均線 (MA)</Label>
              <div className="space-y-3 mt-2">
                {Object.values(maConfigs).map(config => (
                  <div key={config.period} className="flex items-center justify-between">
                    <Label htmlFor={`ma-toggle-${config.period}`} style={{ color: config.color }}>
                      {config.period}日 MA
                    </Label>
                    <Switch id={`ma-toggle-${config.period}`} checked={config.visible} onCheckedChange={() => onMaToggle(config.period.toString())} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
