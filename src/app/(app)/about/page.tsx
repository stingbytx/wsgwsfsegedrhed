export const metadata = {
  title: "About Us - UniPOS",
  description: "Learn about Universal POS, a browser-based Point of Sale system.",
};

export default function AboutPage() {
  return (
    <div className="space-y-8 p-8 max-w-6xl">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">About UniPOS</h1>
        <p className="text-lg text-slate-600">
          Universal POS is a modern, browser-based Point of Sale system designed for retailers, restaurants, pharmacies, and supermarkets.
        </p>
      </div>

      <div className="bg-slate-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Our Mission</h2>
        <p className="text-slate-700 leading-relaxed">
          We empower small and medium-sized businesses with affordable, easy-to-use POS technology that keeps data secure and accessible locally. UniPOS is built on trust, simplicity, and reliability.
        </p>
      </div>

      <div className="bg-slate-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Key Features</h2>
        <ul className="space-y-3 text-slate-700">
          <li className="flex items-start gap-3">
            <span className="text-[#0070E0] font-bold">✓</span>
            <span>Customer relationship management with credit tracking</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#0070E0] font-bold">✓</span>
            <span>Real-time inventory management</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#0070E0] font-bold">✓</span>
            <span>Comprehensive sales reports and analytics</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#0070E0] font-bold">✓</span>
            <span>Local data storage with no cloud dependency</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-[#0070E0] font-bold">✓</span>
            <span>Receipt printing and backup/restore functionality</span>
          </li>
        </ul>
      </div>

      <div className="bg-slate-50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Why Choose UniPOS?</h2>
        <p className="text-slate-700 leading-relaxed mb-4">
          UniPOS is a subsidiary of DotcomOne, combining enterprise reliability with small business affordability. All your business data is stored securely in your browser - no cloud dependency, no monthly server fees.
        </p>
        <p className="text-slate-700 leading-relaxed">
          We believe every business deserves access to professional POS technology. That&apos;s why UniPOS is designed to be intuitive, powerful, and completely yours.
        </p>
      </div>
    </div>
  );
}
