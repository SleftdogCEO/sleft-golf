export default function SupportPage() {
  return (
    <div style={{ background: '#0b0f0e', color: '#e4e8e7', minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Sleft Golf Support</h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Need help with Sleft Golf? We&apos;re here for you.</p>

        <div style={{ background: '#1a2722', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Contact Us</h2>
          <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
            For questions, feedback, or support requests, email us at:
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <a href="mailto:grant@sleftpayments.com" style={{ color: '#34d399' }}>grant@sleftpayments.com</a>
          </p>
        </div>

        <div style={{ background: '#1a2722', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>FAQ</h2>
          <div style={{ color: '#9ca3af', lineHeight: '1.8' }}>
            <p><strong style={{ color: '#e4e8e7' }}>How do I post a round?</strong><br />Tap &quot;I Played!&quot; on the Feed page, search for your course, enter your score, and post.</p>
            <p style={{ marginTop: '1rem' }}><strong style={{ color: '#e4e8e7' }}>How do I join a tee time?</strong><br />Go to The Board (Calendar tab), find an open tee time, and tap Join.</p>
            <p style={{ marginTop: '1rem' }}><strong style={{ color: '#e4e8e7' }}>How do I delete my account?</strong><br />Email grant@sleftpayments.com and we will delete your account and all associated data.</p>
          </div>
        </div>

        <div style={{ background: '#1a2722', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>Privacy Policy</h2>
          <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
            Read our full <a href="/privacy" style={{ color: '#34d399' }}>Privacy Policy</a> and <a href="/terms" style={{ color: '#34d399' }}>Terms of Service</a>.
          </p>
        </div>

        <p style={{ color: '#4a6259', fontSize: '0.875rem', marginTop: '2rem', textAlign: 'center' }}>
          &copy; 2026 Grant Denmark. All rights reserved.
        </p>
      </div>
    </div>
  )
}
