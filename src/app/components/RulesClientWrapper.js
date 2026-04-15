'use client';
import { useState } from 'react';
import RulesModal from './RulesModal';

export default function RulesClientWrapper({ courseId, rules, alreadyAccepted }) {
  const [accepted, setAccepted] = useState(alreadyAccepted);

  if (accepted || !rules) return null;

  return (
    <RulesModal 
      courseId={courseId} 
      rules={rules} 
      onAccept={() => setAccepted(true)} 
    />
  );
}
