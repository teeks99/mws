import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialize from localStorage or fallback to defaults
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('unitSystem') || 'us');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('sortOrder') || 'az');
  const [manualOrder, setManualOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('manualOrder')) || []; }
    catch { return []; }
  });

  // Persist settings whenever they change
  useEffect(() => {
    localStorage.setItem('unitSystem', unitSystem);
  }, [unitSystem]);

  useEffect(() => {
    localStorage.setItem('sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('manualOrder', JSON.stringify(manualOrder));
  }, [manualOrder]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // Derive sorted locations based on user preference
  const sortedLocations = [...locations].sort((a, b) => {
    if (sortOrder === 'az') return a.name.localeCompare(b.name);
    if (sortOrder === 'za') return b.name.localeCompare(a.name);
    if (sortOrder === 'manual') {
      const idxA = manualOrder.indexOf(a.name);
      const idxB = manualOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return 0;
  });

  const handleReorder = (draggedName, targetName) => {
    const currentOrder = sortedLocations.map(loc => loc.name);
    const dragIdx = currentOrder.indexOf(draggedName);
    const targetIdx = currentOrder.indexOf(targetName);
    if (dragIdx === -1 || targetIdx === -1) return;
    
    currentOrder.splice(dragIdx, 1);
    currentOrder.splice(targetIdx, 0, draggedName);
    setManualOrder(currentOrder);
    setSortOrder('manual');
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations/');
      const data = await res.json();
      setLocations(data);
      
      const pathName = decodeURIComponent(window.location.pathname.substring(1)).toLowerCase();
      const match = pathName ? data.find(loc => loc.name.toLowerCase() === pathName) : null;
      
      if (match) {
        setActiveLocation(match);
      } else if (data.length > 0 && !activeLocation) {
        setActiveLocation(data[0]);
        window.history.replaceState(null, '', `/${encodeURIComponent(data[0].name.toLowerCase())}`);
      }
    } catch (err) {
      console.error("Failed to fetch locations", err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const pathName = decodeURIComponent(window.location.pathname.substring(1)).toLowerCase();
      if (pathName && locations.length > 0) {
        const match = locations.find(loc => loc.name.toLowerCase() === pathName);
        if (match) setActiveLocation(match);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [locations]);

  const handleAddLocation = async (loc) => {
    try {
      const res = await fetch('/api/locations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(loc)
      });
      if (res.ok) {
        await fetchLocations();
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to add location");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  const handleDeleteLocation = async (name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/locations/${name}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey
        }
      });
      if (res.ok) {
        if (activeLocation?.name === name) {
          setActiveLocation(null);
          window.history.pushState(null, '', '/');
        }
        await fetchLocations();
      } else {
        const error = await res.json();
        alert(error.detail || "Failed to delete location");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  return (
    <div className="app-container">
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      <Sidebar 
        locations={sortedLocations}
        activeLocation={activeLocation}
        onSelectLocation={(loc) => {
          setActiveLocation(loc);
          window.history.pushState(null, '', `/${encodeURIComponent(loc.name.toLowerCase())}`);
          setIsSidebarOpen(false); // Close on selection
        }}
        onAddLocation={handleAddLocation}
        onDeleteLocation={handleDeleteLocation}
        apiKey={apiKey}
        setApiKey={setApiKey}
        isOpen={isSidebarOpen}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        theme={theme}
        setTheme={setTheme}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onReorder={handleReorder}
      />
      <Dashboard 
        location={activeLocation} 
        onToggleSidebar={() => setIsSidebarOpen(true)}
        unitSystem={unitSystem}
        theme={theme}
      />
    </div>
  );
}

export default App;
