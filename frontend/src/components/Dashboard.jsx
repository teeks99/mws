import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

export default function Dashboard({ location, onToggleSidebar, unitSystem, theme = 'dark' }) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = React.useRef(null);
  const [chartHeight, setChartHeight] = useState(530);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Ensure a minimum height of 530px for readability, otherwise stretch to fill
        setChartHeight(Math.max(530, Math.floor(entries[0].contentRect.height)));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading, forecast, location]);

  useEffect(() => {
    if (!location) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/forecast/${location.name}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error);
        } else {
          setForecast(data);
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [location]);

  const isDark = theme === 'dark';
  const colorTextSecondary = isDark ? '#94a3b8' : '#64748b';
  const colorTextPrimary = isDark ? '#f8fafc' : '#0f172a';
  const colorSplitLine = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const colorTooltipBg = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const colorTooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const colorAxisPointer = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
  const colorButtonBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  if (!location) {
    return (
      <div className="dashboard" style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', top: '24px', left: '24px'}}>
          <button className="btn-primary" onClick={onToggleSidebar} style={{background: colorButtonBg, color: colorTextPrimary, padding: '8px'}}>
            <Menu size={24} />
          </button>
        </div>
        <div style={{textAlign: 'center', color: colorTextSecondary}}>
          <h2 style={{fontSize: '2rem', marginBottom: '8px'}}>No Location Selected</h2>
          <p>Select a location from the sidebar or add a new one.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="dashboard" style={{justifyContent: 'center', alignItems: 'center'}}>Loading forecast...</div>;
  }

  if (error) {
    return <div className="dashboard" style={{justifyContent: 'center', alignItems: 'center', color: '#ef4444'}}>Error: {error}</div>;
  }

  if (!forecast || forecast.length === 0) {
    return <div className="dashboard" style={{justifyContent: 'center', alignItems: 'center'}}>No forecast data available yet. Please wait for the background worker.</div>;
  }

  // Parse data for charts
  const times = forecast.map(d => d.timestamp);
  
  // Unit conversion helpers
  const isUS = unitSystem === 'us';
  const convertTemp = (c) => isUS && c != null ? (c * 9/5) + 32 : c;
  const convertSpeed = (kmh) => isUS && kmh != null ? kmh / 1.60934 : kmh;
  const convertPressure = (pa) => isUS && pa != null ? pa * 0.0002953 : pa; // Pa to inHg

  const getCardinalDirection = (angle) => {
    if (angle == null) return '';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(angle / 22.5) % 16];
  };

  const temps = forecast.map(d => convertTemp(d.temperature));
  const dews = forecast.map(d => convertTemp(d.dewpoint));
  const feels = forecast.map(d => convertTemp(d.apparentTemperature));

  const precips = forecast.map(d => d.probabilityOfPrecipitation);
  const humids = forecast.map(d => d.relativeHumidity);
  const clouds = forecast.map(d => d.skyCover);

  const windSpeeds = forecast.map(d => convertSpeed(d.windSpeed));
  const windDirs = forecast.map(d => d.windDirection);
  const pressures = forecast.map(d => convertPressure(d.pressure));

  const xAxisCommon = {
    type: 'time',
    boundaryGap: false,
    axisLabel: {
      color: colorTextSecondary,
      hideOverlap: true,
      align: 'left',
      padding: [0, 0, 0, 6], // Add a 6px left margin to detach from the tick line
      formatter: (value, index) => {
        const date = new Date(value);
        const hours = date.getHours();
        const mins = date.getMinutes();
        
        // Emphasize the day at midnight OR the very first tick on the axis
        if ((hours === 0 && mins === 0) || index === 0) {
          const dayStr = date.toLocaleDateString(undefined, { weekday: 'short' });
          const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return `{dayStyle|${dayStr}\n${dateStr}}`;
        } else {
          if (isUS) {
            const ampm = hours >= 12 ? 'pm' : 'am';
            const h = hours % 12 || 12;
            const m = mins > 0 ? `:${mins.toString().padStart(2, '0')}` : '';
            return `${h}${m} ${ampm}`;
          } else {
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          }
        }
      },
      rich: {
        dayStyle: {
          color: colorTextPrimary,
          fontWeight: 'bold',
          lineHeight: 18
        }
      }
    },
    splitLine: { show: true, lineStyle: { color: colorSplitLine } }
  };

  // Dynamic layout calculations based on exact pixel height of container
  const CH = Math.floor((chartHeight - 260) / 3);
  const grid1Top = 40;
  const legend2Top = grid1Top + CH + 46;
  const grid2Top = grid1Top + CH + 74;
  const legend3Top = grid2Top + CH + 46;
  const grid3Top = grid2Top + CH + 74;

  const combinedOption = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: colorAxisPointer } },
      backgroundColor: colorTooltipBg,
      borderColor: colorTooltipBorder,
      textStyle: { color: colorTextPrimary }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1, 2], start: 0, end: 100, filterMode: 'none' },
      { type: 'slider', xAxisIndex: [0, 1, 2], start: 0, end: 100, bottom: 5, height: 20, textStyle: { color: colorTextSecondary }, filterMode: 'none' }
    ],
    legend: [
      { data: ['Temperature', 'Dew Point', 'Feels Like'], top: 8, textStyle: { color: colorTextSecondary } },
      { data: ['Precip Chance', 'Humidity', 'Cloud Cover'], top: legend2Top, textStyle: { color: colorTextSecondary } },
      { data: ['Wind Speed', 'Wind Dir', 'Pressure'], top: legend3Top, textStyle: { color: colorTextSecondary } }
    ],
    grid: [
      { left: 45, right: 55, top: grid1Top, height: CH },
      { left: 45, right: 55, top: grid2Top, height: CH },
      { left: 45, right: 55, top: grid3Top, height: CH }
    ],
    xAxis: [
      { ...xAxisCommon, gridIndex: 0 },
      { ...xAxisCommon, gridIndex: 1 },
      { ...xAxisCommon, gridIndex: 2 }
    ],
    yAxis: [
      { 
        gridIndex: 0, type: 'value', name: isUS ? '°F' : '°C', axisLabel: { color: colorTextSecondary }, splitLine: { lineStyle: { color: colorSplitLine } },
        min: (val) => Math.floor(val.min - (isUS ? 5 : 3)),
        max: (val) => Math.ceil(val.max + (isUS ? 5 : 3))
      },
      { gridIndex: 1, type: 'value', name: '%', max: 100, axisLabel: { color: colorTextSecondary }, splitLine: { lineStyle: { color: colorSplitLine } } },
      { gridIndex: 2, type: 'value', name: isUS ? 'mph' : 'km/h', position: 'left', axisLabel: { color: colorTextSecondary }, splitLine: { lineStyle: { color: colorSplitLine } } },
      { gridIndex: 2, type: 'value', name: isUS ? 'inHg' : 'Pa', position: 'right', scale: true, axisLabel: { color: colorTextSecondary }, splitLine: { lineStyle: { color: colorSplitLine } } },
      { gridIndex: 2, type: 'value', show: false } // Invisible 3rd axis for Wind Dir tooltips
    ],
    series: [
      // Chart 1
      { name: 'Temperature', xAxisIndex: 0, yAxisIndex: 0, type: 'line', data: temps.map((v, i) => [times[i], v]), itemStyle: { color: '#ef4444' }, smooth: true, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(isUS ? 0 : 1) : val } },
      { name: 'Dew Point', xAxisIndex: 0, yAxisIndex: 0, type: 'line', data: dews.map((v, i) => [times[i], v]), itemStyle: { color: '#10b981' }, smooth: true, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(isUS ? 0 : 1) : val } },
      { name: 'Feels Like', xAxisIndex: 0, yAxisIndex: 0, type: 'line', data: feels.map((v, i) => [times[i], v]), itemStyle: { color: '#8b5cf6' }, smooth: true, lineStyle: { type: 'dashed' }, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(isUS ? 0 : 1) : val } },
      
      // Chart 2
      { name: 'Precip Chance', xAxisIndex: 1, yAxisIndex: 1, type: 'bar', data: precips.map((v, i) => [times[i], v]), itemStyle: { color: '#0ea5e9', opacity: 0.25 }, barMaxWidth: 10, tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(0) + '%' : val } },
      { name: 'Humidity', xAxisIndex: 1, yAxisIndex: 1, type: 'line', data: humids.map((v, i) => [times[i], v]), itemStyle: { color: '#3b82f6' }, smooth: true, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(0) + '%' : val } },
      { name: 'Cloud Cover', xAxisIndex: 1, yAxisIndex: 1, type: 'line', data: clouds.map((v, i) => [times[i], v]), itemStyle: { color: '#64748b' }, smooth: true, areaStyle: { opacity: 0.1 }, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(0) + '%' : val } },
      
      // Chart 3
      { name: 'Wind Speed', xAxisIndex: 2, yAxisIndex: 2, type: 'line', data: windSpeeds.map((v, i) => [times[i], v]), itemStyle: { color: '#06b6d4' }, smooth: true, areaStyle: { opacity: 0.1 }, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(1) : val } },
      { 
        name: 'Wind Dir', 
        type: 'scatter', 
        xAxisIndex: 2, yAxisIndex: 2,
        tooltip: { show: false }, 
        symbol: 'path://M5,0 L10,20 L5,15 L0,20 Z', 
        symbolSize: [6, 16], 
        itemStyle: { color: colorTextPrimary },
        data: windSpeeds.map((speed, i) => {
          if (i % 3 !== 0) return null; 
          return {
            value: [times[i], speed, windDirs[i]], 
            symbolRotate: -windDirs[i] + 180
          };
        }).filter(Boolean)
      },
      { 
        name: 'Wind Dir', 
        type: 'line', 
        xAxisIndex: 2, yAxisIndex: 4, 
        data: windDirs.map((dir, i) => [times[i], dir]), 
        lineStyle: { opacity: 0 }, 
        itemStyle: { opacity: 0, color: colorTextPrimary }, 
        showSymbol: false, 
        tooltip: { valueFormatter: (val) => val != null ? `${val}° (${getCardinalDirection(val)})` : '-' } 
      },
      { name: 'Pressure', xAxisIndex: 2, yAxisIndex: 3, type: 'line', data: pressures.map((v, i) => [times[i], v]), itemStyle: { color: '#f59e0b' }, smooth: true, symbol: 'none', tooltip: { valueFormatter: (val) => val != null && !isNaN(val) ? Number(val).toFixed(1) : val } }
    ]
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
        <button className="btn-primary" onClick={onToggleSidebar} style={{background: colorButtonBg, color: colorTextPrimary, padding: '8px'}}>
          <Menu size={24} />
        </button>
        <div style={{display: 'flex', alignItems: 'baseline', gap: '12px', flex: 1}}>
          <h2 style={{textTransform: 'capitalize', margin: 0, fontSize: '1.5rem'}}>{location.name} Forecast</h2>
          <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
            {location.lat}, {location.lon} • {location.wfo} • Grid {location.x}, {location.y}
          </span>
        </div>
      </div>

      <div className="glass-panel chart-container" ref={containerRef} style={{ flex: 1, minHeight: '530px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '4px' }}>
          <ReactECharts 
            option={combinedOption} 
            style={{ height: '100%', width: '100%' }} 
            theme={isDark ? 'dark' : undefined} 
            opts={{ renderer: 'canvas' }} 
          />
        </div>
      </div>
    </div>
  );
}
