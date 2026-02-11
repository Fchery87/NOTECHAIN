import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

export const metadata = {
  title: 'FAQ - NoteChain',
  description: 'Frequently asked questions about NoteChain, encryption, and our privacy practices.',
};

const faqs = [
  {
    question: 'How does NoteChain encrypt my notes?',
    answer:
      'NoteChain uses AES-256-GCM encryption, the same standard used by banks and governments. Your notes are encrypted on your device before they ever leave, and only you hold the decryption keys. We use zero-knowledge architecture, meaning we cannot access your notes even if we wanted to.',
  },
  {
    question: 'Can I access my notes offline?',
    answer:
      'Yes! NoteChain works offline and syncs automatically when you reconnect. All your notes are stored locally in an encrypted database on your device, so you always have access to them.',
  },
  {
    question: 'What happens if I lose my encryption key?',
    answer:
      'Because we use zero-knowledge encryption, we cannot recover your encryption keys. We strongly recommend storing your recovery key in a secure password manager or physical safe when you create your account.',
  },
  {
    question: 'How does the AI assistant work with encryption?',
    answer:
      'Our AI assistant operates on-device whenever possible. For cloud-based AI features, data is decrypted temporarily in a secure enclave, processed, and immediately discarded. Your original encrypted notes are never exposed.',
  },
  {
    question: 'Is my data backed up?',
    answer:
      'Yes, encrypted backups are automatically created and synced across your devices. We maintain encrypted backups on our servers, but remember—only you can decrypt them.',
  },
  {
    question: 'Can I export my notes?',
    answer:
      'Absolutely. You can export your notes in multiple formats including Markdown, PDF, and plain text. Exports are decrypted using your keys before downloading.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'NoteChain currently works on all modern web browsers. Native apps for iOS and Android are in development and will be available soon.',
  },
  {
    question: 'How much does NoteChain cost?',
    answer:
      'NoteChain is free for personal use with generous limits. Pro plans start at $8/month and include advanced AI features, priority sync, and more storage. See our pricing page for details.',
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <Navigation />

      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-amber-600 font-medium text-sm uppercase tracking-wider">FAQ</span>
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-stone-900 mt-4 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-stone-600">Everything you need to know about NoteChain</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100"
              >
                <h3 className="font-serif text-xl font-medium text-stone-900 mb-4">
                  {faq.question}
                </h3>
                <p className="text-stone-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center p-8 bg-stone-900 rounded-2xl text-stone-50">
            <h3 className="font-serif text-2xl font-medium mb-4">Still have questions?</h3>
            <p className="text-stone-300 mb-6">
              Can&apos;t find the answer you&apos;re looking for? Reach out to our team.
            </p>
            <a
              href="mailto:support@notechain.app"
              className="inline-block px-6 py-3 bg-amber-500 text-stone-900 font-medium rounded-xl hover:bg-amber-400 transition-all duration-300"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
