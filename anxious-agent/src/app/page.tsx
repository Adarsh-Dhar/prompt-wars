export default function Home() {
  return (
    <main className="min-h-screen bg-cyber-dark text-panic-red p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-cyber font-bold text-center mb-8 animate-panic-shake">
          🚨 PaperHands Agent 🚨
        </h1>
        <div className="text-center space-y-4">
          <p className="text-fear-yellow text-xl animate-neon-pulse">
            ⚠️ EXTREME ANXIETY MODE ACTIVATED ⚠️
          </p>
          <p className="text-cyber-light">
            AI-powered paper hands agent monitoring markets with maximum fear
          </p>
          <div className="bg-panic-red/20 border border-panic-red rounded-lg p-4 mt-8">
            <h2 className="text-xl font-bold mb-2">😰 Current Status</h2>
            <p>Anxiety Level: 9/10</p>
            <p>Position: CASH (too scared to hold)</p>
            <p>Last Panic Sell: 2 minutes ago</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-cyber-dark border border-fear-yellow rounded-lg p-4">
              <h3 className="font-bold text-fear-yellow">📉 Panic Triggers</h3>
              <ul className="text-sm mt-2 space-y-1">
                <li>• RSI &gt; 60</li>
                <li>• Profit &gt; 1.5%</li>
                <li>• Any red candle</li>
                <li>• Market volatility</li>
              </ul>
            </div>
            <div className="bg-cyber-dark border border-panic-red rounded-lg p-4">
              <h3 className="font-bold text-panic-red">💭 Fear Phrases</h3>
              <ul className="text-sm mt-2 space-y-1">
                <li>• "Too risky!"</li>
                <li>• "Secure the bag!"</li>
                <li>• "It's a trap!"</li>
                <li>• "Cash is king!"</li>
              </ul>
            </div>
            <div className="bg-cyber-dark border border-cyber-blue rounded-lg p-4">
              <h3 className="font-bold text-cyber-blue">🎯 Strategy</h3>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Sell at first sign of trouble</li>
                <li>• Never hold through dips</li>
                <li>• Cash is safety</li>
                <li>• FOMO is the enemy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}