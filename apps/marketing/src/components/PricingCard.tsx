interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular: boolean;
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  popular,
}: PricingCardProps) {
  return (
    <div
      className={`relative p-8 rounded-2xl ${
        popular
          ? 'bg-stone-900 text-stone-50 border-2 border-amber-500'
          : 'bg-white text-stone-900 border border-stone-200'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 bg-amber-500 text-stone-900 text-sm font-medium rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-serif text-2xl font-medium mb-2">{name}</h3>
        <p className={`text-sm ${popular ? 'text-stone-400' : 'text-stone-500'}`}>{description}</p>
      </div>

      <div className="mb-8">
        <span className="text-5xl font-medium">{price}</span>
        <span className={`text-sm ${popular ? 'text-stone-400' : 'text-stone-500'}`}>
          {' '}
          / {period}
        </span>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                popular ? 'text-amber-400' : 'text-amber-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className={popular ? 'text-stone-300' : 'text-stone-600'}>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className={`block w-full py-3 px-6 text-center font-medium rounded-xl transition-all duration-300 ${
          popular
            ? 'bg-amber-500 text-stone-900 hover:bg-amber-400'
            : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
