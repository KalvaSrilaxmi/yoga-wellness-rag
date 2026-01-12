import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { askQuestion, sendFeedback } from './api';

function App() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    setFeedbackGiven(false);

    try {
      const data = await askQuestion(query);
      setResponse(data);
    } catch (error) {
      setResponse({
        answer: "Sorry, something went wrong. Please check your connection to the backend.",
        sources: [],
        isUnsafe: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (helpful) => {
    if (response?.logId && !feedbackGiven) {
      await sendFeedback(response.logId, helpful);
      setFeedbackGiven(true);
    }
  };

  return (
    <div className="glass-panel">
      <h1>ZenYoga AI</h1>

      <div className="search-container">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about yoga poses, benefits, or safety..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAsk();
            }
          }}
        />
        <button
          className="ask-btn icon-btn"
          onClick={handleAsk}
          disabled={loading || !query.trim()}
          aria-label="Send query"
        >
          {loading ? (
            <div className="spinner-small"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="send-icon">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>

      {
        loading && (
          <div className="loader">
            <div className="spinner"></div>
          </div>
        )
      }

      {
        response && (
          <div className="response-area">
            {response.isUnsafe && (
              <div className="safety-warning">
                <span className="safety-icon">⚠️</span>
                <div>
                  <strong>Safety First:</strong> This query touched on sensitive topics (e.g., pregnancy or medical conditions).
                  Please prioritize professional advice.
                </div>
              </div>
            )}

            <div className="answer-card">
              <div className="answer-text">
                <ReactMarkdown>{response.answer}</ReactMarkdown>
              </div>
            </div>

            {!response.isUnsafe && response.sources && response.sources.length > 0 && (
              <div className="sources-section">
                <div className="sources-title">Sources Used</div>
                {response.sources.map((src, idx) => (
                  <span key={idx} className="source-tag" title={src.title}>
                    {src.title}
                  </span>
                ))}
              </div>
            )}

            {response.logId && !response.isUnsafe && (
              <div className="feedback-area">
                <span>Was this helpful?</span>
                <button
                  className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackGiven}
                >
                  👍 Yes
                </button>
                <button
                  className={`feedback-btn ${feedbackGiven ? 'disabled' : ''}`}
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackGiven}
                >
                  👎 No
                </button>
                {feedbackGiven && <span>Thanks!</span>}
              </div>
            )}
          </div>
        )
      }
    </div >
  );
}

export default App;
