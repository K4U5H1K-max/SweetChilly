import React from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconShieldOutline } from '../common/AppIcons';

function PortalCard({ title, description, role, signup = false }) {
  const loginHref = `/login?role=${role}`;

  return (
    <section className="rounded-2xl border border-[#D5E3F2] bg-white p-6 shadow-[0_12px_40px_rgba(15,30,60,0.08)] sm:p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF2FC] text-[#152A54]">
        <IconShieldOutline className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-extrabold tracking-tight text-[#0A1629]">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#556987]">{description}</p>
      <Link
        to={loginHref}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#152A54] px-5 py-3 font-semibold text-white transition hover:bg-[#0E1F3F]"
      >
        Sign in <IconArrowRight className="h-4 w-4" />
      </Link>
      {signup ? (
        <p className="mt-4 text-center text-sm text-[#556987]">
          New operator?{' '}
          <Link to="/register" className="font-bold text-[#1D4ED8] hover:underline">Create an account</Link>
        </p>
      ) : (
        <p className="mt-4 text-center text-xs text-[#71829B]">Administrator accounts are provisioned by the platform.</p>
      )}
    </section>
  );
}

export default function AccessPortalPage() {
  return (
    <main className="min-h-screen bg-[#F2F7FC] px-4 py-10 text-[#0F1E36] sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <Link to="/" className="mb-6 flex items-center gap-3 text-left">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A1629] text-sm font-bold text-white">NER</span>
            <span>
              <span className="block font-bold text-[#0A1629]">Project Brahmaputra</span>
              <span className="block text-xs text-[#556987]">Govt. of India · North Eastern Region</span>
            </span>
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1D4ED8]">Choose your portal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0A1629] sm:text-4xl">How will you access the platform?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#556987] sm:text-base">
            Select the account type that matches your role. You’ll continue to its sign-in page.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <PortalCard
            title="Administration & Operations"
            description="For administrators coordinating regional logistics, fleet activity, and emergency response."
            role="admin"
          />
          <PortalCard
            title="User & Fleet Operator"
            description="For registered operators managing their vehicles, deployments, and field updates."
            role="user"
            signup
          />
        </div>

        <p className="mt-8 text-center text-sm text-[#71829B]">
          Need to choose again? <Link to="/" className="font-semibold text-[#1D4ED8] hover:underline">Back to welcome</Link>
        </p>
      </div>
    </main>
  );
}
