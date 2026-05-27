import type { ReactElement } from 'react';
import { DemoShell } from './DemoShell';
import { DemoTour } from './DemoTour';
import './demo.css';

export const DemoAppPage = (): ReactElement => {
  return (
    <div className="demo-page">
      <DemoShell />
      <DemoTour />
    </div>
  );
};
