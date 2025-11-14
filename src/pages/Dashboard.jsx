import './pageTheme.css';
import TopNavBar from "./TopNavBar.jsx";
const highlights = [
  { label: 'Encrypted Threads', value: '27', trend: '+6 today · 4 handoffs pending' },
  { label: 'Trusted Contacts', value: '31', trend: '5 mutual confirmations awaiting' },
  { label: 'Message Reliability', value: '99.8%', trend: 'Last 24h · 0 dropped packets' },
];

const activityFeed = [
  {
    id: 'a1',
    title: 'You approved Nova’s device add-on',
    detail: 'Shared session keys via MPC handshake · Berlin edge',
    time: '2m ago',
  },
  {
    id: 'a2',
    title: 'New secure chat spun up with Orion',
    detail: 'Channel anchored on Base · 0.0004 ETH gas reimbursed',
    time: '18m ago',
  },
  {
    id: 'a3',
    title: 'Wallet 0x44E...A932 delivered a file',
    detail: 'Encrypted bundle stored on Arweave · 48-hour retention',
    time: '1h ago',
  },
  {
    id: 'a4',
    title: 'Signal boost awarded to Lys',
    detail: 'Peer reputation increased to tier S after audit trail',
    time: '3h ago',
  },
];

const sessionMetrics = [
  {
    id: 'm1',
    value: '42',
    label: 'Active sessions',
    caption: 'Cross-device sync secured via SIWE',
    progress: 0.84,
  },
  {
    id: 'm2',
    value: '128kB',
    label: 'Average payload size',
    caption: 'Across bundled media messages',
    progress: 0.52,
  },
  {
    id: 'm3',
    value: '12',
    label: 'Key rotations',
    caption: 'Automated refresh in the past 7 days',
    progress: 0.6,
  },
  {
    id: 'm4',
    value: '18',
    label: 'Pending attestations',
    caption: 'Awaiting co-sign to unlock high-trust chat',
  },
];

const networkInsights = [
  {
    id: 'n1',
    metric: '194ms',
    title: 'Latency',
    description: 'Median end-to-end delivery across all relayers.',
  },
  {
    id: 'n2',
    metric: '71MB',
    title: 'Storage footprint',
    description: 'Decentralized storage used by pinned media.',
  },
  {
    id: 'n3',
    metric: '4.6k',
    title: 'Daily on-chain reads',
    description: 'Smart contract events consumed by your threads.',
  },
];

const networkHealth = [
  {
    id: 'h1',
    label: 'Delivery success',
    value: '99.87%',
    description: 'Successful relay attempts over 24 hours.',
    progress: 0.9987,
  },
  {
    id: 'h2',
    label: 'Regional coverage',
    value: '7 / 8',
    description: 'Active relay regions meeting latency targets.',
    progress: 0.875,
  },
  {
    id: 'h3',
    label: 'Spam mitigation',
    value: '96%',
    description: 'Requests blocked by shared allowlists.',
    progress: 0.96,
  },
];

function Dashboard() {
  return (
    <section className="page-section">
      <TopNavBar title="Dashboard"/>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>
          Track your secure conversations, delivery performance, and trust signals across the
          CryptoComm network. Data refreshes every 15 seconds as on-chain activity settles.
        </p>
      </header>

      <div className="content-grid">
        <div className="glass-card focus highlight-card">
          <div className="card-heading">
            <h2>Today&apos;s Highlights</h2>
            <span className="stat-chip">Live feed</span>
            <p>Key pulses from your encrypted social graph.</p>
          </div>
          <div className="highlight-grid">
            {highlights.map((item) => (
              <div key={item.label}>
                <h3>{item.value}</h3>
                <span>{item.label}</span>
                <small>{item.trend}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card secondary">
          <div className="card-heading">
            <h2>Session Overview</h2>
            <p>Operational metrics based on the past rolling hour.</p>
          </div>
          <div className="metric-grid">
            {sessionMetrics.map((metric) => (
              <div key={metric.id} className="metric-card">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <p className="list-subtitle">{metric.caption}</p>
                {typeof metric.progress === 'number' && (
                  <div className="progress-track" role="presentation">
                    <div
                      className="progress-fill"
                      style={{ transform: `scaleX(${metric.progress})` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card secondary activity-card">
          <div className="card-heading">
            <h2>Activity Feed</h2>
            <p>Latest encrypted interactions, approvals, and trust upgrades.</p>
          </div>
          <ul className="activity-list">
            {activityFeed.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span>{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card secondary insights-card">
          <div className="card-heading">
            <h2>Network Insights</h2>
          </div>
          <ul className="insight-list">
            {networkInsights.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.metric}</strong>
                  <span>{item.title}</span>
                </div>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card secondary">
          <div className="card-heading">
            <h2>Relay Health</h2>
            <p>Quality of service from the decentralized relay mesh.</p>
          </div>
          <div className="network-health">
            {networkHealth.map((item) => (
              <div key={item.id} className="network-stat">
                <div>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <p className="list-subtitle">{item.description}</p>
                </div>
                <div className="progress-track" role="presentation">
                  <div
                    className="progress-fill"
                    style={{ transform: `scaleX(${item.progress})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;

