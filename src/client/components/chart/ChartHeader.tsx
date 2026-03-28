import React, { useRef } from 'react';
import { AreaChart, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChartHeaderProps {
  title: string;
  fileLoaded: boolean;
  currency: string;
  originalCurrency?: string;
  exchangeRate?: number;
  isLoading: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleWeeklyChart: () => void;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  title,
  fileLoaded,
  currency,
  originalCurrency,
  exchangeRate,
  isLoading,
  onFileChange,
  onToggleWeeklyChart
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="p-2 border-b flex items-center gap-2 flex-shrink-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              id="wt-weekly-chart"
              variant="ghost" 
              size="icon" 
              onClick={onToggleWeeklyChart}
              disabled={!fileLoaded}
            >
              <AreaChart />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>週足</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="border-l h-6 mx-2"></div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold truncate">{title}</h1>
          {fileLoaded && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 whitespace-nowrap">
              単位: {currency === 'JPY' ? '円 (JPY)' : currency}
            </Badge>
          )}
        </div>
        {exchangeRate && (
          <span className="text-[10px] text-muted-foreground leading-none">
            {originalCurrency === 'USX' 
              ? `1 USX = ${(exchangeRate / 100).toFixed(4)} JPY で換算`
              : `1 ${originalCurrency} = ${exchangeRate.toFixed(2)} JPY で換算`
            }
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          accept=".json" 
          style={{ display: 'none' }} 
          disabled={isLoading} 
        />
        <Button id="wt-file-open" onClick={() => fileInputRef.current?.click()} disabled={isLoading} size="sm">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
          {isLoading ? '読込中...' : 'ファイルを開く'}
        </Button>
      </div>
    </header>
  );
};
