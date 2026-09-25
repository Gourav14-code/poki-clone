import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AuthLab from './pages/AuthLab';
import FormLab from './pages/FormLab';
import DynamicLab from './pages/DynamicLab';
import DialogLab from './pages/DialogLab';
import InteractionLab from './pages/InteractionLab';
import TableLab from './pages/TableLab';
import StoreLab from './pages/StoreLab';
import ShadowLab from './pages/ShadowLab';
import ApiLab from './pages/ApiLab';
import MarioGame from './pages/MarioGame';
import ElephantRunner from './pages/ElephantRunner';
import WebGame from './pages/WebGame';
import CyberCursor from './components/CyberCursor';

export default function App() {
  return (
    <BrowserRouter>
      <CyberCursor />
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
        <Navbar />

        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthLab />} />
            <Route path="/forms" element={<FormLab />} />
            <Route path="/dynamic" element={<DynamicLab />} />
            <Route path="/dialogs" element={<DialogLab />} />
            <Route path="/interactions" element={<InteractionLab />} />
            <Route path="/tables" element={<TableLab />} />
            <Route path="/store" element={<StoreLab />} />
            <Route path="/shadow" element={<ShadowLab />} />
            <Route path="/api-tester" element={<ApiLab />} />
            <Route path="/play" element={<MarioGame />} />
            <Route path="/play/elephant" element={<Navigate to="/play?game=elephant" replace />} />
            <Route path="/mario" element={<MarioGame />} />
            <Route path="/game" element={<MarioGame />} />
            <Route path="/elephant" element={<ElephantRunner />} />
            <Route path="/runner" element={<ElephantRunner />} />
            <Route path="/webgame" element={<WebGame />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-robot text-cyan-400 text-sm"></i>
              <span className="font-semibold text-slate-300">AutoTest Playground AI Hub</span>
              <span>— Built for QA Automation Developers</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-slate-400">
              <Link to="/play" className="text-yellow-400 font-bold hover:text-yellow-300 transition flex items-center gap-1">
                <i className="fa-solid fa-gamepad"></i> Play Now
              </Link>
              <Link to="/forms" className="hover:text-cyan-400 transition">Forms</Link>
              <Link to="/dynamic" className="hover:text-cyan-400 transition">Dynamic Waits</Link>
              <Link to="/tables" className="hover:text-cyan-400 transition">Tables (CRUD)</Link>
              <Link to="/store" className="hover:text-cyan-400 transition">E-Commerce</Link>
              <Link to="/api-tester" className="hover:text-cyan-400 transition">REST APIs</Link>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
