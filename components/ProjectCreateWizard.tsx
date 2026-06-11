import React, { useState, useEffect, useRef } from 'react';

type StepData = {
  name?: string;
  description?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
};

const STORAGE_KEY = 'project:create:draft:v1';

export default function ProjectCreateWizard({ onComplete }: { onComplete?: (data: StepData) => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<StepData>({});
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (step === 1 && nameRef.current) {
      nameRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  function next() {
    if (step < 4) setStep((s) => s + 1);
    else handleFinish();
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleFinish() {
    localStorage.removeItem(STORAGE_KEY);
    if (onComplete) onComplete(data);
  }

  return (
    <form
      role="form"
      aria-label="Create project wizard"
      className="p-4 sm:p-6 bg-card rounded-[var(--card-radius)] shadow-sm max-w-2xl mx-auto"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Create project — step {step} of 4</h3>
      </div>

      {step === 1 && (
        <div>
          <label className="block text-sm mb-1">Project name</label>
          <input
            ref={nameRef}
            className="w-full p-3 rounded-[var(--input-radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={data.name ?? ''}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Enter project name"
            aria-label="Project name"
          />
          <label className="block text-sm mt-3 mb-1">Description</label>
          <textarea
            className="w-full p-3 rounded-[var(--input-radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={data.description ?? ''}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Short summary"
            aria-label="Project description"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="block text-sm mb-1">Customer</label>
          <input
            className="w-full p-3 rounded-[var(--input-radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={data.customerId ?? ''}
            onChange={(e) => setData({ ...data, customerId: e.target.value })}
            placeholder="Customer ID (optional)"
            aria-label="Customer id"
          />
        </div>
      )}

      {step === 3 && (
        <div>
          <label className="block text-sm mb-1">Start date</label>
          <input
            type="date"
            className="w-full p-2 rounded-[var(--input-radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={data.startDate ?? ''}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
            aria-label="Start date"
          />
          <label className="block text-sm mt-3 mb-1">End date</label>
          <input
            type="date"
            className="w-full p-2 rounded-[var(--input-radius)] border focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={data.endDate ?? ''}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
            aria-label="End date"
          />
        </div>
      )}

      {step === 4 && (
        <div>
          <h4 className="font-medium mb-2">Review</h4>
          <p className="text-sm">Name: {data.name}</p>
          <p className="text-sm">Customer: {data.customerId}</p>
          <p className="text-sm">Start: {data.startDate} — End: {data.endDate}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
        <button
          type="button"
          className="w-full sm:w-auto px-4 py-2 bg-muted rounded-[var(--btn-radius)] disabled:opacity-50"
          onClick={back}
          disabled={step === 1}
          aria-disabled={step === 1}
        >
          Back
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-[var(--btn-radius)]"
        >
          {step < 4 ? 'Next' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
