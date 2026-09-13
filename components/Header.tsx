import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="shrink-0 py-3 text-center space-y-1">
      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-700 drop-shadow-sm">
        Lyrical <span className="text-indigo-500">Matrix</span>
      </h1>
      <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto font-medium">
        Uncover the repetition patterns and structures hidden within your favorite songs.
      </p>
    </header>
  );
};

export default Header;