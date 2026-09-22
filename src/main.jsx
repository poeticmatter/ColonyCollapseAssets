import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ColonyCollapseBoardAssets from './ColonyCollapseBoardAssets.jsx'
import ColonyCollapseLiteAssets from './ColonyCollapseLiteAssets.jsx'

const RootApp = () => {
  const [variant, setVariant] = useState('board');

  return (
    <>
      <nav className="bg-slate-900 text-slate-300 p-2 flex gap-3 text-sm font-medium border-b border-slate-700 font-sans no-print sticky top-0 z-[100] items-center">
        <span className="text-white bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-1 rounded font-bold">
          🐝 Colony Collapse
        </span>
        <button
          onClick={() => setVariant('board')}
          className={`px-3 py-1 rounded transition-all font-black cursor-pointer ${
            variant === 'board' ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          Board
        </button>
        <button
          onClick={() => setVariant('lite')}
          className={`px-3 py-1 rounded transition-all font-black cursor-pointer ${
            variant === 'lite' ? 'bg-pink-600 text-white' : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          Lite
        </button>
      </nav>

      {variant === 'board' ? <ColonyCollapseBoardAssets /> : <ColonyCollapseLiteAssets />}
    </>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
