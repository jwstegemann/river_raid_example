import React from 'react';
import RiverRaidGame from './components/RiverRaidGame';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-neutral-900 flex flex-col items-center justify-center">
      <div className="scanlines"></div>
      <RiverRaidGame />
    </div>
  );
};

export default App;