import React, { useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

export default function WeatherChart({ title, option, groupName }) {
  const chartRef = useRef(null);

  useEffect(() => {
    // Register the chart to a group for synchronized tooltips
    if (chartRef.current && groupName) {
      echarts.connect(groupName);
      const echartInstance = chartRef.current.getEchartsInstance();
      echartInstance.group = groupName;
    }
  }, [groupName]);

  const baseOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: {
        color: '#f8fafc'
      }
    },
    grid: {
      left: '1%',
      right: '1%',
      bottom: '2%',
      top: 35,
      containLabel: true
    },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLabel: {
        color: '#94a3b8',
        formatter: (value) => {
          const date = new Date(value);
          return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:00`;
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      }
    },
    // We don't spread option here because it would shallow overwrite tooltip
  };

  const mergedOption = {
    ...baseOption,
    ...option,
    tooltip: {
      ...baseOption.tooltip,
      ...(option.tooltip || {})
    }
  };

  return (
    <div className="glass-panel chart-container">
      <ReactECharts
        ref={chartRef}
        option={mergedOption}
        style={{ height: '225px', width: '100%' }}
        theme="dark"
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
