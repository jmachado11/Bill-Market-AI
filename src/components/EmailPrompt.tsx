import { useState } from 'react';

interface EmailPromptProps {
  onSubmit: (email: string) => void;
}

export const EmailPrompt = ({ onSubmit }: EmailPromptProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError('Please enter a valid email.');
      return;
    }

    localStorage.setItem('user_email', email);
    onSubmit(email);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Enter Your Email</h2>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2 border rounded-md mb-2 dark:bg-zinc-800"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={handleSubmit}
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
