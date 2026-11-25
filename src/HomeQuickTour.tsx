import { useEffect } from 'react';
import { CalendarDays, CheckCheck, Clock3, Inbox, LayoutGrid, Sparkles, X } from 'lucide-react';

const steps = [
  {
    icon: Sparkles,
    title: 'AI command center',
    text: 'Ask a question or give ORDER a command. Review suggested changes before saving.',
  },
  {
    icon: Inbox,
    title: 'Capture and Quick Add',
    text: 'Capture a thought for later, or use Quick Add to create a task, event, or goal.',
  },
  {
    icon: LayoutGrid,
    title: 'Make Home yours',
    text: 'Edit Home to add, remove, reorder, and configure widgets. Save or cancel your changes.',
  },
  {
    icon: CalendarDays,
    title: 'Calendars and Manage',
    text: 'Calendars has Day, Week, and Month views. Manage keeps Tasks, Events, Goals, and Projects together.',
  },
  {
    icon: Clock3,
    title: 'Time Clock',
    text: 'Clock in and out to track work. Your entries and summaries appear here and in relevant Home widgets.',
  },
];

export default function HomeQuickTour({ step, setStep, close }: {
  step: number;
  setStep: (step: number | null) => void;
  close: () => void;
}) {
  const current = steps[step];
  const Icon = current.icon;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.getElementById('home-tour-next')?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, close]);

  return <div className="backdrop home-tour-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <section className="sheet home-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="home-tour-title" aria-describedby="home-tour-description" tabIndex={-1}>
      <header className="sheet-head">
        <div>
          <small className="eyebrow">QUICK TOUR · STEP {step + 1} OF {steps.length}</small>
          <h2 id="home-tour-title"><Icon size={18}/>{current.title}</h2>
          <p id="home-tour-description">{current.text}</p>
        </div>
        <button className="icon" aria-label="Close tutorial" onClick={close}><X size={18}/></button>
      </header>
      <div className="home-tour-progress" aria-hidden="true"><i style={{ width: `${(step + 1) / steps.length * 100}%` }}/></div>
      <footer className="sheet-actions">
        <button type="button" className="quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        <button type="button" className="quiet" onClick={close}>Skip tour</button>
        <button id="home-tour-next" type="button" className="primary" onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)}>{step === steps.length - 1 ? 'Done' : 'Next'}</button>
      </footer>
    </section>
  </div>;
}
