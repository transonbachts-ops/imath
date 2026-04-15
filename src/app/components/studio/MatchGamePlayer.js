'use client';
import { useState, useEffect } from 'react';

export default function MatchGamePlayer({ config, onComplete }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (config && config.pairs) {
      const items = [];
      config.pairs.forEach((p, i) => {
        items.push({ id: `p-${i}-q`, content: p.question, type: 'q', pairId: i });
        items.push({ id: `p-${i}-a`, content: p.answer, type: 'a', pairId: i });
      });
      // Shuffle
      setCards(items.sort(() => Math.random() - 0.5));
    }
  }, [config]);

  const handleCardClick = (card) => {
    if (flipped.length === 2 || matched.includes(card.id) || flipped.includes(card.id)) return;

    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const card1 = cards.find(c => c.id === newFlipped[0]);
      const card2 = cards.find(c => c.id === newFlipped[1]);

      if (card1.pairId === card2.pairId && card1.type !== card2.type) {
        setMatched(m => [...m, card1.id, card2.id]);
        setFlipped([]);
        if (matched.length + 2 === cards.length) {
          setWon(true);
          if (onComplete) onComplete(moves + 1);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
         <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>SỐ LƯỢT LẬT: {moves}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
        {cards.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);

          return (
            <div 
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                height: '140px',
                perspective: '1000px',
                cursor: matched.includes(card.id) ? 'default' : 'pointer'
              }}
            >
              <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transition: 'transform 0.6s',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none'
              }}>
                {/* Back of card */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: '#3b82f6', borderRadius: '12px', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', color: '#fff', fontSize: '30px', fontWeight: 'bold',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  ?
                </div>
                {/* Front of card */}
                <div style={{
                  position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
                  background: isMatched ? '#ecfdf5' : '#fff', 
                  color: isMatched ? '#059669' : '#1e293b',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '14px', textAlign: 'center', padding: '15px', fontWeight: 'bold',
                  transform: 'rotateY(180deg)', border: isMatched ? '2px solid #10b981' : '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  {card.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {won && (
        <div style={{
          marginTop: '40px', textAlign: 'center', padding: '30px', background: '#f0fdf4', 
          borderRadius: '16px', border: '1px solid #10b981'
        }}>
          <h2 style={{ color: '#10b981', marginBottom: '10px' }}>Chúc mừng! 🎉</h2>
          <p style={{ color: '#047857' }}>Bạn đã hoàn thành trò chơi trong {moves} lượt lật.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '20px', padding: '10px 25px', background: '#10b981', color: '#fff', 
              border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' 
            }}
          >
            Chơi lại
          </button>
        </div>
      )}
    </div>
  );
}
