import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-8 text-center space-y-4">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-700 drop-shadow-sm">
        Lyrical <span className="text-indigo-500">Matrix</span>
      </h1>
      <p className="text-slate-500 max-w-lg mx-auto font-medium">
        Uncover the repetition patterns and structures hidden within your favorite songs.
      </p>
    </header>
  );
};

export default Header;