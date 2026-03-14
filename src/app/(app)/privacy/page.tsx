export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
      <p className="text-gray-400 text-sm mb-8">Last updated: March 14, 2026</p>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
          <p>When you use Sleft Golf, we collect the following information:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Account information:</strong> Email address, name, and password when you create an account</li>
            <li><strong className="text-gray-300">Profile information:</strong> Username, bio, handicap, home course, location, occupation, company, LinkedIn URL, and avatar photo that you choose to provide</li>
            <li><strong className="text-gray-300">Content you create:</strong> Posts, comments, reviews, tee time listings, round data, and messages</li>
            <li><strong className="text-gray-300">Usage data:</strong> How you interact with the app, including pages visited and features used</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>To provide and maintain the Sleft Golf service</li>
            <li>To display your profile and content to other users</li>
            <li>To facilitate tee time scheduling and social features</li>
            <li>To send you notifications about activity relevant to you (tee time reminders, comments on your posts)</li>
            <li>To improve and develop new features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing</h2>
          <p>We do not sell your personal information. Your information may be shared in the following ways:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li><strong className="text-gray-300">With other users:</strong> Your profile, posts, reviews, and tee time activity are visible to other Sleft Golf users</li>
            <li><strong className="text-gray-300">Service providers:</strong> We use Supabase for authentication and data storage, and Vercel for hosting</li>
            <li><strong className="text-gray-300">Legal requirements:</strong> We may disclose information if required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage & Security</h2>
          <p>Your data is stored securely using Supabase (PostgreSQL with Row Level Security). We use industry-standard security measures including encrypted connections (HTTPS/TLS), secure authentication tokens, and access controls to protect your information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Access your personal data through your profile page</li>
            <li>Update or correct your information at any time</li>
            <li>Delete your account and associated data by contacting us</li>
            <li>Request a copy of your data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Children&apos;s Privacy</h2>
          <p>Sleft Golf is not intended for children under 13. We do not knowingly collect information from children under 13. If you believe a child has provided us with personal information, please contact us.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
          <p>If you have questions about this privacy policy or your data, contact us at:</p>
          <p className="mt-2 text-emerald-400">grant@sleftpayments.com</p>
        </section>
      </div>
    </div>
  )
}
