import { useState, type ReactElement } from 'react';
import { DemoShell } from './DemoShell';
import { DemoTour } from './DemoTour';
import type { DemoSectionId } from './demo-data';
import './demo.css';

export const DemoAppPage = (): ReactElement => {
  const [activeSection, setActiveSection] = useState<DemoSectionId>('dashboard');

  return (
    <div className="demo-page">
      <DemoShell activeSection={activeSection} onSectionChange={setActiveSection} />
      <DemoTour activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  );
};
