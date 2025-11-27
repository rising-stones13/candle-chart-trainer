# **App Name**: ChartTrade Trainer

## Core Features:

- Data Upload & Ticker Identification: Upload local CSV/JSON files (Yahoo Finance format). Use Gemini as a tool to identify the official ticker symbol and Japanese company name from the filename and metadata to be used as the chart title.
- Candlestick Chart Display (Lightweight Charts): Display daily candlestick charts with volume data. Users can switch between linear and logarithmic scales. Includes zooming and panning functionality.
- Weekly Chart Overlay: Calculate and generate weekly candlestick data from daily data and display it as a draggable, floating window on top of the daily chart (toggleable).
- Moving Averages: Calculate and display 5, 10, 20, 50, and 100-day moving averages. Provide a settings panel to toggle the visibility of each line.
- Playback/Replay Function: Specify a past date and hide all subsequent data. A 'Next Day' button advances the chart one candlestick at a time.
- Simulated Trading: Enable buy/sell (entry/exit) for both long and short (short sell/buy to cover) positions. Real-time calculation of average acquisition price and unrealized profit/loss, only enabled during playback mode.
- Profit/Loss Display: Calculate and display both realized and unrealized profit/loss in JPY (Japanese Yen). All UI text should be in Japanese.

## Style Guidelines:

- The overall theme is a dark mode with dark gray tones, reminiscent of finance and trading applications. Background color: Dark gray (#212529).
- Primary color: Soft blue (#64B5F6) for interactive elements and important information, suggesting reliability.
- Accent color: Subtle teal (#26A69A) to highlight profitable trades and positive changes.
- Body and headline font: 'Inter' (sans-serif) for a clean, modern, and readable interface.  This font is used throughout the application for both headlines and body text.
- Use minimalist icons from a set like Remix Icon, providing a simple, clean appearance. The style should be a thin stroke.
- Maximize chart space. Panels should be collapsible and arranged to provide an optimal view of the data. Use Tailwind CSS grid for responsiveness.
- Subtle animations on data updates, such as price changes or new candlesticks appearing in replay mode, to provide a dynamic feel.