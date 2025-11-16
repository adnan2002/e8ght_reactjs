import { Link } from "react-router-dom";
import withCustomerAuth from "../../hoc/withCustomerAuth.jsx";

export const CustomerDashboard = () => (
  <section className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white py-12">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 p-8 shadow-2xl shadow-indigo-500/30 sm:p-10">
        <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
              Customer dashboard
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Welcome back</h1>
            <p className="max-w-xl text-base text-white/80 sm:text-lg">
              Manage your bookings, addresses, and discover new professionals ready to help you bring your next idea
              to life.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 p-6 text-sm text-white/90 shadow-lg shadow-black/10 backdrop-blur">
            <p className="font-semibold uppercase tracking-[0.14em]">Quick snapshot</p>
            <p className="mt-2 text-lg font-medium">Stay organised and connect with talent in minutes.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="group flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-indigo-200/60">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-xl text-indigo-600">
              🔍
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Discover freelancers</h2>
              <p className="text-sm text-slate-600">
                Browse public freelancer profiles, review services, and find someone who matches your goals.
              </p>
            </div>
          </div>
          <Link
            to="/freelancers"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            Explore freelancers
            <span aria-hidden="true">→</span>
          </Link>
        </article>

        <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-600">
              📍
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Manage your addresses</h2>
              <p className="text-sm text-slate-600">
                Keep delivery and service locations up-to-date to streamline your booking experience.
              </p>
            </div>
          </div>
          <Link
            to="/addresses"
            className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-600 bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
          >
            Review addresses
            <span aria-hidden="true">→</span>
          </Link>
        </article>
      </div>
    </div>
  </section>
);

const CustomerDashboardWithAuth = withCustomerAuth(CustomerDashboard);

CustomerDashboardWithAuth.displayName = "CustomerDashboardWithAuth";

export default CustomerDashboardWithAuth;

