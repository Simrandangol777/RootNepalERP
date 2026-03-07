import Footer from "./Footer";
import PublicHeader from "./PublicHeader";

const PublicPageLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicHeader />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 border-b border-slate-200 pb-6">
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            <div className="space-y-8 text-sm leading-7 text-slate-700 sm:text-base">
              {children}
            </div>
          </div>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  );
};

export default PublicPageLayout;
