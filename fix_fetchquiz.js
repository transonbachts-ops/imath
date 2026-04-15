const fs = require('fs');
const file = 'src/app/course/[id]/quiz/[activityId]/page.js';
let content = fs.readFileSync(file, 'utf8');

// Find and replace the fetchQuiz function
const oldStart = '  const fetchQuiz = async () => {';
const oldEnd = '  setLoading(false);\n  };';

const startIdx = content.indexOf(oldStart);
// Find the setLoading(false) that belongs to fetchQuiz
const endIdx = content.indexOf('  setLoading(false);\r\n  };');
const endIdx2 = content.indexOf('  setLoading(false);\n  };');
const actualEnd = endIdx !== -1 ? endIdx : endIdx2;

if (startIdx === -1 || actualEnd === -1) {
  console.log('Could not find fetchQuiz markers');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx, 'endIdx2:', endIdx2);
  process.exit(1);
}

const endLength = content.includes('\r\n') ? '  setLoading(false);\r\n  };'.length : '  setLoading(false);\n  };'.length;
const before = content.substring(0, startIdx);
const after = content.substring(actualEnd + endLength);

const newFunc = `  const fetchQuiz = async () => {
    try {
      let role = 'student';
      try {
        const resMe = await fetch('/api/me');
        if (resMe.ok) {
          const me = await resMe.json();
          role = me.role;
          setUserRole(role);
        }
      } catch(e) { /* /api/me fail - use default student role */ }

      const res = await fetch(\`/api/quizzes/\${activityId}\`);
      if (res.ok) {
        const data = await res.json();
        const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit';
        if (!isEditMode) data.canEdit = false;

        if (data.quiz) {
          setQuizData(data);
          setBuilderTime(data.quiz.time_limit);
          setBuilderPassScore(data.quiz.pass_score || 0);
          const qs = (data.questions || []).map(q => {
            let opts = { A: '', B: '', C: '', D: '' };
            try { opts = JSON.parse(q.options_json); } catch(e) {}
            return { ...q, options: typeof q.options === 'object' ? q.options : opts };
          });
          setBuilderQuestions(qs);
          if (data.myResult && !submitResult) {
            setSubmitResult(data.myResult);
          }
        } else {
          setQuizData({ questions: [], canEdit: data.canEdit });
        }
      }
    } catch(e) {
      console.warn('fetchQuiz error (page navigating away):', e.message);
    } finally {
      setLoading(false);
    }
  };`;

const result = before + newFunc + after;
fs.writeFileSync(file, result, 'utf8');
console.log('Done! fetchQuiz is now fully wrapped in try/catch.');
