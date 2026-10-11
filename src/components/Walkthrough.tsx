import React from 'react';
import { Joyride, STATUS } from 'react-joyride';

interface WalkthroughProps {
  run: boolean;
  onFinish: () => void;
  isDark: boolean;
}

const steps = [
  {
    target: 'body',
    content: 'Welcome to the Knex Trading Terminal. The fastest institutional-grade binary & P2P trading platform. Let\'s begin your edge.',
    placement: 'center' as const,
    disableBeacon: true,
  },
  {
    target: '.tour-asset-selector',
    content: 'Select your core trading instrument here. We offer high-frequency synthetic indices and premium cryptocurrencies.',
    placement: 'bottom' as const,
  },
  {
    target: '.tour-chart',
    content: 'The primary terminal chart. Observe real-time spot price movements with zero latency.',
    placement: 'bottom' as const,
  },
  {
    target: '.tour-trade-controls',
    content: 'Execute with precision. Configure your contract duration, size, and definitive market direction.',
    placement: 'left' as const,
  },
  {
    target: '.tour-positions',
    content: 'Your live portfolio. Track active profit/loss in real time as your contracts run.',
    placement: 'right' as const,
  },
  {
    target: '.tour-account',
    content: 'Manage liquidity, transition between demo testing and live capital, and optimize settings here. Enter the Arena.',
    placement: 'bottom' as const,
  }
];

export default function Walkthrough({ run, onFinish, isDark }: WalkthroughProps) {
  const handleJoyrideCallback = React.useCallback((data: any) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status) || type === 'tour:end') {
      onFinish();
    }
  }, [onFinish]);

  const joyrideStyles = React.useMemo(() => ({
    tooltip: {
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      borderRadius: '12px',
      padding: '16px',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    buttonPrimary: {
      backgroundColor: '#10b981',
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: 700,
      borderRadius: '8px',
      padding: '6px 14px',
    },
    buttonBack: {
      marginRight: 8,
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '12px',
    },
    buttonSkip: {
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '12px',
    }
  }), [isDark]);

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      scrollToFirstStep={true}
      onEvent={handleJoyrideCallback}
      styles={joyrideStyles}
    />
  );
}
